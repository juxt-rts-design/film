import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 11.5L12 5l8 6.5" />
      <path d="M6 10.5V19h12v-8.5" />
    </Svg>
  );
}

export function IconFilms({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16v10H4z" />
      <path d="M8 7v10M12 7v10M16 7v10" />
      <path d="M4 11h16M4 13h16" />
    </Svg>
  );
}

export function IconSeries({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 7h14v4H5z" />
      <path d="M5 13h14v4H5z" />
      <path d="M8 9h2M8 15h2" />
    </Svg>
  );
}

export function IconAnimation({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconGenres({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 6h7v7H4z" />
      <path d="M13 6h7v7h-7z" />
      <path d="M4 15h7v3H4z" />
      <path d="M13 15h7v3h-7z" />
    </Svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  );
}

/** Triangle lecture SVG — évite le rendu emoji ▶ sur iPhone. */
export function IconPlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M8.25 5.8v12.4c0 .7.76 1.13 1.36.77l9.3-6.2a.9.9 0 0 0 0-1.54l-9.3-6.2a.9.9 0 0 0-1.36.77z" />
    </svg>
  );
}

export function IconHeart({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 20s-7-4.35-7-9.2A3.8 3.8 0 0 1 12 7.5a3.8 3.8 0 0 1 7 3.3C19 15.65 12 20 12 20z" />
    </Svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 7h12M8 12h12M8 17h12" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" />
    </Svg>
  );
}

export function IconHistory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export type NavIconName =
  | 'accueil'
  | 'films'
  | 'series'
  | 'animation'
  | 'genres'
  | 'search'
  | 'liste'
  | 'historique'
  | 'heart';

const NAV_ICON_MAP = {
  accueil: IconHome,
  films: IconFilms,
  series: IconSeries,
  animation: IconAnimation,
  genres: IconGenres,
  search: IconSearch,
  liste: IconList,
  historique: IconHistory,
  heart: IconHeart,
} as const;

export function NavIcon({ name, className = 'h-5 w-5' }: { name: NavIconName; className?: string }) {
  const Icon = NAV_ICON_MAP[name];
  return <Icon className={className} />;
}

export function NavIconBox({ name, active = false }: { name: NavIconName; active?: boolean }) {
  return (
    <span
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
        active
          ? 'border-juxt-primary/45 bg-juxt-primary/18 text-juxt-primary'
          : 'border-juxt-primary/15 bg-juxt-primary/8 text-juxt-primary',
      ].join(' ')}
    >
      <NavIcon name={name} className="h-[18px] w-[18px]" />
    </span>
  );
}
