export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.77 6.17-.15 1.4-.7 2.63-1.5 3.6a.5.5 0 0 0 .5.73c1.8-.3 3.4-1.05 4.68-2.1A11.2 11.2 0 0 0 12 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" />
    </svg>
  );
}

/** Outline icons (24px grid, 1.8 stroke) used on the profile pages. */
function Outline({ size = 18, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const BriefcaseIcon = (p) => (
  <Outline {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </Outline>
);

export const GraduationIcon = (p) => (
  <Outline {...p}>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v5" />
  </Outline>
);

export const AwardIcon = (p) => (
  <Outline {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
  </Outline>
);

export const PinIcon = (p) => (
  <Outline {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Outline>
);

export const ClockIcon = (p) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Outline>
);

export const LanguageIcon = (p) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Outline>
);

export const FileIcon = (p) => (
  <Outline {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Outline>
);

export const LockIcon = (p) => (
  <Outline {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Outline>
);

export const CheckIcon = (p) => (
  <Outline {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Outline>
);

export const UserIcon = (p) => (
  <Outline {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Outline>
);
