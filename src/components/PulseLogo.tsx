export function PulseLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <img
      src="/pulse-logo.png"
      alt="Picsart Academy Pulse Logo"
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
