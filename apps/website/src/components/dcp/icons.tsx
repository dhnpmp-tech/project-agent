// DCP Design Kit — line icons. Pure SVG, currentColor for stroke/fill.
// Ported from /tmp/dcp-design/assets/dcp-kit.jsx (ICONS section).

import type { ReactNode } from "react";

interface IconProps {
  size?: number;
}

interface IconBaseProps extends IconProps {
  d?: string;
  fill?: boolean;
  children?: ReactNode;
}

function IconBase({ size = 14, d, fill = false, children }: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d ? <path d={d} /> : null}
      {children}
    </svg>
  );
}

export const Arrow = ({ size = 14, dir = "right" }: IconProps & { dir?: "left" | "right" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    style={{ transform: dir === "left" ? "scaleX(-1)" : undefined }}
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const Check = ({ size = 14 }: IconProps) => <IconBase size={size} d="M5 13l4 4L19 7" />;
export const Play = ({ size = 12 }: IconProps) => <IconBase size={size} d="M7 5v14l12-7z" fill />;
export const Stop = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x={6} y={6} width={12} height={12} />
  </svg>
);
export const Close = ({ size = 14 }: IconProps) => <IconBase size={size} d="M6 6l12 12M18 6L6 18" />;
export const Search = ({ size = 14 }: IconProps) => (
  <IconBase size={size}>
    <circle cx={11} cy={11} r={6} />
    <path d="M20 20l-4-4" />
  </IconBase>
);
export const Menu = ({ size = 16 }: IconProps) => (
  <IconBase size={size} d="M4 7h16M4 12h16M4 17h16" />
);
export const Plus = ({ size = 14 }: IconProps) => <IconBase size={size} d="M12 5v14M5 12h14" />;
export const Minus = ({ size = 14 }: IconProps) => <IconBase size={size} d="M5 12h14" />;
export const ChevronDown = ({ size = 14 }: IconProps) => <IconBase size={size} d="M6 9l6 6 6-6" />;
export const Copy = ({ size = 14 }: IconProps) => (
  <IconBase size={size}>
    <rect x={8} y={8} width={12} height={12} rx={1} />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </IconBase>
);
export const External = ({ size = 12 }: IconProps) => (
  <IconBase size={size} d="M7 17L17 7M9 7h8v8" />
);
export const Download = ({ size = 14 }: IconProps) => (
  <IconBase size={size} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
);
export const Upload = ({ size = 14 }: IconProps) => (
  <IconBase size={size} d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" />
);
export const Shield = ({ size = 14 }: IconProps) => (
  <IconBase size={size} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
);
export const Lock = ({ size = 14 }: IconProps) => (
  <IconBase size={size}>
    <rect x={5} y={11} width={14} height={10} rx={1} />
    <path d="M8 11V7a4 4 0 1 1 8 0v4" />
  </IconBase>
);
export const Key = ({ size = 14 }: IconProps) => (
  <IconBase size={size}>
    <circle cx={8} cy={15} r={4} />
    <path d="M11 12l10-10M17 6l3 3M14 9l3 3" />
  </IconBase>
);
export const Zap = ({ size = 14 }: IconProps) => (
  <IconBase size={size} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
);
export const Cpu = ({ size = 14 }: IconProps) => (
  <IconBase size={size}>
    <rect x={5} y={5} width={14} height={14} rx={1} />
    <rect x={9} y={9} width={6} height={6} />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </IconBase>
);
export const Cloud = ({ size = 14 }: IconProps) => (
  <IconBase size={size} d="M6 18a4 4 0 1 1 1-7.9A5 5 0 0 1 17 11a3.5 3.5 0 0 1 0 7H6z" />
);
export const Dot = ({ size = 6, color = "currentColor" }: IconProps & { color?: string }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
    }}
  />
);
