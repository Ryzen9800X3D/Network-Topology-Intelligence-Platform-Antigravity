"""Export network topology to clean SVG vector graphics."""
import html
from typing import Dict, Tuple
from ..models.schema import TopologyData
from .layout import compute_hierarchical_layout


SVG_COLORS = {
    "firewall": {"fill": "#ffe4e6", "stroke": "#e11d48", "text": "#881337"},
    "core": {"fill": "#fef3c7", "stroke": "#d97706", "text": "#78350f"},
    "distribution": {"fill": "#e0f2fe", "stroke": "#0284c7", "text": "#0369a1"},
    "access": {"fill": "#f1f5f9", "stroke": "#475569", "text": "#1e293b"},
    "server": {"fill": "#ccfbf1", "stroke": "#0d9488", "text": "#134e4a"},
    "storage": {"fill": "#f3e8ff", "stroke": "#9333ea", "text": "#581c87"},
    "ap": {"fill": "#ecfdf5", "stroke": "#059669", "text": "#064e3b"},
    "endpoint": {"fill": "#f8fafc", "stroke": "#64748b", "text": "#334155"},
}


def export_to_svg(topology: TopologyData, output_file: str = None) -> str:
    """Generate SVG document representing the inferred topology."""
    canvas_w, canvas_h = 1400, 850
    positions = compute_hierarchical_layout(topology, canvas_width=canvas_w)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_w} {canvas_h}" width="{canvas_w}" height="{canvas_h}">',
        '  <defs>',
        '    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">',
        '      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.15"/>',
        '    </filter>',
        '  </defs>',
        '  <!-- Background -->',
        f'  <rect width="{canvas_w}" height="{canvas_h}" fill="#f8fafc"/>',
        '  <!-- Title & Legend -->',
        '  <text x="30" y="35" font-family="Segoe UI, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Network Topology Diagram</text>',
        '  <g transform="translate(1000, 20)">',
        '    <line x1="0" y1="10" x2="30" y2="10" stroke="#0284c7" stroke-width="3"/>',
        '    <text x="35" y="14" font-family="sans-serif" font-size="11" fill="#475569">Confirmed (≥80%)</text>',
        '    <line x1="160" y1="10" x2="190" y2="10" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,4"/>',
        '    <text x="195" y="14" font-family="sans-serif" font-size="11" fill="#475569">Inferred (60-79%)</text>',
        '    <line x1="320" y1="10" x2="350" y2="10" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,3"/>',
        '    <text x="355" y="14" font-family="sans-serif" font-size="11" fill="#475569">Low/Conflict (&lt;60%)</text>',
        '  </g>',
        '  <!-- Edges -->',
    ]

    # Draw Edges first so nodes sit on top
    for link in topology.links:
        pos_src = positions.get(link.src, (200, 200))
        pos_dst = positions.get(link.dst, (200, 400))

        if link.confidence >= 0.80:
            stroke, stroke_w, dash = "#0284c7", "2.5", ""
        elif link.confidence >= 0.60:
            stroke, stroke_w, dash = "#f59e0b", "2", 'stroke-dasharray="6,4"'
        else:
            stroke, stroke_w, dash = "#ef4444", "1.5", 'stroke-dasharray="3,3"'

        svg_parts.append(
            f'  <line x1="{pos_src[0]}" y1="{pos_src[1]}" x2="{pos_dst[0]}" y2="{pos_dst[1]}" '
            f'stroke="{stroke}" stroke-width="{stroke_w}" {dash}/>'
        )

        # Port labels in center
        mid_x = (pos_src[0] + pos_dst[0]) / 2
        mid_y = (pos_src[1] + pos_dst[1]) / 2
        label = f"{link.src_port} ➔ {link.dst_port}"
        svg_parts.append(
            f'  <rect x="{mid_x - 45}" y="{mid_y - 8}" width="90" height="16" fill="#ffffff" rx="3" stroke="#e2e8f0"/>'
        )
        svg_parts.append(
            f'  <text x="{mid_x}" y="{mid_y + 4}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#475569">{html.escape(label)}</text>'
        )

    # Draw Nodes
    svg_parts.append('  <!-- Nodes -->')
    box_w, box_h = 140, 56
    for dev in topology.devices:
        pos = positions.get(dev.id, (200, 200))
        x, y = pos[0] - box_w // 2, pos[1] - box_h // 2
        role_key = (dev.role or dev.device_type or "access").lower()
        colors = SVG_COLORS.get(role_key, SVG_COLORS["access"])

        svg_parts.append(
            f'  <g filter="url(#shadow)" transform="translate({x}, {y})">'
        )
        svg_parts.append(
            f'    <rect width="{box_w}" height="{box_h}" rx="8" fill="{colors["fill"]}" stroke="{colors["stroke"]}" stroke-width="2"/>'
        )
        svg_parts.append(
            f'    <text x="{box_w // 2}" y="24" font-family="Segoe UI, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="{colors["text"]}">{html.escape(dev.hostname)}</text>'
        )
        sub_text = dev.mgmt_ip or (dev.role or dev.device_type)
        svg_parts.append(
            f'    <text x="{box_w // 2}" y="42" font-family="Segoe UI, sans-serif" font-size="10" text-anchor="middle" fill="#64748b">{html.escape(sub_text)}</text>'
        )
        svg_parts.append('  </g>')

    svg_parts.append('</svg>')
    result_svg = "\n".join(svg_parts)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result_svg)

    return result_svg
