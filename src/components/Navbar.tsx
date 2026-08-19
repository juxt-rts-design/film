import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CONTENT_SECTIONS, type ContentTab } from '../config/catalog';
import MobileDrawer from './MobileDrawer';
import SearchAutocomplete from './SearchAutocomplete';
import { IconMenu, NavIcon, NavIconBox, type NavIconName } from './NavIcons';

const NAV_LINKS = CONTENT_SECTIONS.map((s) => ({
  id: s.id,
  label: s.label,
  icon: s.id as NavIconName,
}));

function NavPill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: NavIconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-pill ${active ? 'nav-pill--active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-pill__icon">
        <NavIcon name={icon} className="h-4 w-4" />
      </span>
      {label}
    </button>
  );
}

function DrawerLink({
  active,
  icon,
  label,
  onClick,
  to,
}: {
  active: boolean;
  icon: NavIconName;
  label: string;
  onClick?: () => void;
  to?: string;
}) {
  const className = [
    'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-semibold transition-colors',
    active
      ? 'border-juxt-primary/45 bg-juxt-primary/14 text-juxt-primary shadow-[0_0_0_1px_rgba(34,197,94,0.2)]'
      : 'border-transparent text-juxt-text hover:border-juxt-primary/20 hover:bg-juxt-primary/8',
  ].join(' ');

  const content = (
    <>
      <NavIconBox name={icon} active={active} />
      {label}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} onClick={onClick} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {content}
    </button>
  );
}

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const activeTab = (params.get('tab') as ContentTab) || 'accueil';
  const searchQuery = params.get('q') || '';

  useEffect(() => {
    if (location.pathname === '/search') setQuery(searchQuery);
  }, [location.pathname, searchQuery]);

  function goToTab(tab: ContentTab) {
    navigate(tab === 'accueil' ? '/' : `/?tab=${tab}`);
    setDrawerOpen(false);
  }

  function isActive(id: string) {
    if (location.pathname !== '/') return false;
    return activeTab === id;
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-black">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:h-[76px] lg:gap-4 lg:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-juxt-primary/25 text-juxt-primary lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label="Ouvrir le menu"
            onClick={() => setDrawerOpen(true)}
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <Link to="/" className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <img src="/logo.svg" alt="Juxt-Ciné" className="h-9 w-auto object-contain" />
            <span className="font-display flex items-baseline gap-px text-xl font-extrabold tracking-wide">
              <span className="italic text-juxt-text">Juxt</span>
              <span className="text-juxt-primary">-Ciné</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections principales">
            {NAV_LINKS.map((item) => (
              <NavPill
                key={item.id}
                active={isActive(item.id)}
                icon={item.icon}
                label={item.label}
                onClick={() => goToTab(item.id)}
              />
            ))}
          </nav>

          <SearchAutocomplete
            value={query}
            onChange={setQuery}
            variant="navbar"
            onPick={() => setDrawerOpen(false)}
            className="min-w-0 flex-1 lg:max-w-[320px] lg:flex-none xl:max-w-[360px]"
          />

          <Link to="/" className="shrink-0 lg:hidden" aria-label="Accueil">
            <img src="/logo.svg" alt="" className="h-9 w-9 object-contain" />
          </Link>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="flex flex-col gap-2" aria-label="Menu mobile">
          {NAV_LINKS.map((item) => (
            <DrawerLink
              key={item.id}
              active={isActive(item.id)}
              icon={item.icon}
              label={item.label}
              onClick={() => goToTab(item.id)}
            />
          ))}
        </nav>
      </MobileDrawer>
    </>
  );
}
