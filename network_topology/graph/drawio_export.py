"""Export network topology to native Draw.io XML (.drawio) format."""
import xml.sax.saxutils as saxutils
from typing import Dict, Tuple
from ..models.schema import TopologyData
from .layout import compute_hierarchical_layout


# Color schemes matching NOC theme
ROLE_STYLES = {
    "firewall": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe4e6;strokeColor=#e11d48;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#881337;",
    "core": "rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#d97706;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#78350f;",
    "distribution": "rounded=1;whiteSpace=wrap;html=1;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#0369a1;",
    "access": "rounded=1;whiteSpace=wrap;html=1;fillColor=#f1f5f9;strokeColor=#475569;strokeWidth=1.5;fontSize=11;fontColor=#1e293b;",
    "server": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0d9488;strokeWidth=1.5;fontSize=11;fontColor=#134e4a;",
    "storage": "rounded=1;whiteSpace=wrap;html=1;fillColor=#f3e8ff;strokeColor=#9333ea;strokeWidth=1.5;fontSize=11;fontColor=#581c87;",
    "ap": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#059669;strokeWidth=1.5;fontSize=11;fontColor=#064e3b;",
    "endpoint": "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=1;fontSize=10;fontColor=#334155;",
}


def export_to_drawio(topology: TopologyData, output_file: str = None) -> str:
    """Generate Draw.io mxGraphModel XML from TopologyData."""
    positions = compute_hierarchical_layout(topology)

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<mxfile host="Electron" agent="NTIP-Topology-Engine" version="21.0.0" type="device">',
        '  <diagram id="ntip-network-topology" name="Network Architecture">',
        '    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1920" pageHeight="1080" math="0" shadow="1">',
        '      <root>',
        '        <mxCell id="0" />',
        '        <mxCell id="1" parent="0" />',
    ]

    # Add Device Nodes
    node_w, node_h = 150, 60
    for dev in topology.devices:
        pos = positions.get(dev.id, (200, 200))
        x, y = pos[0] - node_w // 2, pos[1] - node_h // 2

        role_key = (dev.role or dev.device_type or "access").lower()
        style = ROLE_STYLES.get(role_key, ROLE_STYLES["access"])

        # Label: Hostname + IP / Model
        label_lines = [f"<b>{saxutils.escape(dev.hostname)}</b>"]
        if dev.mgmt_ip:
            label_lines.append(f"<span style='font-size:10px;color:#64748b;'>{saxutils.escape(dev.mgmt_ip)}</span>")
        if dev.model:
            label_lines.append(f"<span style='font-size:9px;color:#94a3b8;'>({saxutils.escape(dev.model[:20])})</span>")
        
        raw_html = "<br>".join(label_lines)
        value = saxutils.escape(raw_html)
        dev_cell_id = f"node_{dev.id}"

        xml_lines.append(
            f'        <mxCell id="{dev_cell_id}" value="{value}" style="{style}" vertex="1" parent="1">'
        )
        xml_lines.append(
            f'          <mxGeometry x="{x}" y="{y}" width="{node_w}" height="{node_h}" as="geometry" />'
        )
        xml_lines.append('        </mxCell>')

    # Add Edge Links
    for idx, link in enumerate(topology.links):
        src_cell = f"node_{link.src}"
        dst_cell = f"node_{link.dst}"
        edge_id = f"edge_{idx}"

        # Edge label with interface ports
        label_parts = []
        if link.src_port or link.dst_port:
            label_parts.append(f"{link.src_port} &#x2794; {link.dst_port}")
        if link.confidence < 1.0:
            label_parts.append(f"({int(link.confidence * 100)}%)")
        edge_label = saxutils.escape(" ".join(label_parts))

        # Confidence based line styling
        if link.confidence >= 0.80:
            # Solid bold high-confidence link
            stroke_style = "strokeColor=#0284c7;strokeWidth=2.5;"
        elif link.confidence >= 0.60:
            # Dashed inferred link
            stroke_style = "strokeColor=#f59e0b;strokeWidth=2;dashed=1;"
        else:
            # Dotted/red low-confidence link
            stroke_style = "strokeColor=#ef4444;strokeWidth=1.5;dashed=1;"

        edge_style = (
            f"edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
            f"{stroke_style}fontSize=9;fontColor=#475569;labelBackgroundColor=#ffffff;"
        )

        xml_lines.append(
            f'        <mxCell id="{edge_id}" value="{edge_label}" style="{edge_style}" edge="1" parent="1" source="{src_cell}" target="{dst_cell}">'
        )
        xml_lines.append('          <mxGeometry relative="1" as="geometry" />')
        xml_lines.append('        </mxCell>')

    xml_lines.extend([
        '      </root>',
        '    </mxGraphModel>',
        '  </diagram>',
        '</mxfile>'
    ])

    result_xml = "\n".join(xml_lines)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result_xml)

    return result_xml
