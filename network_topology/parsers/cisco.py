"""Cisco IOS / IOS-XE / NX-OS CLI Parser."""
import re
from typing import List, Optional
from .base import BaseParser
from ..models.schema import Neighbor, MacEntry, ArpEntry, StpInfo, Interface
from ..engine.normalize import normalize_interface, normalize_mac, normalize_ip, clean_device_id


class CiscoParser(BaseParser):
    """Parser for Cisco CLI command outputs."""

    @property
    def vendor_name(self) -> str:
        return "Cisco"

    def parse_lldp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse 'show lldp neighbors detail' and tabular 'show lldp neighbors'."""
        neighbors: List[Neighbor] = []
        if not text:
            return neighbors

        # Approach 1: Check for detailed blocks separated by '---'
        blocks = re.split(r'-{5,}', text)
        if len(blocks) > 1:
            for block in blocks:
                if not block.strip():
                    continue
                local_port_m = re.search(r'(?:Local Interface|Local Intf|Interface):\s*(\S+)', block, re.IGNORECASE)
                # Look for System Name first, then Device ID, and only fallback to Chassis id
                rem_dev_m = re.search(r'System Name:\s*([^\r\n]+)', block, re.IGNORECASE)
                if not rem_dev_m:
                    rem_dev_m = re.search(r'Device ID:\s*([^\r\n]+)', block, re.IGNORECASE)
                if not rem_dev_m:
                    rem_dev_m = re.search(r'Chassis id:\s*([^\r\n]+)', block, re.IGNORECASE)
                remote_port_m = re.search(r'(?:Port id|Port ID \(outgoing port\)|Port Description):\s*([^\r\n]+)', block, re.IGNORECASE)
                remote_ip_m = re.search(r'(?:Management Addresses?|IP(?: address)?):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', block, re.IGNORECASE)
                platform_m = re.search(r'(?:System Description|Platform):\s*([^\r\n]+)', block, re.IGNORECASE)

                if local_port_m and rem_dev_m and remote_port_m:
                    local_p = normalize_interface(local_port_m.group(1))
                    rem_dev = rem_dev_m.group(1).strip()
                    rem_p = normalize_interface(remote_port_m.group(1).strip())
                    rem_ip = remote_ip_m.group(1).strip() if remote_ip_m else None
                    platform = platform_m.group(1).strip() if platform_m else None

                    # Avoid recording self or empty
                    if rem_dev and rem_p:
                        neighbors.append(Neighbor(
                            local_device=clean_device_id(local_device),
                            local_port=local_p,
                            remote_device=clean_device_id(rem_dev),
                            remote_port=rem_p,
                            protocol="LLDP",
                            confidence=1.0,
                            remote_ip=rem_ip,
                            remote_platform=platform
                        ))

        # Approach 2: Tabular fallback (show lldp neighbors)
        if not neighbors:
            # Lines like: SW-ACCESS-01   Gi1/0/1   120   B   Gi0/24
            tab_pattern = re.compile(r'^([a-zA-Z0-9_.-]+)\s+([A-Za-z0-9/]+)\s+\d+\s+[A-Za-z,\s]+\s+([A-Za-z0-9/]+)', re.MULTILINE)
            for match in tab_pattern.finditer(text):
                rem_dev, loc_p, rem_p = match.groups()
                if "Device" not in rem_dev and "Local" not in loc_p:
                    neighbors.append(Neighbor(
                        local_device=clean_device_id(local_device),
                        local_port=normalize_interface(loc_p),
                        remote_device=clean_device_id(rem_dev),
                        remote_port=normalize_interface(rem_p),
                        protocol="LLDP",
                        confidence=1.0
                    ))

        return neighbors

    def parse_cdp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse 'show cdp neighbors detail' and tabular 'show cdp neighbors'."""
        neighbors: List[Neighbor] = []
        if not text:
            return neighbors

        # Detail parser
        blocks = re.split(r'-{5,}', text)
        if len(blocks) > 1:
            for block in blocks:
                if not block.strip():
                    continue
                dev_m = re.search(r'Device ID:\s*([^\r\n]+)', block, re.IGNORECASE)
                ip_m = re.search(r'(?:IPv4 Address|IP address):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', block, re.IGNORECASE)
                platform_m = re.search(r'Platform:\s*([^,]+)', block, re.IGNORECASE)
                intf_m = re.search(r'Interface:\s*([^,\r\n]+),\s*Port ID \(outgoing port\):\s*([^\r\n]+)', block, re.IGNORECASE)

                if dev_m and intf_m:
                    rem_dev = dev_m.group(1).strip()
                    loc_p = normalize_interface(intf_m.group(1).strip())
                    rem_p = normalize_interface(intf_m.group(2).strip())
                    rem_ip = ip_m.group(1).strip() if ip_m else None
                    platform = platform_m.group(1).strip() if platform_m else None

                    neighbors.append(Neighbor(
                        local_device=clean_device_id(local_device),
                        local_port=loc_p,
                        remote_device=clean_device_id(rem_dev),
                        remote_port=rem_p,
                        protocol="CDP",
                        confidence=1.0,
                        remote_ip=rem_ip,
                        remote_platform=platform
                    ))

        # Tabular fallback (show cdp neighbors)
        if not neighbors:
            # Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID
            tab_pattern = re.compile(r'^([a-zA-Z0-9_.-]+)\s+([A-Za-z0-9/\s]+?)\s+\d+\s+[A-Za-z0-9\s]+\s+(?:cisco\s+)?\S+\s+([A-Za-z0-9/]+)$', re.MULTILINE)
            for line in text.splitlines():
                line = line.strip()
                m = re.match(r'^([a-zA-Z0-9_.-]+)\s+((?:Gig|Ten|Eth|Fas|GigabitEthernet|Te|Gi)[0-9/\s]+)\s+\d+\s+.*?\s+((?:Gig|Ten|Eth|Fas|GigabitEthernet|Te|Gi)[0-9/]+)$', line, re.IGNORECASE)
                if m:
                    rem_dev, loc_p, rem_p = m.groups()
                    loc_p = re.sub(r'\s+', '', loc_p)
                    neighbors.append(Neighbor(
                        local_device=clean_device_id(local_device),
                        local_port=normalize_interface(loc_p),
                        remote_device=clean_device_id(rem_dev),
                        remote_port=normalize_interface(rem_p),
                        protocol="CDP",
                        confidence=1.0
                    ))

        return neighbors

    def parse_mac(self, text: str, local_device: str) -> List[MacEntry]:
        """Parse 'show mac address-table'."""
        mac_entries: List[MacEntry] = []
        if not text:
            return mac_entries

        # Pattern matches:
        #   10    0011.2233.4455    DYNAMIC     Gi1/0/1
        # * 10    0011.2233.4455    dynamic     Eth1/1
        #   All   0100.0ccc.cccc    STATIC      CPU
        pattern = re.compile(
            r'^\s*\*?\s*(\d+|All)\s+([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}|[0-9a-fA-F:]{17}|[0-9a-fA-F-]{17})\s+(\S+)\s+(\S+)',
            re.MULTILINE
        )

        for match in pattern.finditer(text):
            vlan_str, mac_raw, type_str, port_raw = match.groups()
            
            # Skip CPU / Drop entries
            if port_raw.lower() in ("cpu", "drop", "switch"):
                continue

            vlan = int(vlan_str) if vlan_str.isdigit() else None
            canon_mac = normalize_mac(mac_raw)
            norm_port = normalize_interface(port_raw)

            if canon_mac and norm_port:
                mac_entries.append(MacEntry(
                    device=clean_device_id(local_device),
                    vlan=vlan,
                    mac=canon_mac,
                    port=norm_port,
                    entry_type=type_str.upper()
                ))

        return mac_entries

    def parse_arp(self, text: str, local_device: str) -> List[ArpEntry]:
        """Parse 'show ip arp'."""
        arp_entries: List[ArpEntry] = []
        if not text:
            return arp_entries

        # Protocol  Address          Age (min)  Hardware Addr   Type   Interface
        # Internet  10.0.10.11             45   0050.568e.1201  ARPA   Vlan10
        pattern = re.compile(
            r'Internet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+\S+\s+([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}|[0-9a-fA-F:]{17})\s+\S+\s+(\S+)',
            re.IGNORECASE
        )

        for match in pattern.finditer(text):
            ip, mac_raw, intf = match.groups()
            canon_mac = normalize_mac(mac_raw)
            if canon_mac:
                arp_entries.append(ArpEntry(
                    ip=ip,
                    mac=canon_mac,
                    interface=normalize_interface(intf),
                    device=clean_device_id(local_device)
                ))

        return arp_entries

    def parse_stp(self, text: str, local_device: str) -> List[StpInfo]:
        """Parse 'show spanning-tree'."""
        stp_list: List[StpInfo] = []
        if not text:
            return stp_list

        vlan_sections = re.split(r'VLAN0*(\d+)', text)
        if len(vlan_sections) > 1:
            for i in range(1, len(vlan_sections), 2):
                vlan_id = int(vlan_sections[i])
                content = vlan_sections[i+1]
                
                is_root = bool(re.search(r'This bridge is the root', content, re.IGNORECASE))
                root_mac_m = re.search(r'Root ID.*?Address\s+([0-9a-fA-F.]+)', content, re.DOTALL | re.IGNORECASE)
                root_mac = normalize_mac(root_mac_m.group(1)) if root_mac_m else None
                
                bridge_mac_m = re.search(r'Bridge ID.*?Address\s+([0-9a-fA-F.]+)', content, re.DOTALL | re.IGNORECASE)
                bridge_mac = normalize_mac(bridge_mac_m.group(1)) if bridge_mac_m else None

                port_states = {}
                # Gi1/0/1             Desg FWD 4         128.1    P2p
                port_matches = re.finditer(r'([A-Za-z0-9/]+)\s+(?:Root|Desg|Altn|Back)\s+(FWD|BLK|LRN|DIS)', content)
                for pm in port_matches:
                    port_name = normalize_interface(pm.group(1))
                    state = pm.group(2)
                    port_states[port_name] = "FORWARDING" if state == "FWD" else "BLOCKING"

                stp_list.append(StpInfo(
                    device=clean_device_id(local_device),
                    vlan=vlan_id,
                    root_bridge_id=root_mac,
                    is_root=is_root,
                    bridge_id=bridge_mac,
                    port_states=port_states
                ))

        return stp_list
