"""Unit tests for the Network Topology Intelligence Platform (NTIP)."""
import unittest
import xml.etree.ElementTree as ET
from network_topology.models.schema import (
    Neighbor, MacEntry, ArpEntry, Device, Link, TopologyData
)
from network_topology.parsers.cisco import CiscoParser
from network_topology.parsers.fortiswitch import FortiSwitchParser
from network_topology.engine.normalize import normalize_mac, normalize_interface
from network_topology.engine.oui import lookup_vendor, infer_device_info_from_oui
from network_topology.engine.inference import TopologyInferenceEngine
from network_topology.engine.diff import compare_topologies
from network_topology.graph.drawio_export import export_to_drawio


class TestNormalization(unittest.TestCase):
    def test_mac_normalization(self):
        self.assertEqual(normalize_mac("0011.2233.4455"), "00:11:22:33:44:55")
        self.assertEqual(normalize_mac("00-11-22-33-44-55"), "00:11:22:33:44:55")
        self.assertEqual(normalize_mac("001122334455"), "00:11:22:33:44:55")

    def test_interface_normalization(self):
        self.assertEqual(normalize_interface("GigabitEthernet1/0/1"), "Gi1/0/1")
        self.assertEqual(normalize_interface("TenGigabitEthernet1/1/1"), "Te1/1/1")
        self.assertEqual(normalize_interface("FastEthernet0/24"), "Fa0/24")
        self.assertEqual(normalize_interface("Port-channel10"), "Po10")


class TestOUI(unittest.TestCase):
    def test_vendor_lookup(self):
        self.assertEqual(lookup_vendor("00:50:56:8e:12:01"), "VMware")
        self.assertEqual(lookup_vendor("00:11:32:aa:bb:cc"), "Synology")
        self.assertEqual(lookup_vendor("04:d5:90:12:34:56"), "Fortinet")

    def test_device_type_inference(self):
        v, t = infer_device_info_from_oui("00:50:56:8e:12:01")
        self.assertEqual(v, "VMware")
        self.assertEqual(t, "server")


class TestCiscoParser(unittest.TestCase):
    def setUp(self):
        self.parser = CiscoParser()

    def test_parse_lldp(self):
        sample = """
------------------------------------------------
Local Interface: TenGigabitEthernet1/1/1
Chassis id: 001a.2b3c.4d02
Port id: TenGigabitEthernet1/1/1
System Name: SW-DIST-01
System Description: Cisco IOS Software
Management Addresses:
    IP: 10.0.0.2
"""
        neighbors = self.parser.parse_lldp(sample, "SW-CORE-01")
        self.assertEqual(len(neighbors), 1)
        n = neighbors[0]
        self.assertEqual(n.local_device, "sw-core-01")
        self.assertEqual(n.local_port, "Te1/1/1")
        self.assertEqual(n.remote_device, "sw-dist-01")
        self.assertEqual(n.remote_port, "Te1/1/1")
        self.assertEqual(n.remote_ip, "10.0.0.2")

    def test_parse_mac(self):
        sample = """
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0050.568e.1201    DYNAMIC     Gi0/1
  20    0011.32aa.bbcc    DYNAMIC     Gi0/2
 All    0100.0ccc.cccc    STATIC      CPU
"""
        macs = self.parser.parse_mac(sample, "SW-ACC-01")
        self.assertEqual(len(macs), 2)
        self.assertEqual(macs[0].mac, "00:50:56:8e:12:01")
        self.assertEqual(macs[0].port, "Gi0/1")


class TestTopologyInference(unittest.TestCase):
    def test_bidirectional_and_endpoint_inference(self):
        engine = TopologyInferenceEngine()

        neighbors = [
            # SW1:Gi1/0/1 -> SW2:Gi0/24
            Neighbor(local_device="SW1", local_port="Gi1/0/1", remote_device="SW2", remote_port="Gi0/24", protocol="LLDP"),
            # SW2:Gi0/24 -> SW1:Gi1/0/1 (Reverse confirmation)
            Neighbor(local_device="SW2", local_port="Gi0/24", remote_device="SW1", remote_port="Gi1/0/1", protocol="LLDP"),
            # Unidirectional link to FW
            Neighbor(local_device="SW1", local_port="Gi1/0/24", remote_device="FW-01", remote_port="port1", protocol="LLDP", remote_platform="FortiGate"),
        ]

        macs = [
            # Single host learned on SW2 Gi0/1
            MacEntry(device="SW2", vlan=10, mac="00:50:56:8e:12:01", port="Gi0/1"),
        ]

        arps = [
            ArpEntry(ip="10.0.10.11", mac="00:50:56:8e:12:01", device="SW1")
        ]

        topology = engine.infer_topology(neighbors=neighbors, mac_entries=macs, arp_entries=arps)

        # Verify devices
        dev_ids = {d.id for d in topology.devices}
        self.assertIn("sw1", dev_ids)
        self.assertIn("sw2", dev_ids)
        self.assertIn("fw-01", dev_ids)
        # End host should be inferred
        self.assertTrue(any("vmware" in d_id for d_id in dev_ids))

        # Verify links & confidence
        # Bidirectional SW1 <-> SW2 must have confidence 1.0 (100%)
        sw1_sw2_link = next(l for l in topology.links if ("sw1" in (l.src, l.dst) and "sw2" in (l.src, l.dst)))
        self.assertEqual(sw1_sw2_link.confidence, 1.0)
        self.assertEqual(sw1_sw2_link.status, "confirmed")

        # Unidirectional SW1 <-> FW-01 must have confidence 0.8 (80%)
        sw1_fw_link = next(l for l in topology.links if "fw-01" in (l.src, l.dst))
        self.assertEqual(sw1_fw_link.confidence, 0.8)

        # Inferred host link
        host_link = next(l for l in topology.links if any("vmware" in x for x in (l.src, l.dst)))
        self.assertEqual(host_link.status, "inferred")


class TestDrawioExport(unittest.TestCase):
    def test_xml_validity(self):
        topo = TopologyData(
            devices=[
                Device(id="sw1", hostname="SW-CORE-01", device_type="core-switch", tier=2),
                Device(id="sw2", hostname="SW-ACC-01", device_type="switch", tier=4)
            ],
            links=[
                Link(src="sw1", src_port="Gi1/0/1", dst="sw2", dst_port="Gi0/24", confidence=1.0)
            ]
        )
        xml_str = export_to_drawio(topo)
        # Ensure it parses as valid XML
        root = ET.fromstring(xml_str)
        self.assertEqual(root.tag, "mxfile")
        diagram = root.find("diagram")
        self.assertIsNotNone(diagram)
        model = diagram.find("mxGraphModel")
        self.assertIsNotNone(model)


class TestTopologyDiff(unittest.TestCase):
    def test_diff_detection(self):
        t1 = TopologyData(
            devices=[Device(id="sw1", hostname="SW1", device_type="switch")],
            links=[Link(src="sw1", src_port="Gi1/0/1", dst="sw2", dst_port="Gi0/1", confidence=1.0)]
        )
        t2 = TopologyData(
            devices=[
                Device(id="sw1", hostname="SW1", device_type="switch"),
                Device(id="sw3", hostname="SW3", device_type="switch")
            ],
            links=[Link(src="sw1", src_port="Gi1/0/1", dst="sw2", dst_port="Gi0/2", confidence=1.0)]
        )
        diff = compare_topologies(t1, t2)
        self.assertEqual(len(diff.added_devices), 1)
        self.assertEqual(diff.added_devices[0].id, "sw3")
        self.assertEqual(len(diff.changed_links), 1)


if __name__ == "__main__":
    unittest.main()
