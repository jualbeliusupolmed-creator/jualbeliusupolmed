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
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>
      {/* Background card */}
      <rect width="100" height="100" rx="28" fill={`url(#${gradId})`} />
      
      {/* Shopping bag outline & fill */}
      <path
        d="M32 46C32 42.6863 34.6863 40 38 40H62C65.3137 40 68 42.6863 68 46V72C68 76.4183 64.4183 80 60 80H40C35.5817 80 32 76.4183 32 72V46Z"
        className="fill-white/10 stroke-none"
      />
      <path
        d="M32 46C32 42.6863 34.6863 40 38 40H62C65.3137 40 68 42.6863 68 46V72C68 76.4183 64.4183 80 60 80H40C35.5817 80 32 76.4183 32 72V46Z"
        className="fill-none stroke-white"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      {/* Bag Handle */}
      <path
        d="M42 40V34C42 29.5817 45.5817 26 50 26C54.4183 26 58 29.5817 58 34V40"
        className="fill-none stroke-white"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Graduation Cap top (inside bag center) */}
      <path
        d="M50 48L64 53L50 58L36 53L50 48Z"
        className="fill-white stroke-white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M43 56V62C43 64.5 46 66 50 66C54 66 57 64.5 57 62V56"
        className="fill-none stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Cap Tassel */}
      <path
        d="M60 53.5L62 61.5"
        className="fill-none stroke-white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="62" cy="62.5" r="1.5" className="fill-white stroke-none" />
    </svg>
  );
}
