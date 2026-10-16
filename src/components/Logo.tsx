export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#41d6b3" />
      <circle cx="32" cy="20" r="7" fill="#07110f" />
      <path d="M16 46c2-9 8-14 16-14s14 5 16 14" fill="none" stroke="#07110f" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 27v8" stroke="#07110f" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
