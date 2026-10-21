/**
 * Hero illustration: consultants (left) and organisations (right) linked
 * through the platform hub in the middle by animated dashed lines. Pure
 * inline SVG + CSS animations (see .match-scene rules in index.css).
 */
const LEFT = [
  { y: 70, label: "Finance" },
  { y: 140, label: "Digital" },
  { y: 210, label: "Suivi-eval." },
];
const RIGHT = [
  { y: 70, label: "PME" },
  { y: 140, label: "ONG" },
  { y: 210, label: "Institution" },
];

const LABEL_FONT = "Plus Jakarta Sans, sans-serif";

function Person({ x, y, cls }) {
  return (
    <g className={`ms-node ${cls}`}>
      <circle cx={x} cy={y} r="24" fill="#ffffff" stroke="#b4dcc7" strokeWidth="2" />
      <circle cx={x} cy={y - 6} r="7" fill="#157049" />
      <path d={`M${x - 12},${y + 14} q12,-16 24,0`} fill="#157049" />
    </g>
  );
}

function Building({ x, y, cls }) {
  return (
    <g className={`ms-node ${cls}`}>
      <circle cx={x} cy={y} r="24" fill="#ffffff" stroke="#f2d9a0" strokeWidth="2" />
      <rect x={x - 10} y={y - 12} width="20" height="24" rx="2" fill="#e09b12" />
      {[-6, 0, 6].map((dy) => (
        <g key={dy}>
          <rect x={x - 6} y={y + dy - 4} width="4" height="3" fill="#fff" />
          <rect x={x + 2} y={y + dy - 4} width="4" height="3" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

export default function MatchScene() {
  return (
    <svg
      className="match-scene"
      viewBox="0 0 800 280"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration : des consultants et des organisations relies par la plateforme"
    >
      <defs>
        <linearGradient id="ms-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0f7f3" />
          <stop offset="1" stopColor="#fdf6e6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="280" rx="24" fill="url(#ms-bg)" />

      {LEFT.map((n) => (
        <path
          key={`l${n.y}`}
          className="ms-link"
          d={`M200,${n.y} C300,${n.y} 320,140 400,140`}
          stroke="#1f8a5b"
          strokeWidth="2.4"
          fill="none"
        />
      ))}
      {RIGHT.map((n) => (
        <path
          key={`r${n.y}`}
          className="ms-link"
          d={`M400,140 C480,140 500,${n.y} 600,${n.y}`}
          stroke="#e09b12"
          strokeWidth="2.4"
          fill="none"
        />
      ))}

      {LEFT.map((n, i) => (
        <g key={n.label}>
          <Person x={176} y={n.y} cls={`n${i + 1}`} />
          <text x={140} y={n.y + 5} textAnchor="end" fontSize="14" fontWeight="600" fill="#3b524b" fontFamily={LABEL_FONT}>
            {n.label}
          </text>
        </g>
      ))}
      {RIGHT.map((n, i) => (
        <g key={n.label}>
          <Building x={624} y={n.y} cls={`n${i + 2}`} />
          <text x={660} y={n.y + 5} fontSize="14" fontWeight="600" fill="#3b524b" fontFamily={LABEL_FONT}>
            {n.label}
          </text>
        </g>
      ))}

      <circle className="ms-pulse" cx="400" cy="140" r="34" fill="#1f8a5b" opacity="0.25" />
      <circle cx="400" cy="140" r="34" fill="#157049" />
      <circle cx="390" cy="140" r="11" stroke="#fff" strokeWidth="3.4" fill="none" />
      <circle cx="410" cy="140" r="11" stroke="#f2b632" strokeWidth="3.4" fill="none" />
      <text x="400" y="200" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0e5638" fontFamily="Sora, sans-serif">
        Matching + validation
      </text>
    </svg>
  );
}
