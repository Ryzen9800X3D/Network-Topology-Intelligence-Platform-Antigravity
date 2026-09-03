"""Multi-vendor parser manager and automatic vendor/command detection."""
import re
from typing import Dict, List, Tuple, Any, Optional
from .base import BaseParser
from .cisco import CiscoParser
from .aruba import ArubaParser
from .fortiswitch import FortiSwitchParser
from .juniper import JuniperParser
from ..models.schema import Neighbor, MacEntry, ArpEntry, StpInfo, Device
from ..engine.normalize import clean_device_id, normalize_ip, normalize_mac
from ..engine.oui import infer_device_info_from_oui


class ParserManager:
    """Manages multi-vendor parsers with automated vendor detection."""

    def __init__(self):
        self.parsers: Dict[str, BaseParser] = {
            "cisco": CiscoParser(),
            "aruba": ArubaParser(),
            "fortinet": FortiSwitchParser(),
            "juniper": JuniperParser(),
        }

    def detect_vendor(self, text: str) -> str:
        """Heuristically identify network equipment vendor from CLI outputs."""
        lower = text.lower()
        if any(k in lower for k in ("fortiswitch", "fortigate", "get switch", "diagnose switch")):
            return "fortinet"
        elif any(k in lower for k in ("procurve", "arubas", "arubaos", "show lldp info remote-device", "neighbor chassis-name")):
            return "aruba"
        elif any(k in lower for k in ("junos", "juniper", "ethernet-switching table", "ge-0/0/")):
            return "juniper"
        elif any(k in lower for k in ("cisco", "catalyst", "nexus", "show cdp", "show mac address-table", "gigabitethernet")):
            return "cisco"
        
        # Default to Cisco as industry standard command structure
        return "cisco"

    def detect_hostname(self, text: str, fallback: str = "switch") -> str:
        """Extract prompt or banner hostname (e.g., SW-CORE-01#)."""
        # Match prompt like SW-CORE-01# or Core-01> or hostname SW-CORE-01
        m = re.search(r'hostname\s+([A-Za-z0-9_-]+)', text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
            
        m2 = re.search(r'([A-Za-z0-9_-]+)(?:#|>)\s*(?:show|get|diagnose)', text)
        if m2:
            return m2.group(1).strip()

        # Match Device ID: SW-CORE-01
        m3 = re.search(r'Device ID:\s*([A-Za-z0-9_-]+)', text)
        if m3:
            return m3.group(1).strip()

        return fallback

    def parse_text(
        self, 
        text: str, 
        local_hostname: Optional[str] = None,
        vendor: Optional[str] = None
    ) -> Tuple[List[Neighbor], List[MacEntry], List[ArpEntry], List[StpInfo], Dict[str, Any]]:
        """Parse raw CLI text block (may contain multiple commands)."""
        if not vendor:
            vendor = self.detect_vendor(text)
            
        parser = self.parsers.get(vendor.lower(), self.parsers["cisco"])
        dev_name = local_hostname or self.detect_hostname(text)

        all_neighbors: List[Neighbor] = []
        all_macs: List[MacEntry] = []
        all_arps: List[ArpEntry] = []
        all_stps: List[StpInfo] = []

        # Parse LLDP
        lldp_neighbors = parser.parse_lldp(text, dev_name)
        all_neighbors.extend(lldp_neighbors)

        # Parse CDP (if supported)
        cdp_neighbors = parser.parse_cdp(text, dev_name)
        all_neighbors.extend(cdp_neighbors)

        # Parse MAC table
        mac_entries = parser.parse_mac(text, dev_name)
        all_macs.extend(mac_entries)

        # Parse ARP
        arp_entries = parser.parse_arp(text, dev_name)
        all_arps.extend(arp_entries)

        # Parse STP
        stp_entries = parser.parse_stp(text, dev_name)
        all_stps.extend(stp_entries)

        metadata = {
            "detected_vendor": vendor,
            "detected_hostname": dev_name,
            "neighbor_count": len(all_neighbors),
            "mac_count": len(all_macs),
            "arp_count": len(all_arps),
            "stp_count": len(all_stps),
        }

        return all_neighbors, all_macs, all_arps, all_stps, metadata
