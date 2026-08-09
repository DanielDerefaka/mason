import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (viewBox: string) =>
  ({
    viewBox,
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
  }) as const;

/* ------------------------------------------------------------------ *
 * Brand
 * ------------------------------------------------------------------ */

/**
 * The app mark — a downward chevron whose top edge dips to a centre peak,
 * with the left arm slightly heavier than the right.
 */
export function LogoMark({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M1.6 2.6h7.2L12 11.4l3.2-8.8h7.2L12 21.4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Service card icons — paths lifted verbatim from the reference.
 * ------------------------------------------------------------------ */

/** Globe with "www" — Crafted Websites. */
export function GlobeWwwIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("4.047 4 39.906 40")} className={className} {...props}>
      <path d="M24 4c-.07 0-.15 0-.22.01-2.3.26-4.72 4.56-5.96 10.99h12.36c-1.24-6.43-3.66-10.73-5.96-10.99C24.15 4 24.07 4 24 4m-5.7.83C12.98 6.4 8.59 10.13 6.14 15h8.63c.7-4 1.89-7.62 3.53-10.17m11.4 0C31.34 7.38 32.53 11 33.23 15h8.63c-2.45-4.87-6.84-8.6-12.16-10.17M14.638 18.027a1.25 1.25 0 0 0-1.174 1.077l-.822 5.158-1.497-3.457a1.25 1.25 0 0 0-2.292 0l-1.497 3.457-.822-5.158a1.25 1.25 0 0 0-1.205-1.07 1.25 1.25 0 0 0-1.264 1.462l1.5 9.4a1.25 1.25 0 0 0 2.381.3L10 24.446l2.053 4.748a1.25 1.25 0 0 0 2.38-.299l1.5-9.4a1.25 1.25 0 0 0-1.294-1.469m14 0a1.25 1.25 0 0 0-1.174 1.077l-.822 5.158-1.497-3.457a1.25 1.25 0 0 0-2.292 0l-1.497 3.457-.822-5.158a1.25 1.25 0 0 0-1.205-1.07 1.25 1.25 0 0 0-1.264 1.462l1.5 9.4a1.25 1.25 0 0 0 2.381.3L24 24.446l2.053 4.748a1.25 1.25 0 0 0 2.38-.299l1.5-9.4a1.25 1.25 0 0 0-1.294-1.469m14 0a1.25 1.25 0 0 0-1.174 1.077l-.822 5.158-1.497-3.457a1.25 1.25 0 0 0-2.292 0l-1.497 3.457-.822-5.158a1.25 1.25 0 0 0-1.205-1.07 1.25 1.25 0 0 0-1.264 1.462l1.5 9.4a1.25 1.25 0 0 0 2.381.3L38 24.446l2.053 4.748a1.25 1.25 0 0 0 2.38-.299l1.5-9.4a1.25 1.25 0 0 0-1.294-1.469M6.14 33c2.45 4.87 6.84 8.6 12.16 10.17C16.66 40.62 15.47 37 14.77 33zm11.68 0c1.24 6.43 3.658 10.73 5.958 10.99.07.01.151.01.221.01s.15 0 .22-.01c2.3-.26 4.72-4.56 5.96-10.99zm15.41 0c-.7 4-1.892 7.62-3.532 10.17 5.32-1.57 9.71-5.3 12.16-10.17z" />
    </svg>
  );
}

/** Pencil in a square — Website Redesign. */
export function EditSquareIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("2.25 2.258 19.502 19.502")} className={className} {...props}>
      <path d="M20.94 3.06a2.76 2.76 0 0 0-3.89 0l-.83.83.53.63 2.78 2.78.52.54.9-.9a2.76 2.76 0 0 0 0-3.89Z" />
      <path d="m15.64 5.53-.48-.58-4.88 4.88c-.33.33-.51.77-.51 1.24v2.41c0 .41.34.75.75.75h2.41c.47 0 .91-.18 1.24-.51l4.82-4.82-.53-.56-2.81-2.81Z" />
      <path d="M12.93 15.74h-2.41c-1.24 0-2.25-1.01-2.25-2.25v-2.41c0-.87.34-1.69.95-2.3l3.52-3.52H6c-2.07 0-3.75 1.68-3.75 3.75v9c0 2.07 1.68 3.75 3.75 3.75h9c2.07 0 3.75-1.68 3.75-3.75v-6.74l-3.52 3.52c-.61.61-1.43.95-2.3.95" />
    </svg>
  );
}

/** Shopping cart — eCommerce Website Design. */
export function CartIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M2 3a1 1 0 0 0 0 2h1.28l.7 2.8 1.86 7.44A2.5 2.5 0 0 0 8.27 17H18a1 1 0 1 0 0-2H8.27a.5.5 0 0 1-.49-.38L7.53 13.6h10.6a2 2 0 0 0 1.94-1.5l1.36-5.35A1 1 0 0 0 20.46 5.5H5.84l-.42-1.67A1 1 0 0 0 4.45 3z" />
      <circle cx="8.5" cy="20" r="1.75" />
      <circle cx="17.5" cy="20" r="1.75" />
    </svg>
  );
}

/** Three stacked bars — CMS & Dynamic Websites. */
export function StackedBarsIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("7 9 34 30")} className={className} {...props}>
      <path d="M39.5 28h-31A1.5 1.5 0 0 1 7 26.5v-5A1.5 1.5 0 0 1 8.5 20h31a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5m0-11h-31A1.5 1.5 0 0 1 7 15.5v-5A1.5 1.5 0 0 1 8.5 9h31a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5m0 22h-31A1.5 1.5 0 0 1 7 37.5v-5A1.5 1.5 0 0 1 8.5 31h31a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5" />
    </svg>
  );
}

