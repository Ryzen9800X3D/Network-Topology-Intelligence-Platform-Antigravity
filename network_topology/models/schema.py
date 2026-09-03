"""Pydantic data models for the Network Topology Intelligence Platform."""
from __future__ import annotations
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class Device(BaseModel):
    """Network device node representation."""
    id: str = Field(..., description="Unique slug ID (lowercase, alphanumeric, dashes)")
    hostname: str = Field(..., description="Device hostname or system name")
    mgmt_ip: Optional[str] = Field(None, description="Management IP address")
    base_mac: Optional[str] = Field(None, description="Base MAC address (canonical: xx:xx:xx:xx:xx:xx)")
    vendor: Optional[str] = Field("Unknown", description="Hardware vendor (Cisco, Fortinet, Aruba, Juniper, etc.)")
    model: Optional[str] = Field(None, description="Device model/platform (e.g., C9300, FortiSwitch-108E)")
    serial: Optional[str] = Field(None, description="Serial number if available")
    os: Optional[str] = Field(None, description="Operating system / version")
    device_type: str = Field("switch", description="switch, core-switch, router, firewall, server, storage, ap, pc, printer, endpoint")
    role: Optional[str] = Field(None, description="Inferred network role: Core, Distribution, Access, Firewall, Router, Server, Storage, AP, Endpoint")
    tier: Optional[int] = Field(None, description="Hierarchical layer: 0=WAN, 1=Firewall, 2=Core, 3=Distribution, 4=Access, 5=Endpoint")
    extra: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary metadata")


class Interface(BaseModel):
    """Network interface on a device."""
    device: str = Field(..., description="Device ID or hostname")
    name: str = Field(..., description="Canonical interface name (e.g., Gi1/0/1, port1, ge-0/0/1)")
    raw_name: Optional[str] = Field(None, description="Original CLI interface string")
    status: str = Field("unknown", description="Interface status: up, down, admin_down, unknown")
    speed: Optional[str] = Field(None, description="Link speed: 10M, 100M, 1G, 10G, 40G, 100G")
    duplex: Optional[str] = Field(None, description="Duplex: full, half, auto")
    mode: Optional[str] = Field("unknown", description="Switchport mode: access, trunk, routed, lag_member, unknown")
    vlan: Optional[int] = Field(None, description="Access VLAN or Native VLAN")
    allowed_vlans: Optional[str] = Field(None, description="Allowed VLANs on trunk (e.g., 10,20,30 or 1-100)")
    lag_id: Optional[str] = Field(None, description="Associated Port-Channel/LAG interface name")
    description: Optional[str] = Field(None, description="Interface port description / label")


class Neighbor(BaseModel):
    """Direct neighbor discovery record (LLDP, CDP, etc.)."""
    local_device: str = Field(..., description="Local device hostname/id")
    local_port: str = Field(..., description="Local interface port name")
    remote_device: str = Field(..., description="Remote device hostname/id")
    remote_port: str = Field(..., description="Remote interface port name")
    protocol: str = Field("LLDP", description="Discovery protocol: LLDP, CDP, STATIC")
    confidence: float = Field(1.0, description="Confidence score 0.0 - 1.0")
    remote_ip: Optional[str] = Field(None, description="Remote management IP")
    remote_platform: Optional[str] = Field(None, description="Remote platform/description")


class MacEntry(BaseModel):
    """MAC Address Table (FDB) record."""
    device: str = Field(..., description="Device reporting this MAC")
    vlan: Optional[int] = Field(None, description="VLAN ID")
    mac: str = Field(..., description="Canonical MAC address (xx:xx:xx:xx:xx:xx)")
    port: str = Field(..., description="Port on which the MAC was learned")
    entry_type: Optional[str] = Field("DYNAMIC", description="DYNAMIC, STATIC, CPU")


class ArpEntry(BaseModel):
    """ARP cache table record."""
    ip: str = Field(..., description="IP address")
    mac: str = Field(..., description="Canonical MAC address")
    interface: Optional[str] = Field(None, description="Interface")
    device: Optional[str] = Field(None, description="Device reporting ARP")


class StpInfo(BaseModel):
    """Spanning Tree Protocol information."""
    device: str = Field(..., description="Device ID")
    vlan: Optional[int] = Field(1, description="VLAN ID")
    root_bridge_id: Optional[str] = Field(None, description="Root Bridge MAC / ID")
    is_root: bool = Field(False, description="Whether this device is Root Bridge")
    bridge_id: Optional[str] = Field(None, description="Device's own bridge ID")
    port_states: Dict[str, str] = Field(default_factory=dict, description="Map of port name -> FORWARDING/BLOCKING/LEARNING")


class Link(BaseModel):
    """Inferred or confirmed link between two devices."""
    src: str = Field(..., description="Source device ID")
    src_port: str = Field(..., description="Source port name")
    dst: str = Field(..., description="Destination device ID")
    dst_port: str = Field(..., description="Destination port name")
    confidence: float = Field(1.0, description="Overall confidence score (0.0 to 1.0)")
    sources: List[str] = Field(default_factory=list, description="List of evidence: bidirectional_lldp, unidirectional_lldp, mac_match, mac_clustering, arp")
    status: str = Field("confirmed", description="Link status: confirmed (>=0.8), inferred (0.6-0.79), conflict (<0.6)")
    link_type: str = Field("physical", description="physical, lag, trunk, access")
    vlans: Optional[str] = Field(None, description="Allowed VLANs or native VLAN across this link")


class TopologyData(BaseModel):
    """Complete aggregated network topology dataset."""
    devices: List[Device] = Field(default_factory=list)
    interfaces: List[Interface] = Field(default_factory=list)
    links: List[Link] = Field(default_factory=list)
    mac_entries: List[MacEntry] = Field(default_factory=list)
    arp_entries: List[ArpEntry] = Field(default_factory=list)
    stp_info: List[StpInfo] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TopologyDiff(BaseModel):
    """Difference analysis between two topology snapshots."""
    added_devices: List[Device] = Field(default_factory=list)
    removed_devices: List[Device] = Field(default_factory=list)
    added_links: List[Link] = Field(default_factory=list)
    removed_links: List[Link] = Field(default_factory=list)
    changed_links: List[Dict[str, Any]] = Field(default_factory=list)
    summary: str = Field("", description="Human-readable changelog summary")
