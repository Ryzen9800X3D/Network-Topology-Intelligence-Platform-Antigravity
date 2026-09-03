"""Juniper Junos CLI Parser."""
import re
from typing import List
from .base import BaseParser
from ..models.schema import Neighbor, MacEntry
from ..engine.normalize import normalize_interface, normalize_mac, clean_device_id


class JuniperParser(BaseParser):
    """Parser for Juniper Junos CLI command outputs."""

    @property
    def vendor_name(self) -> str:
        return "Juniper"

    def parse_lldp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse 'show lldp neighbors detail'."""
        neighbors: List[Neighbor] = []
        if not text:
            return neighbors

        blocks = re.split(r'\n(?=Local Interface\s*:)', text)
        for block in blocks:
            if not block.strip():
                continue

            loc_p_m = re.search(r'Local Interface\s*:\s*([A-Za-z0-9/._-]+)', block)
            rem_dev_m = re.search(r'System name\s*:\s*([^\r\n]+)', block, re.IGNORECASE)
            rem_p_m = re.search(r'(?:Port info|Port ID)\s*:\s*([^\r\n]+)', block, re.IGNORECASE)
            rem_ip_m = re.search(r'Management address\s*:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', block, re.IGNORECASE)
            platform_m = re.search(r'System description\s*:\s*([^\r\n]+)', block, re.IGNORECASE)

            if loc_p_m and rem_dev_m and rem_p_m:
                loc_p = loc_p_m.group(1).split('.')[0]  # strip .0 unit
                rem_dev = rem_dev_m.group(1).strip()
                rem_p = rem_p_m.group(1).strip().split('.')[0]
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
        return self.parse_lldp(text, local_device)

    def parse_mac(self, text: str, local_device: str) -> List[MacEntry]:
        """Parse 'show ethernet-switching table'."""
        mac_entries: List[MacEntry] = []
        if not text:
            return mac_entries

        # Pattern: VLAN MAC Type Age Interfaces
        pattern = re.compile(
            r'^\s*(\S+)\s+([0-9a-fA-F:]{17}|[0-9a-fA-F-]{17})\s+(?:Learn|Static)\s+\S+\s+([A-Za-z0-9/._-]+)',
            re.MULTILINE
        )

        for m in pattern.finditer(text):
            vlan_name, mac_raw, intf = m.groups()
            canon_mac = normalize_mac(mac_raw)
            intf_clean = intf.split('.')[0]
            if canon_mac and not intf_clean.lower().startswith(("bme", "me0", "vlan")):
                mac_entries.append(MacEntry(
                    device=clean_device_id(local_device),
                    vlan=None,
                    mac=canon_mac,
                    port=normalize_interface(intf_clean),
                    entry_type="DYNAMIC"
                ))

        return mac_entries
