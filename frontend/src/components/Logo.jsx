import { useId } from "react";

/**
 * Brand mark: two interlocking rings -- a consultant and a company -- on a
 * green tile, the gold ring being the expertise brought to the table.
 */
export default function Logo({ size = 28 }) {
  const gradId = useId();

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-500, #1f8a5b)" />
          <stop offset="1" stopColor="var(--brand-700, #0e5638)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${gradId})`} />
      <circle cx="11.5" cy="16" r="5.2" stroke="#ffffff" strokeWidth="2.6" />
      <circle cx="20.5" cy="16" r="5.2" stroke="var(--amber-400, #f2b632)" strokeWidth="2.6" />
    </svg>
  );
}
