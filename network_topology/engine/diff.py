"""Topology snapshot diff comparison engine."""
from typing import Dict, List, Set, Tuple, Any
from ..models.schema import TopologyData, TopologyDiff, Device, Link


def compare_topologies(old_topo: TopologyData, new_topo: TopologyData) -> TopologyDiff:
    """Compare two network topology snapshots and identify additions, removals, and changes."""
    old_dev_map: Dict[str, Device] = {d.id: d for d in old_topo.devices}
    new_dev_map: Dict[str, Device] = {d.id: d for d in new_topo.devices}

    # Added & Removed Devices
    added_devices: List[Device] = [d for d_id, d in new_dev_map.items() if d_id not in old_dev_map]
    removed_devices: List[Device] = [d for d_id, d in old_dev_map.items() if d_id not in new_dev_map]

    # Helper for link key
    def link_key(l: Link) -> Tuple[str, str]:
        return tuple(sorted([l.src, l.dst]))

    def link_full_key(l: Link) -> Tuple[str, str, str, str]:
        if l.src < l.dst:
            return (l.src, l.src_port, l.dst, l.dst_port)
        return (l.dst, l.dst_port, l.src, l.src_port)

    old_links_map = {link_full_key(l): l for l in old_topo.links}
    new_links_map = {link_full_key(l): l for l in new_topo.links}

    old_pair_map = {link_key(l): l for l in old_topo.links}
    new_pair_map = {link_key(l): l for l in new_topo.links}

    added_links: List[Link] = []
    removed_links: List[Link] = []
    changed_links: List[Dict[str, Any]] = []

    for k, nl in new_links_map.items():
        if k not in old_links_map:
            # Check if link exists between same devices but ports changed
            pair = link_key(nl)
            if pair in old_pair_map:
                ol = old_pair_map[pair]
                changed_links.append({
                    "devices": f"{nl.src} <-> {nl.dst}",
                    "change_type": "PORT_MODIFIED",
                    "before": f"{ol.src}:{ol.src_port} <-> {ol.dst}:{ol.dst_port}",
                    "after": f"{nl.src}:{nl.src_port} <-> {nl.dst}:{nl.dst_port}",
                    "confidence": nl.confidence
                })
            else:
                added_links.append(nl)

    for k, ol in old_links_map.items():
        pair = link_key(ol)
        if k not in new_links_map and pair not in new_pair_map:
            removed_links.append(ol)

    # Generate changelog summary
    summary_lines = []
    summary_lines.append(f"Topology Diff: +{len(added_devices)}/-{len(removed_devices)} Devices, +{len(added_links)}/-{len(removed_links)} Links, {len(changed_links)} Changed")
    for d in added_devices:
        summary_lines.append(f"  [+] Device Added: {d.hostname} ({d.device_type}, IP: {d.mgmt_ip or 'N/A'})")
    for d in removed_devices:
        summary_lines.append(f"  [-] Device Removed: {d.hostname} ({d.device_type})")
    for l in added_links:
        summary_lines.append(f"  [+] Link Added: {l.src}:{l.src_port} <-> {l.dst}:{l.dst_port} (Confidence: {int(l.confidence*100)}%)")
    for l in removed_links:
        summary_lines.append(f"  [-] Link Removed: {l.src}:{l.src_port} <-> {l.dst}:{l.dst_port}")
    for c in changed_links:
        summary_lines.append(f"  [~] Link Changed: {c['devices']} ({c['before']} -> {c['after']})")

    return TopologyDiff(
        added_devices=added_devices,
        removed_devices=removed_devices,
        added_links=added_links,
        removed_links=removed_links,
        changed_links=changed_links,
        summary="\n".join(summary_lines)
    )
