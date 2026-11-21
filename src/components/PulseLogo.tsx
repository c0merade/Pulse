export function PulseLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Picsart Academy Pulse Logo"
    >
      {/* Left face — Picsart Academy mint-cyan (#71FEEA) with soft rounded outer corners */}
      <path
        d="M47 13.5 L16.5 21.8 C12.5 22.9 10 26.5 10 30.6 V67.4 C10 71.5 12.5 75.1 16.5 76.2 L47 67.8 V13.5 Z"
        fill="#71FEEA"
      />
      {/* Right face — Picsart Academy magenta (#D300C6) with soft rounded outer corners */}
      <path
        d="M47 13.5 L83.5 22.8 C87.5 23.8 90 27.4 90 31.5 V67.4 C90 71.5 87.5 75.1 83.5 76.1 L47 67.8 V13.5 Z"
        fill="#D300C6"
      />
      {/* Bottom face — deep obsidian black (#07060D) */}
      <path
        d="M15.5 75.9 L46.2 86.2 C48.4 86.9 50.8 86.9 53 86.2 L84.5 75.9 L47 67.4 L15.5 75.9 Z"
        fill="#07060D"
      />
      {/* Subtle tilted white Picsart Academy wordmark on right face */}
      <g transform="translate(50.5, 55.5) skewY(13)">
        <text
          x="0"
          y="0"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="7.4"
          fontWeight="800"
          letterSpacing="-0.2"
        >
          Picsart
        </text>
        <text
          x="0"
          y="7.6"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="7.4"
          fontWeight="700"
          letterSpacing="-0.2"
        >
          Academy
        </text>
      </g>
    </svg>
  );
}
