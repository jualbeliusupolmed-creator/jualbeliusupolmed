import { useId } from "react";

export default function Logo({ className = "h-9 w-9", src }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Logo"
        className={`${className} object-contain`}
      />
    );
  }
  const id = useId();
  const gradId = "logo-grad-" + id.replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <linearGradient id={`${gradId}-premium`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <filter id={`${gradId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#10b981" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Base Card */}
      <rect width="100" height="100" rx="24" fill={`url(#${gradId})`} />

      {/* Inner premium glass border */}
      <rect width="98" height="98" x="1" y="1" rx="23" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="2" />

      {/* Glowing 'M' Logo */}
      <path
        d="M 26 68 L 26 40 L 50 58 L 74 40 L 74 68"
        stroke={`url(#${gradId}-premium)`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${gradId}-shadow)`}
      />
      
      {/* Accent Dot */}
      <circle cx="50" cy="26" r="4.5" fill="#34d399" filter={`url(#${gradId}-shadow)`} />
    </svg>
  );
}
