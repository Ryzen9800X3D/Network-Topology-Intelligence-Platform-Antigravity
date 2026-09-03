"""Normalization utilities for interface names, MAC addresses, IP addresses, and device identifiers."""
import re
from typing import Optional


def normalize_mac(mac_str: Optional[str]) -> Optional[str]:
    """Convert any MAC address format to canonical lowercase xx:xx:xx:xx:xx:xx format.
    
    Supported inputs:
    - Cisco: 0011.2233.4455 or 011.223.445
    - Windows/RFC: 00-11-22-33-44-55
    - UNIX: 00:11:22:33:44:55 or 0:11:22:33:44:55
    - Raw: 001122334455
    """
    if not mac_str:
        return None
    cleaned = re.sub(r'[^0-9a-fA-F]', '', mac_str).lower()
    if len(cleaned) != 12:
        return mac_str.strip().lower()  # fallback if malformed
    return ':'.join(cleaned[i:i+2] for i in range(0, 12, 2))


def normalize_interface(name: Optional[str]) -> str:
    """Normalize interface names to concise, standard representation.
    
    Examples:
    - GigabitEthernet1/0/1 -> Gi1/0/1
    - TenGigabitEthernet1/1/1 -> Te1/1/1
    - TwentyFiveGigE1/0/1 -> Twe1/0/1
    - FortyGigabitEthernet1/1 -> Fo1/1
    - HundredGigE1/0/1 -> Hu1/0/1
    - FastEthernet0/1 -> Fa0/1
    - Ethernet1/1 -> Eth1/1
    - Port-channel10 -> Po10
    - ge-0/0/0 -> ge-0/0/0
    - port1 -> port1
    """
    if not name:
        return ""
    n = name.strip()
    
    # Map common prefixes
    mappings = [
        (r'^(?:GigabitEthernet|GigEth|GigE|Gi)\s*(\d.*)$', r'Gi\1'),
        (r'^(?:TenGigabitEthernet|TenGigEth|TenGigE|Te)\s*(\d.*)$', r'Te\1'),
        (r'^(?:TwentyFiveGigE|TweGigE|Twe)\s*(\d.*)$', r'Twe\1'),
        (r'^(?:FortyGigabitEthernet|FortyGigE|Fo)\s*(\d.*)$', r'Fo\1'),
        (r'^(?:HundredGigE|HuGigE|Hu)\s*(\d.*)$', r'Hu\1'),
        (r'^(?:FastEthernet|FastEth|Fa)\s*(\d.*)$', r'Fa\1'),
        (r'^(?:Port-channel|Port-Channel|Po)\s*(\d.*)$', r'Po\1'),
        (r'^(?:Ethernet|Eth)\s*(\d.*)$', r'Eth\1'),
        (r'^(?:Management|mgmt)\s*(\d.*)$', r'mgmt\1'),
        (r'^(?:Loopback|Lo)\s*(\d.*)$', r'Lo\1'),
        (r'^(?:Vlan|Vl)\s*(\d.*)$', r'Vlan\1'),
    ]
    
    for pattern, replacement in mappings:
        m = re.match(pattern, n, re.IGNORECASE)
        if m:
            return re.sub(pattern, replacement, n, flags=re.IGNORECASE)
            
    return n


def clean_device_id(name: Optional[str]) -> str:
    """Generate a clean, consistent URL-friendly slug ID for a device."""
    if not name:
        return "unknown-node"
    # Remove domain suffix like .local, .corp, .cisco.com
    hostname = name.split('.')[0].strip()
    slug = re.sub(r'[^a-zA-Z0-9_-]', '-', hostname).lower()
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or "node"


def normalize_ip(ip_str: Optional[str]) -> Optional[str]:
    """Validate and clean IPv4 address string."""
    if not ip_str:
        return None
    m = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', ip_str.strip())
    return m.group(0) if m else None
