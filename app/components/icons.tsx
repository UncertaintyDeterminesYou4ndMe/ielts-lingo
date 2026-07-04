// 轻量 SVG 图标（taste-skill 禁用 emoji）。统一 1.75 stroke，currentColor。
import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function SpeakerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
