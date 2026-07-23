const icons = {
  "core-switch": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="4"/>
    <circle cx="50" cy="50" r="25" fill="none" stroke="#f59e0b" stroke-width="6" stroke-dasharray="10 5"/>
    <path d="M50 10 L50 90 M10 50 L90 50 M25 25 L75 75 M25 75 L75 25" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="10" fill="#f59e0b"/>
  </svg>`,
  "switch": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="5" y="25" width="90" height="50" rx="6" fill="#0284c7" stroke="#bae6fd" stroke-width="3"/>
    <rect x="15" y="45" width="10" height="10" fill="#0f172a" rx="1"/>
    <rect x="30" y="45" width="10" height="10" fill="#0f172a" rx="1"/>
    <rect x="45" y="45" width="10" height="10" fill="#0f172a" rx="1"/>
    <rect x="60" y="45" width="10" height="10" fill="#0f172a" rx="1"/>
    <rect x="75" y="45" width="10" height="10" fill="#0f172a" rx="1"/>
    <circle cx="15" cy="35" r="2.5" fill="#22c55e"/>
    <circle cx="20" cy="35" r="2.5" fill="#22c55e"/>
    <circle cx="30" cy="35" r="2.5" fill="#eab308"/>
    <circle cx="45" cy="35" r="2.5" fill="#22c55e"/>
    <circle cx="60" cy="35" r="2.5" fill="#ef4444"/>
    <circle cx="75" cy="35" r="2.5" fill="#22c55e"/>
    <path d="M35 68 L45 68 M45 68 L42 65 M45 68 L42 71" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/>
    <path d="M65 68 L55 68 M55 68 L58 65 M55 68 L58 71" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  "server": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="15" y="10" width="70" height="80" rx="8" fill="#0d9488" stroke="#ccfbf1" stroke-width="3"/>
    <rect x="23" y="22" width="54" height="12" fill="#0f172a" rx="2"/>
    <rect x="23" y="44" width="54" height="12" fill="#0f172a" rx="2"/>
    <rect x="23" y="66" width="54" height="12" fill="#0f172a" rx="2"/>
    <circle cx="30" cy="28" r="2.5" fill="#22c55e"/>
    <circle cx="37" cy="28" r="2.5" fill="#22c55e"/>
    <line x1="45" y1="28" x2="68" y2="28" stroke="#0d9488" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="50" r="2.5" fill="#22c55e"/>
    <circle cx="37" cy="50" r="2.5" fill="#eab308"/>
    <line x1="45" y1="50" x2="68" y2="50" stroke="#0d9488" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="72" r="2.5" fill="#ef4444"/>
    <circle cx="37" cy="72" r="2.5" fill="#22c55e"/>
    <line x1="45" y1="72" x2="68" y2="72" stroke="#0d9488" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  "storage": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="15" y="10" width="70" height="80" rx="8" fill="#6d28d9" stroke="#ddd6fe" stroke-width="3"/>
    <rect x="22" y="20" width="56" height="16" fill="#1e1b4b" rx="2" stroke="#7c3aed" stroke-width="1.5"/>
    <rect x="22" y="42" width="56" height="16" fill="#1e1b4b" rx="2" stroke="#7c3aed" stroke-width="1.5"/>
    <rect x="22" y="64" width="56" height="16" fill="#1e1b4b" rx="2" stroke="#7c3aed" stroke-width="1.5"/>
    <rect x="26" y="23" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="36" y="23" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="46" y="23" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="56" y="23" width="7" height="10" fill="#a78bfa" rx="1"/>
    <circle cx="68" cy="28" r="2" fill="#22c55e"/>
    <rect x="26" y="45" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="36" y="45" width="7" height="10" fill="#ef4444" rx="1"/>
    <rect x="46" y="45" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="56" y="45" width="7" height="10" fill="#a78bfa" rx="1"/>
    <circle cx="68" cy="50" r="2" fill="#eab308"/>
    <rect x="26" y="67" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="36" y="67" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="46" y="67" width="7" height="10" fill="#a78bfa" rx="1"/>
    <rect x="56" y="67" width="7" height="10" fill="#a78bfa" rx="1"/>
    <circle cx="68" cy="72" r="2" fill="#22c55e"/>
  </svg>`,
  "firewall": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M50 8 L85 22 L85 55 C85 75 70 88 50 92 C30 88 15 75 15 55 L15 22 Z" fill="#be123c" stroke="#fecdd3" stroke-width="3"/>
    <rect x="30" y="28" width="18" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="52" y="28" width="18" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="22" y="41" width="12" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="38" y="41" width="24" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="66" y="41" width="12" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="26" y="54" width="22" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="52" y="54" width="22" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <rect x="35" y="67" width="30" height="10" fill="#fda4af" stroke="#be123c" stroke-width="1.5" rx="1"/>
    <path d="M50 20 L50 24 M50 78 L50 82 M25 50 L29 50 M71 50 L75 50" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};

export function getIconDataUrl(type) {
  const svg = icons[type] || icons["switch"];
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
