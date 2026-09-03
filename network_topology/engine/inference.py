"""Multi-Source Network Topology Inference Engine.

Fuses LLDP, CDP, MAC tables (FDB), ARP, and OUI databases using probabilistic
scoring and rule-based heuristics to infer full L2/L3 topology and device roles.
"""
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict
from ..models.schema import (
    Device, Interface, Neighbor, MacEntry, ArpEntry, StpInfo, Link, TopologyData
)
from ..engine.normalize import clean_device_id, normalize_interface, normalize_mac
from ..engine.oui import lookup_vendor, infer_device_info_from_oui


class TopologyInferenceEngine:
    """Infers network devices, links, roles, and confidence scores from multi-source data."""

    def __init__(self, mac_trunk_threshold: int = 4):
        self.mac_trunk_threshold = mac_trunk_threshold

    def infer_topology(
        self,
        neighbors: List[Neighbor],
        mac_entries: List[MacEntry],
        arp_entries: List[ArpEntry] = None,
        stp_info: List[StpInfo] = None,
        known_devices: List[Device] = None
    ) -> TopologyData:
        """Execute full multi-source topology inference workflow."""
        arp_entries = arp_entries or []
        stp_info = stp_info or []
        known_devices = known_devices or []

        # 1. Device Registry (id -> Device)
        devices_dict: Dict[str, Device] = {}
        for kd in known_devices:
            devices_dict[kd.id] = kd

        # 2. Build MAC to ARP mapping (mac -> ip)
        mac_to_ip: Dict[str, str] = {}
        for arp in arp_entries:
            if arp.mac and arp.ip:
                mac_to_ip[arp.mac] = arp.ip

        # 3. Process LLDP/CDP Neighbors (Rule 1 & Rule 2)
        # We index neighbors to detect bidirectional vs unidirectional links
        candidate_links: Dict[Tuple[str, str], Dict[str, Any]] = {}

        for n in neighbors:
            src = clean_device_id(n.local_device)
            dst = clean_device_id(n.remote_device)
            src_p = normalize_interface(n.local_port)
            dst_p = normalize_interface(n.remote_port)

            if not src or not dst or src == dst:
                continue

            # Ensure both devices exist in registry
            if src not in devices_dict:
                devices_dict[src] = Device(
                    id=src,
                    hostname=n.local_device,
                    device_type="switch"
                )
            if dst not in devices_dict:
                devices_dict[dst] = Device(
                    id=dst,
                    hostname=n.remote_device,
                    mgmt_ip=n.remote_ip,
                    model=n.remote_platform,
                    device_type=self._infer_type_from_platform_or_name(n.remote_device, n.remote_platform)
                )
            elif n.remote_ip and not devices_dict[dst].mgmt_ip:
                devices_dict[dst].mgmt_ip = n.remote_ip

            # Normalized pair key for undirected graph matching
            pair_key = tuple(sorted([src, dst]))
            link_key = (f"{src}:{src_p}", f"{dst}:{dst_p}")

            if link_key not in candidate_links:
                candidate_links[link_key] = {
                    "src": src,
                    "src_port": src_p,
                    "dst": dst,
                    "dst_port": dst_p,
                    "sources": [n.protocol.lower()],
                    "confidence_factors": [0.8],  # Start with unidirectional 80%
                    "status": "inferred",
                    "link_type": "physical"
                }
            else:
                candidate_links[link_key]["sources"].append(n.protocol.lower())

        # Check for reverse neighbor matches (Bidirectional verification -> 100%)
        processed_pairs = set()
        for link_key, link_data in list(candidate_links.items()):
            rev_key = (link_key[1], link_key[0])
            if rev_key in candidate_links and link_key not in processed_pairs:
                # Bidirectional confirmed!
                link_data["confidence_factors"].append(1.0)
                link_data["sources"].append("bidirectional_lldp")
                link_data["status"] = "confirmed"
                # Remove reverse to prevent duplicate edges
                processed_pairs.add(rev_key)
                del candidate_links[rev_key]

        # 4. Process MAC Table entries (Rule 3, Rule 4, Rule 5)
        # Group MAC entries by (device, port)
        dev_port_macs: Dict[Tuple[str, str], List[MacEntry]] = defaultdict(list)
        for m in mac_entries:
            dev_id = clean_device_id(m.device)
            p = normalize_interface(m.port)
            dev_port_macs[(dev_id, p)].append(m)

        # Build Base MAC index if known
        base_mac_to_device: Dict[str, str] = {}
        for d in devices_dict.values():
            if d.base_mac:
                base_mac_to_device[normalize_mac(d.base_mac)] = d.id

        # Analyze port MAC counts
        # If a port has > threshold MACs, it is likely an Uplink/Trunk to another switch
        for (dev_id, port_name), macs in dev_port_macs.items():
            mac_count = len(macs)

            # Rule 3: Check if any MAC belongs to a known switch's base MAC
            for m in macs:
                if m.mac in base_mac_to_device:
                    target_dev = base_mac_to_device[m.mac]
                    if target_dev != dev_id:
                        # Corroborate existing link or create new base-MAC link
                        found_link = False
                        for link in candidate_links.values():
                            if (link["src"] == dev_id and link["dst"] == target_dev and link["src_port"] == port_name) or \
                               (link["dst"] == dev_id and link["src"] == target_dev and link["dst_port"] == port_name):
                                link["sources"].append("base_mac_match")
                                link["confidence_factors"].append(0.7)
                                found_link = True
                                break
                        if not found_link:
                            c_key = (f"{dev_id}:{port_name}", f"{target_dev}:unknown")
                            candidate_links[c_key] = {
                                "src": dev_id,
                                "src_port": port_name,
                                "dst": target_dev,
                                "dst_port": "uplink",
                                "sources": ["base_mac_match"],
                                "confidence_factors": [0.7],
                                "status": "inferred",
                                "link_type": "trunk"
                            }

            # Rule 5: If port has exactly 1 MAC, and no switch neighbor exists on this port, infer Endpoint!
            is_port_linked_to_switch = any(
                (l["src"] == dev_id and l["src_port"] == port_name) or
                (l["dst"] == dev_id and l["dst_port"] == port_name)
                for l in candidate_links.values()
            )

            if mac_count == 1 and not is_port_linked_to_switch:
                single_mac = macs[0].mac
                vendor, dev_type = infer_device_info_from_oui(single_mac)
                ep_ip = mac_to_ip.get(single_mac)
                ep_id = f"ep-{clean_device_id(vendor)}-{single_mac.replace(':', '')[-6:]}"
                
                label_parts = [vendor]
                if ep_ip:
                    label_parts.append(ep_ip)
                else:
                    label_parts.append(single_mac[-8:])

                devices_dict[ep_id] = Device(
                    id=ep_id,
                    hostname=f"{vendor}-Host ({single_mac[-8:]})",
                    mgmt_ip=ep_ip,
                    base_mac=single_mac,
                    vendor=vendor,
                    device_type=dev_type,
                    role="Endpoint",
                    tier=5
                )

                c_key = (f"{dev_id}:{port_name}", f"{ep_id}:nic")
                candidate_links[c_key] = {
                    "src": dev_id,
                    "src_port": port_name,
                    "dst": ep_id,
                    "dst_port": "eth0",
                    "sources": ["mac_table_single_host", "oui_lookup"],
                    "confidence_factors": [0.45],
                    "status": "inferred",
                    "link_type": "access",
                    "vlans": str(macs[0].vlan) if macs[0].vlan else None
                }

        # 5. Compile Final Links and Fuse Confidence Scores
        final_links: List[Link] = []
        for l_data in candidate_links.values():
            # Probabilistic fusion: C = 1 - ∏(1 - c_i)
            c_factors = l_data["confidence_factors"]
            if 1.0 in c_factors:
                fused_confidence = 1.0
            else:
                prob_miss = 1.0
                for c in c_factors:
                    prob_miss *= (1.0 - c)
                fused_confidence = round(1.0 - prob_miss, 2)

            status = "confirmed" if fused_confidence >= 0.80 else ("inferred" if fused_confidence >= 0.40 else "conflict")

            final_links.append(Link(
                src=l_data["src"],
                src_port=l_data["src_port"],
                dst=l_data["dst"],
                dst_port=l_data["dst_port"],
                confidence=fused_confidence,
                sources=list(set(l_data["sources"])),
                status=status,
                link_type=l_data["link_type"],
                vlans=l_data.get("vlans")
            ))

        # 6. Device Role & Tier Inference
        self._infer_device_roles_and_tiers(devices_dict, final_links, dev_port_macs)

        # 7. Interfaces extraction
        interfaces_dict: Dict[Tuple[str, str], Interface] = {}
        for l in final_links:
            interfaces_dict[(l.src, l.src_port)] = Interface(
                device=l.src,
                name=l.src_port,
                status="up",
                mode="trunk" if l.link_type == "trunk" else "access",
                allowed_vlans=l.vlans
            )
            interfaces_dict[(l.dst, l.dst_port)] = Interface(
                device=l.dst,
                name=l.dst_port,
                status="up",
                mode="trunk" if l.link_type == "trunk" else "access",
                allowed_vlans=l.vlans
            )

        return TopologyData(
            devices=list(devices_dict.values()),
            interfaces=list(interfaces_dict.values()),
            links=final_links,
            mac_entries=mac_entries,
            arp_entries=arp_entries,
            stp_info=stp_info,
            metadata={
                "inferred_nodes_count": len(devices_dict),
                "inferred_links_count": len(final_links),
                "mac_count": len(mac_entries),
            }
        )

    def _infer_type_from_platform_or_name(self, name: str, platform: Optional[str]) -> str:
        """Deduce device type from hostname and platform strings."""
        s = f"{name} {platform or ''}".lower()
        if any(k in s for k in ("firewall", "fw-", "-fw", "fortigate", "paloalto", "asa", "srx")):
            return "firewall"
        elif any(k in s for k in ("core", "nexus", "c9500", "c9600", "ex4600", "qfx")):
            return "core-switch"
        elif any(k in s for k in ("storage", "san", "nas", "synology", "qnap", "netapp")):
            return "storage"
        elif any(k in s for k in ("server", "srv", "esxi", "vmware", "proxmox")):
            return "server"
        elif any(k in s for k in ("ap-", "-ap", "wap", "aruba-ap", "aironet", "catalyst-ap")):
            return "ap"
        elif any(k in s for k in ("router", "rt-", "-rt", "isr", "asr")):
            return "router"
        return "switch"

    def _infer_device_roles_and_tiers(
        self,
        devices: Dict[str, Device],
        links: List[Link],
        dev_port_macs: Dict[Tuple[str, str], List[MacEntry]]
    ):
        """Deduce hierarchical tiers (0=WAN, 1=Firewall, 2=Core, 3=Dist, 4=Access, 5=Endpoint)."""
        # Calculate degree and switch connections
        degree: Dict[str, int] = defaultdict(int)
        for l in links:
            degree[l.src] += 1
            degree[l.dst] += 1

        for d_id, dev in devices.items():
            h_lower = dev.hostname.lower()

            # Firewall
            if dev.device_type == "firewall" or any(k in h_lower for k in ("fw", "firewall", "fortigate")):
                dev.role = "Firewall"
                dev.tier = 1
                dev.device_type = "firewall"
            # Server / Storage / AP
            elif dev.device_type in ("server", "storage", "ap", "endpoint", "pc", "printer"):
                dev.role = dev.device_type.capitalize()
                dev.tier = 5
            # Core Switch
            elif any(k in h_lower for k in ("core", "cs-", "-cs")):
                dev.role = "Core"
                dev.tier = 2
                dev.device_type = "core-switch"
            # Distribution Switch
            elif any(k in h_lower for k in ("dist", "ds-", "-ds", "agg")):
                dev.role = "Distribution"
                dev.tier = 3
                dev.device_type = "switch"
            # Access Switch
            elif any(k in h_lower for k in ("acc", "as-", "-as", "edge")):
                dev.role = "Access"
                dev.tier = 4
                dev.device_type = "switch"
            else:
                # Heuristic based on link density / degree
                deg = degree.get(d_id, 0)
                if deg >= 4:
                    dev.role = "Distribution"
                    dev.tier = 3
                else:
                    dev.role = "Access"
                    dev.tier = 4
