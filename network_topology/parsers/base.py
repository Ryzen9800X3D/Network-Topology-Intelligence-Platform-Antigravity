"""Abstract base class for network equipment CLI parsers."""
from abc import ABC, abstractmethod
from typing import List, Optional
from ..models.schema import Neighbor, MacEntry, ArpEntry, StpInfo, Interface


class BaseParser(ABC):
    """Base parser interface for multi-vendor network CLI outputs."""

    @property
    @abstractmethod
    def vendor_name(self) -> str:
        """Return the canonical vendor name (e.g., 'Cisco', 'Fortinet')."""
        pass

    @abstractmethod
    def parse_lldp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse LLDP neighbor detail output."""
        pass

    @abstractmethod
    def parse_cdp(self, text: str, local_device: str) -> List[Neighbor]:
        """Parse CDP neighbor detail output."""
        pass

    @abstractmethod
    def parse_mac(self, text: str, local_device: str) -> List[MacEntry]:
        """Parse MAC address table output."""
        pass

    def parse_arp(self, text: str, local_device: str) -> List[ArpEntry]:
        """Parse ARP table output (optional)."""
        return []

    def parse_stp(self, text: str, local_device: str) -> List[StpInfo]:
        """Parse Spanning-Tree output (optional)."""
        return []

    def parse_interfaces(self, text: str, local_device: str) -> List[Interface]:
        """Parse interface status output (optional)."""
        return []
