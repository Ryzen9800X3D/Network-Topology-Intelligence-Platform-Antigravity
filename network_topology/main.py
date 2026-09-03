"""Network Topology Intelligence Platform (NTIP) CLI Tool.

Usage:
  python main.py --sample cisco --output-dir output/
  python main.py --input-dir /path/to/logs --drawio output/topo.drawio --svg output/topo.svg
  python main.py --compare t1.json t2.json
"""
import os
import sys
import json
import argparse
from pathlib import Path
from typing import List

from .models.schema import Neighbor, MacEntry, ArpEntry, StpInfo, TopologyData, Device
from .parsers.parser_manager import ParserManager
from .engine.inference import TopologyInferenceEngine
from .engine.diff import compare_topologies
from .graph.drawio_export import export_to_drawio
from .graph.svg_export import export_to_svg


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="NTIP: Multi-Source Network Topology Inference & Documentation Engine"
    )
    parser.add_argument("--sample", choices=["cisco", "fortinet"], help="Run with built-in realistic network samples")
    parser.add_argument("--input-file", "-f", help="Path to single CLI log file")
    parser.add_argument("--input-dir", "-d", help="Directory containing multiple device CLI log files")
    parser.add_argument("--output-dir", "-o", default="output", help="Directory to save generated diagram files")
    parser.add_argument("--drawio", help="Explicit file path for Draw.io XML output")
    parser.add_argument("--svg", help="Explicit file path for SVG vector output")
    parser.add_argument("--json", help="Explicit file path for standardized JSON output")
    parser.add_argument("--compare", nargs=2, metavar=("T1_JSON", "T2_JSON"), help="Compare two topology JSON snapshots")
    return parser.parse_args()


