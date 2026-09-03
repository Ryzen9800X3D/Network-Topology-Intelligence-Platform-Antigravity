"""ArubaOS-S (ProCurve) and ArubaOS-CX CLI Parser."""
import re
from typing import List
from .base import BaseParser
from ..models.schema import Neighbor, MacEntry, Interface
from ..engine.normalize import normalize_interface, normalize_mac, clean_device_id


class ArubaParser(BaseParser):
    """Parser for Aruba / HP ProCurve / CX CLI command outputs."""

    @property
    def vendor_name(self) -> str:
        return "Aruba"

    def parse_lldp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse 'show lldp info remote-device detail' or 'show lldp info remote-device'."""
        neighbors: List[Neighbor] = []
        if not text:
            return neighbors

        # ProCurve style blocks:
        # Local Port   : 1
        # PortId       : 24
        # SysName      : SW-ACCESS-02
        # Management Address : 10.2.1.2
        blocks = re.split(r'(?:Local Port\s*:|Neighbor entries for port\s*)', text)
        if len(blocks) > 1:
            for b_idx, block in enumerate(blocks):
                if b_idx == 0 and "SysName" not in block and "Neighbor Chassis-Name" not in block:
                    continue
                
                # Retrieve local port
                loc_p_m = re.search(r'^\s*([A-Za-z0-9/_-]+)', block)
                local_port = loc_p_m.group(1) if loc_p_m else f"port{b_idx}"

                rem_dev_m = re.search(r'(?:SysName|Neighbor Chassis-Name)\s*:\s*([^\r\n]+)', block, re.IGNORECASE)
                rem_port_m = re.search(r'(?:PortId|Neighbor Port-ID|PortDescr)\s*:\s*([^\r\n]+)', block, re.IGNORECASE)
                rem_ip_m = re.search(r'(?:Management Address(?: Subtype)?|Neighbor Management Address)\s*:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', block, re.IGNORECASE)
                platform_m = re.search(r'(?:System Descr|Neighbor Chassis-Description)\s*:\s*([^\r\n]+)', block, re.IGNORECASE)

                if rem_dev_m and rem_port_m:
                    rem_dev = rem_dev_m.group(1).strip()
                    rem_p = rem_port_m.group(1).strip()
                    rem_ip = rem_ip_m.group(1).strip() if rem_ip_m else None
                    platform = platform_m.group(1).strip() if platform_m else None

                    neighbors.append(Neighbor(
                        local_device=clean_device_id(local_device),
                        local_port=normalize_interface(local_port),
                        remote_device=clean_device_id(rem_dev),
                        remote_port=normalize_interface(rem_p),
                        protocol="LLDP",
                        confidence=1.0,
                        remote_ip=rem_ip,
                        remote_platform=platform
                    ))

        # Tabular fallback:
        # Local Port | ChassisId | PortId | PrtType | SysName
        if not neighbors:
            for line in text.splitlines():
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 5 and parts[0] != "Local Port":
                    loc_p = parts[0]
                    rem_p = parts[2]
                    rem_dev = parts[4]
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
        # Aruba uses CDP in some environments; fallback to LLDP parsing logic if CDP present
        return self.parse_lldp(text, local_device)

    def parse_mac(self, text: str, local_device: str) -> List[MacEntry]:
        """Parse 'show mac-address'."""
        mac_entries: List[MacEntry] = []
        if not text:
            return mac_entries

        # Matches formats:
        # 001122-334455  1/1/1  10
        # 00:11:22:33:44:55  10  1
        pattern = re.compile(
            r'([0-9a-fA-F]{6}-[0-9a-fA-F]{6}|[0-9a-fA-F:]{17})\s+([A-Za-z0-9/_-]+)\s+(\d+)',
            re.IGNORECASE
        )

        for m in pattern.finditer(text):
            mac_raw, port_raw, vlan_str = m.groups()
            canon_mac = normalize_mac(mac_raw)
            if canon_mac:
                mac_entries.append(MacEntry(
                    device=clean_device_id(local_device),
                    vlan=int(vlan_str),
                    mac=canon_mac,
                    port=normalize_interface(port_raw),
                    entry_type="DYNAMIC"
                ))

        return mac_entries
