"""OUI (Organizationally Unique Identifier) vendor database and device type inference."""
from typing import Optional, Tuple
from .normalize import normalize_mac

# Major vendor OUI prefixes (first 3 octets, lowercase xx:xx:xx)
OUI_DATABASE = {
    # Cisco Systems
    "00:00:0c": "Cisco", "00:01:42": "Cisco", "00:01:43": "Cisco", "00:01:63": "Cisco",
    "00:01:96": "Cisco", "00:01:97": "Cisco", "00:02:16": "Cisco", "00:02:17": "Cisco",
    "00:02:4a": "Cisco", "00:02:4b": "Cisco", "00:02:7d": "Cisco", "00:02:7e": "Cisco",
    "00:02:b9": "Cisco", "00:02:ba": "Cisco", "00:02:fc": "Cisco", "00:02:fd": "Cisco",
    "00:1a:2b": "Cisco", "00:1a:30": "Cisco", "00:1a:6c": "Cisco", "00:1a:a1": "Cisco",
    "00:1b:2a": "Cisco", "00:1b:d4": "Cisco", "00:1b:d5": "Cisco", "00:1c:0e": "Cisco",
    "00:26:0b": "Cisco", "00:26:98": "Cisco", "00:27:0d": "Cisco", "00:27:0e": "Cisco",
    "28:ac:9e": "Cisco", "3c:0e:23": "Cisco", "44:ad:d9": "Cisco", "70:81:05": "Cisco",
    "d4:a0:2a": "Cisco", "f4:0f:1b": "Cisco", "00:50:0f": "Cisco", "00:e0:1e": "Cisco",
    
    # Fortinet
    "00:09:0f": "Fortinet", "04:d5:90": "Fortinet", "08:5b:0e": "Fortinet",
    "70:4c:a5": "Fortinet", "90:6c:ac": "Fortinet", "b8:27:eb": "Fortinet",
    "e8:1d:a8": "Fortinet", "f8:23:b2": "Fortinet",
    
    # HP / Aruba
    "00:01:e6": "HP/Aruba", "00:01:e7": "HP/Aruba", "00:02:a5": "HP/Aruba",
    "00:04:ea": "HP/Aruba", "00:08:02": "HP/Aruba", "00:0b:86": "Aruba",
    "00:1a:1e": "Aruba", "00:24:6c": "Aruba", "20:4c:03": "Aruba",
    "70:3a:0e": "HP/Aruba", "9c:8e:99": "Aruba", "d8:c7:c8": "Aruba",
    
    # Juniper Networks
    "00:05:85": "Juniper", "00:10:db": "Juniper", "00:12:1e": "Juniper",
    "00:19:e2": "Juniper", "00:21:59": "Juniper", "00:26:88": "Juniper",
    "2c:6b:f5": "Juniper", "3c:8a:b0": "Juniper", "54:e0:32": "Juniper",
    
    # Dell / EMC
    "00:06:5b": "Dell", "00:08:74": "Dell", "00:0d:56": "Dell", "00:11:43": "Dell",
    "00:13:72": "Dell", "00:14:22": "Dell", "00:18:8b": "Dell", "18:66:da": "Dell",
    "24:b6:fd": "Dell", "44:a8:42": "Dell", "74:86:7a": "Dell", "bc:30:5b": "Dell",
    
    # VMware (Virtual Machines)
    "00:05:69": "VMware", "00:0c:29": "VMware", "00:1c:14": "VMware", "00:50:56": "VMware",
    
    # Storage (Synology, QNAP, NetApp)
    "00:11:32": "Synology", "00:11:0a": "NetApp", "00:08:9b": "QNAP", "24:5e:be": "QNAP",
    
    # Intel (NICs / Servers)
    "00:02:b3": "Intel", "00:03:47": "Intel", "00:04:23": "Intel", "00:07:e9": "Intel",
    "00:13:02": "Intel", "00:15:17": "Intel", "00:1b:21": "Intel", "68:05:ca": "Intel",
    
    # Apple
    "00:03:93": "Apple", "00:05:02": "Apple", "00:0a:27": "Apple", "00:0a:95": "Apple",
    "00:0d:93": "Apple", "00:10:fa": "Apple", "00:11:24": "Apple", "a4:83:e7": "Apple",
    
    # Microsoft / Hyper-V
    "00:03:ff": "Microsoft", "00:12:5a": "Microsoft", "00:15:5d": "Microsoft",
    
    # Extreme Networks
    "00:01:30": "Extreme", "00:04:96": "Extreme", "00:0b:60": "Extreme",
    
    # Huawei
    "00:18:82": "Huawei", "00:19:e0": "Huawei", "00:1e:10": "Huawei", "00:25:9e": "Huawei",
    
    # Ubiquiti
    "00:15:6d": "Ubiquiti", "00:27:22": "Ubiquiti", "24:a4:3c": "Ubiquiti", "78:8a:20": "Ubiquiti"
}


def lookup_vendor(mac_str: Optional[str]) -> str:
    """Identify hardware vendor from MAC address OUI."""
    canonical = normalize_mac(mac_str)
    if not canonical or len(canonical) < 8:
        return "Unknown"
    prefix = canonical[:8]  # "xx:xx:xx"
    return OUI_DATABASE.get(prefix, "Generic/Unknown")


def infer_device_info_from_oui(mac_str: Optional[str]) -> Tuple[str, str]:
    """Return (vendor, likely_device_type) deduced from MAC address."""
    vendor = lookup_vendor(mac_str)
    
    if vendor == "VMware":
        return vendor, "server"
    elif vendor in ("Synology", "QNAP", "NetApp"):
        return vendor, "storage"
    elif vendor in ("Cisco", "HP/Aruba", "Juniper"):
        return vendor, "switch"
    elif vendor == "Fortinet":
        return vendor, "firewall"
    elif vendor == "Apple":
        return vendor, "endpoint"
    elif vendor == "Intel":
        return vendor, "server"
    elif vendor == "Dell":
        return vendor, "server"
    elif vendor == "Ubiquiti":
        return vendor, "ap"
        
    return vendor, "endpoint"