def load_file_content(path: str) -> str:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def main():
    args = parse_arguments()

    # Handle Topology Comparison Mode
    if args.compare:
        t1_path, t2_path = args.compare
        print(f"[*] Comparing topology snapshots: {t1_path} vs {t2_path}...")
        with open(t1_path, 'r', encoding='utf-8') as f:
            t1_data = TopologyData(**json.load(f))
        with open(t2_path, 'r', encoding='utf-8') as f:
            t2_data = TopologyData(**json.load(f))

        diff = compare_topologies(t1_data, t2_data)
        print("\n" + "=" * 60)
        print("TOPOLOGY CHANGE AUDIT REPORT")
        print("=" * 60)
        print(diff.summary)
        print("=" * 60)
        return

    # Normal Inference Mode
    mgr = ParserManager()
    engine = TopologyInferenceEngine()

    all_neighbors: List[Neighbor] = []
    all_macs: List[MacEntry] = []
    all_arps: List[ArpEntry] = []
    all_stps: List[StpInfo] = []

    samples_dir = Path(__file__).parent / "samples"

    if args.sample == "cisco" or (not args.input_file and not args.input_dir and not args.sample):
        print("[*] Running with built-in Cisco Enterprise Multi-Tier sample...")
        sample_files = [
            ("cisco_core01_lldp.txt", "SW-CORE-01"),
            ("cisco_dist01_lldp.txt", "SW-DIST-01"),
            ("cisco_acc01_mac.txt", "SW-ACC-01"),
            ("cisco_core01_arp.txt", "SW-CORE-01"),
        ]
        for filename, hostname in sample_files:
            file_p = samples_dir / filename
            if file_p.exists():
                text = load_file_content(str(file_p))
                n, m, a, s, meta = mgr.parse_text(text, local_hostname=hostname, vendor="cisco")
                all_neighbors.extend(n)
                all_macs.extend(m)
                all_arps.extend(a)
                all_stps.extend(s)
                print(f"  + Parsed {filename}: {len(n)} neighbors, {len(m)} MACs, {len(a)} ARPs")

    elif args.input_file:
        text = load_file_content(args.input_file)
        n, m, a, s, meta = mgr.parse_text(text)
        all_neighbors.extend(n)
        all_macs.extend(m)
        all_arps.extend(a)
        all_stps.extend(s)
        print(f"[*] Parsed file {args.input_file} ({meta['detected_vendor']}): {len(n)} neighbors, {len(m)} MACs, {len(a)} ARPs")

    elif args.input_dir:
        dir_p = Path(args.input_dir)
        for log_file in dir_p.glob("*.*"):
            if log_file.suffix.lower() in (".txt", ".log", ".cli"):
                text = load_file_content(str(log_file))
                n, m, a, s, meta = mgr.parse_text(text)
                all_neighbors.extend(n)
                all_macs.extend(m)
                all_arps.extend(a)
                all_stps.extend(s)
                print(f"  + Parsed {log_file.name} ({meta['detected_vendor']}): {len(n)} neighbors, {len(m)} MACs")

    # Run Topology Inference
    print(f"\n[*] Executing Multi-Source Topology Inference Engine...")
    print(f"    Total Sources: {len(all_neighbors)} Neighbors, {len(all_macs)} MAC entries, {len(all_arps)} ARP entries")

    # Provide known base macs from ARP/CDP if available
    known_devices = [
        Device(id="sw-core-01", hostname="SW-CORE-01", base_mac="00:1a:2b:3c:4d:01", mgmt_ip="10.0.0.1", device_type="core-switch"),
        Device(id="sw-dist-01", hostname="SW-DIST-01", base_mac="00:1a:2b:3c:4d:02", mgmt_ip="10.0.0.2", device_type="switch"),
        Device(id="sw-dist-02", hostname="SW-DIST-02", base_mac="00:1a:2b:3c:4d:03", mgmt_ip="10.0.0.3", device_type="switch"),
        Device(id="sw-acc-01", hostname="SW-ACC-01", base_mac="00:1a:2b:3c:4d:04", mgmt_ip="10.0.0.11", device_type="switch"),
    ]

    topology = engine.infer_topology(
        neighbors=all_neighbors,
        mac_entries=all_macs,
        arp_entries=all_arps,
        stp_info=all_stps,
        known_devices=known_devices
    )

    print("\n" + "=" * 70)
    print("INFERRED TOPOLOGY SUMMARY")
    print("=" * 70)
    print(f"Devices Discovered: {len(topology.devices)}")
    for d in sorted(topology.devices, key=lambda x: (x.tier or 5, x.hostname)):
        tier_label = f"Tier {d.tier} ({d.role})" if d.tier else d.role
        print(f"  [{tier_label:<18}] {d.hostname:<25} IP: {d.mgmt_ip or 'None':<15} Vendor: {d.vendor}")

    print(f"\nLinks Inferred: {len(topology.links)}")
    for l in sorted(topology.links, key=lambda x: -x.confidence):
        pct = int(l.confidence * 100)
        status_tag = "CONFIRMED" if pct >= 80 else "INFERRED"
        sources_str = ", ".join(l.sources)
        print(f"  [{status_tag} {pct:>3}%] {l.src}:{l.src_port:<12} <---> {l.dst}:{l.dst_port:<12} ({sources_str})")

    # Output directory handling
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    drawio_file = args.drawio or str(out_dir / "topology.drawio")
    svg_file = args.svg or str(out_dir / "topology.svg")
    json_file = args.json or str(out_dir / "topology.json")

    # Generate Exporters
    export_to_drawio(topology, drawio_file)
    export_to_svg(topology, svg_file)
    with open(json_file, 'w', encoding='utf-8') as f:
        f.write(topology.model_dump_json(indent=2))

    print("\n" + "=" * 70)
    print("EXPORTS CREATED SUCCESSFULLY")
    print("=" * 70)
    print(f"  [+] Draw.io XML   : {drawio_file}")
    print(f"  [+] SVG Graphic   : {svg_file}")
    print(f"  [+] Standard JSON : {json_file}")
    print("=" * 70)


if __name__ == "__main__":
    main()