/** Paper plane — Landing Pages & Microsites. */
export function PaperPlaneIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("2.477 3.41 19.047 17.18")} className={className} {...props}>
      <path d="M21.524 3.91v14.488a.5.5 0 0 1-.686.464l-9.314-3.725 8.337-10.19c.076-.093-.049-.217-.142-.14l-11.195 9.33-5.685-1.625a.5.5 0 0 1-.068-.936l18.048-8.122a.5.5 0 0 1 .705.456m-11.26 16.318a.5.5 0 0 0 .865.182l2.347-2.815-4.462-1.744z" />
    </svg>
  );
}

/** Puzzle piece — Consistent Identity. */
export function PuzzleIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("5 2 20 24")} className={className} {...props}>
      <path d="M14.986 2A3 3 0 0 0 12 5c0 .935.432 1.653.893 2.357.426.65-.11 1.503-.881 1.407a83 83 0 0 1-4.586-.72l-.002.003A2 2 0 0 0 7 8a2 2 0 0 0-2 2v4.826c0 .91 1.006 1.476 1.771.983.733-.473 1.496-.888 2.512-.795 1.255.114 2.355 1.049 2.637 2.277A3.006 3.006 0 0 1 9 21c-.87 0-1.553-.375-2.21-.799-.774-.498-1.79.05-1.79.969v2.396C5 25.108 5.895 26 7 26h16a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2 2 2 0 0 0-.422.047l-.004-.002s-2.307.437-4.586.719c-.774.096-1.305-.76-.877-1.412.507-.774.977-1.569.875-2.647-.118-1.25-1.053-2.345-2.277-2.625a3.2 3.2 0 0 0-.723-.08" />
    </svg>
  );
}

/** Lightning bolt — Motion & Interaction Design. */
export function BoltIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M13.9 2.1a.6.6 0 0 1 1.06.5l-1.4 6.2h4.63a.7.7 0 0 1 .55 1.13l-8.64 12a.6.6 0 0 1-1.06-.5l1.4-6.23H5.81a.7.7 0 0 1-.55-1.13z" />
    </svg>
  );
}

/** Navigation arrow — UX Centric Strategy. */
export function NavigationIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("20.009 20.009 159.982 159.982")} className={className} {...props}>
      <path d="M20.009 91.815l159.982-71.806-71.806 159.982-23.718-66.636-64.458-21.54z" />
    </svg>
  );
}

/** Rocket — Performance Optimization. */
export function RocketIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M14.1 3.4C16.2 1.6 18.8.8 21.4 1a1.3 1.3 0 0 1 1.2 1.2c.2 2.6-.6 5.2-2.4 7.3l-1.6 1.9v5.2a1.3 1.3 0 0 1-.5 1l-3.4 2.6a1 1 0 0 1-1.6-.6l-.6-3.6-3.3-3.3-3.6-.6a1 1 0 0 1-.6-1.6l2.6-3.4a1.3 1.3 0 0 1 1-.5h5.2zm2.3 5.1a1.9 1.9 0 1 0 2.7-2.7 1.9 1.9 0 0 0-2.7 2.7" />
      <path d="M6.3 16.4c-1.4 1.4-1.9 5.2-1.9 5.2s3.8-.5 5.2-1.9a2.35 2.35 0 0 0-3.3-3.3" />
    </svg>
  );
}

/** Wrench & screwdriver — Maintenance & Ongoing Support. */
export function ToolsIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("2 3 25.999 24.002")} className={className} {...props}>
      <path d="M4 3 2 5l2 4 3 1 3.5 3.5 2-2L9 8 8 5zm18.066.01a6.15 6.15 0 0 0-4.603 1.799c-1.636 1.636-1.783 3.603-.969 5.455L4.88 21.879a3 3 0 0 0 0 4.242 3 3 0 0 0 4.242 0l11.615-11.615c1.851.813 3.82.666 5.455-.97a6.16 6.16 0 0 0 1.512-6.24l-3.705 3.708-3.201-.8-.8-3.202 3.706-3.705a6.2 6.2 0 0 0-1.637-.287m-1.545 14.627L16.758 21.4l4.818 4.82a2.662 2.662 0 1 0 3.766-3.765zM7 23a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * UI
 * ------------------------------------------------------------------ */

export function ArrowRightIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function MenuIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Social
 * ------------------------------------------------------------------ */

export function InstagramIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16m0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32m0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4m5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0" />
    </svg>
  );
}

export function FacebookIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.89 3.77-3.89 1.1 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12" />
    </svg>
  );
}

export function TwitterIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M22 5.92a8.2 8.2 0 0 1-2.36.65 4.12 4.12 0 0 0 1.8-2.27 8.2 8.2 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.74A11.65 11.65 0 0 1 3.4 4.75a4.1 4.1 0 0 0 1.27 5.48 4.1 4.1 0 0 1-1.86-.52v.05a4.1 4.1 0 0 0 3.29 4.02 4.1 4.1 0 0 1-1.85.07 4.1 4.1 0 0 0 3.83 2.85A8.24 8.24 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.25 11.68-11.67l-.01-.53A8.3 8.3 0 0 0 22 5.92" />
    </svg>
  );
}

export function LinkedInIcon({ className, ...props }: IconProps) {
  return (
    <svg {...base("0 0 24 24")} className={className} {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14m1.78 13.02H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0" />
    </svg>
  );
}
