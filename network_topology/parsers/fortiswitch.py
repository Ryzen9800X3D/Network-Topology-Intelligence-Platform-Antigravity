"""Fortinet FortiOS / FortiSwitch CLI Parser."""
import re
from typing import List
from .base import BaseParser
from ..models.schema import Neighbor, MacEntry
from ..engine.normalize import normalize_interface, normalize_mac, clean_device_id


class FortiSwitchParser(BaseParser):
    """Parser for Fortinet FortiGate / FortiSwitch CLI command outputs."""

    @property
    def vendor_name(self) -> str:
        return "Fortinet"

    def parse_lldp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse 'get switch lldp neighbors-detail' or 'diagnose sys lldp neighbor'."""
        neighbors: List[Neighbor] = []
        if not text:
            return neighbors

        blocks = re.split(r'(?:Port:\s*|Port\s*\(([^)]+)\)\s*neighbor:)', text)
        # Parse blocks
        sub_blocks = re.split(r'\n(?=[Pp]ort(?:\s*\(|\s*:))', text)
        for block in sub_blocks:
            if not block.strip():
                continue
            
            loc_p_m = re.search(r'(?:Port:\s*|Port\s*\()([A-Za-z0-9/_-]+)', block)
            rem_dev_m = re.search(r'(?:System Name|Sysname):\s*([^\r\n]+)', block, re.IGNORECASE)
            rem_p_m = re.search(r'(?:Port ID|Port-id):\s*([A-Za-z0-9/_-]+)', block, re.IGNORECASE)
            rem_ip_m = re.search(r'(?:Management Address|Mgmt-address):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', block, re.IGNORECASE)
            platform_m = re.search(r'(?:System Description|Description):\s*([^\r\n]+)', block, re.IGNORECASE)

            if loc_p_m and rem_dev_m and rem_p_m:
                loc_p = loc_p_m.group(1).strip()
                rem_dev = rem_dev_m.group(1).strip()
                rem_p = rem_p_m.group(1).strip()
                rem_ip = rem_ip_m.group(1).strip() if rem_ip_m else None
                platform = platform_m.group(1).strip() if platform_m else None

                neighbors.append(Neighbor(
                    local_device=clean_device_id(local_device),
                    local_port=normalize_interface(loc_p),
                    remote_device=clean_device_id(rem_dev),
                    remote_port=normalize_interface(rem_p),
                    protocol="LLDP",
                    confidence=1.0,
                    remote_ip=rem_ip,
                    remote_platform=platform
                ))

        return neighbors

    def parse_cdp(self, text: str, local_device: str) -> List[Neighbor]:
        # FortiSwitch primarily uses LLDP
        return self.parse_lldp(text, local_device)

    def parse_mac(self, text: str, local_device: str) -> List[MacEntry]:
        """Parse 'diagnose switch-controller dump mac-cache' or 'get switch mac-address'."""
        mac_entries: List[MacEntry] = []
        if not text:
            return mac_entries

        # Pattern: MAC: 00:11:22:33:44:55  VLAN: 10  Port: port1
        pattern = re.compile(
            r'(?:MAC:\s*|\s*)([0-9a-fA-F:]{17}|[0-9a-fA-F-]{17})\s+(?:VLAN:\s*|\s*)(\d+)\s+(?:Port:\s*|\s*)([A-Za-z0-9/_-]+)',
            re.IGNORECASE
        )

        for m in pattern.finditer(text):
            mac_raw, vlan_str, port_raw = m.groups()
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
