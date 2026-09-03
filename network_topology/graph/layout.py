"""Hierarchical layout positioning for network topology devices."""
from typing import Dict, List, Tuple
from ..models.schema import TopologyData, Device


def compute_hierarchical_layout(
    topology: TopologyData,
    canvas_width: int = 1400,
    tier_height: int = 160,
    top_margin: int = 60
) -> Dict[str, Tuple[int, int]]:
    """Compute (x, y) coordinates for each device using 5-tier network architecture.
    
    Tiers:
    - Tier 1: Firewall / Perimeter Gateway (y ~ 60)
    - Tier 2: Core Switches (y ~ 220)
    - Tier 3: Distribution Switches (y ~ 380)
    - Tier 4: Access Switches (y ~ 540)
    - Tier 5: Endpoints (Servers, Storage, APs, PCs) (y ~ 700)
    """
    tiers: Dict[int, List[Device]] = {1: [], 2: [], 3: [], 4: [], 5: []}

    for dev in topology.devices:
        t = dev.tier or 4
        if t not in tiers:
            t = 4
        tiers[t].append(dev)

    positions: Dict[str, Tuple[int, int]] = {}

    for t_num, dev_list in tiers.items():
        if not dev_list:
            continue
        y = top_margin + (t_num - 1) * tier_height
        count = len(dev_list)
        spacing = canvas_width // (count + 1)
        
        for idx, dev in enumerate(dev_list):
            x = spacing * (idx + 1)
            positions[dev.id] = (int(x), int(y))

    return positions
