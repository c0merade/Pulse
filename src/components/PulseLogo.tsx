export function PulseLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Picsart Academy Pulse Logo"
    >
      {/* Left face — bright turquoise/cyan */}
      <path
        d="M32 6L10 17.5C8.8 18.1 8 19.3 8 20.7V43.3C8 44.7 8.8 45.9 10 46.5L32 35V6Z"
        fill="#55FFF0"
      />
      {/* Right face — vibrant magenta */}
      <path
        d="M32 6L54 17.5C55.2 18.1 56 19.3 56 20.7V43.3C56 44.7 55.2 45.9 54 46.5L32 35V6Z"
        fill="#E000DF"
      />
      {/* Bottom face — deep black */}
      <path
        d="M10 46.5L30.2 57.1C31.3 57.7 32.7 57.7 33.8 57.1L54 46.5L32 35L10 46.5Z"
        fill="#09090B"
      />
      {/* Subtle outer edge for visibility on dark surfaces */}
      <path
        d="M32 6L10 17.5C8.8 18.1 8 19.3 8 20.7V43.3C8 44.7 8.8 45.9 10 46.5L30.2 57.1C31.3 57.7 32.7 57.7 33.8 57.1L54 46.5C55.2 45.9 56 44.7 56 43.3V20.7C56 19.3 55.2 18.1 54 17.5L32 6Z"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
