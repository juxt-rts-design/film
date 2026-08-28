import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { type ContentTab } from '../config/catalog';
import MobileDrawer from './MobileDrawer';
import SearchAutocomplete from './SearchAutocomplete';
import { IconMenu, NavIcon, NavIconBox, type NavIconName } from './NavIcons';
import { scrollToTop } from '../lib/scroll';

const MAIN_LINKS = [
  { id: 'accueil', label: 'Accueil', to: '/', tab: 'accueil' as ContentTab },
  { id: 'series', label: 'Séries', to: '/?tab=series', tab: 'series' as ContentTab },
  { id: 'films', label: 'Films', to: '/?tab=films', tab: 'films' as ContentTab },
  { id: 'animation', label: 'Animation', to: '/?tab=animation', tab: 'animation' as ContentTab },
];

const EXTRA_LINKS = [
  { id: 'liste', label: 'Ma liste', to: '/liste', icon: 'liste' as NavIconName },
  { id: 'historique', label: 'Historique', to: '/historique', icon: 'historique' as NavIconName },
  { id: 'genres', label: 'Genres', to: '/?tab=genres', icon: 'genres' as NavIconName },
];

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchTimer = useRef<number>(0);
  const activeTab = (params.get('tab') as ContentTab) || 'accueil';
  const searchQuery = params.get('q') || '';
  const searching = searchOpen || location.pathname === '/search';

  useEffect(() => {
    if (location.pathname === '/search') {
      setQuery(searchQuery);
      setSearchOpen(true);
    }
  }, [location.pathname, searchQuery]);

  function closeSearch() {
    window.clearTimeout(searchTimer.current);
    setQuery('');
    setSearchOpen(false);
    if (location.pathname === '/search') navigate('/');
  }

  function onSearchChange(value: string) {
    setQuery(value);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const trimmed = value.trim();
      if (!trimmed) {
        if (location.pathname === '/search') navigate('/');
        return;
      }
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, {
        replace: location.pathname === '/search',
      });
    }, 120);
  }

  function goBrowse() {
    if (location.pathname === '/search' || searchOpen) {
      window.clearTimeout(searchTimer.current);
      setQuery('');
      setSearchOpen(false);
    }
    scrollToTop();
  }

  function isTab(id: string) {
    if (location.pathname !== '/') return false;
    return activeTab === id;
  }

  return (
    <>
      <header className="nf-nav">
        <div className="nf-nav__inner">
          <button
            type="button"
            className="nf-nav__menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label="Ouvrir le menu"
            onClick={() => setDrawerOpen(true)}
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <Link to="/" className="nf-nav__logo" onClick={goBrowse}>
            <img src="/logo.svg" alt="" />
            <span>
              <em>Juxt</em>
              <strong>-Ciné</strong>
            </span>
          </Link>

          <nav className="nf-nav__links" aria-label="Catalogue">
            {MAIN_LINKS.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className={`nf-nav__link ${isTab(item.tab) ? 'is-active' : ''}`}
                aria-current={isTab(item.tab) ? 'page' : undefined}
                onClick={goBrowse}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/liste"
              className={`nf-nav__link ${location.pathname === '/liste' ? 'is-active' : ''}`}
              onClick={goBrowse}
            >
              Ma liste
            </Link>
            <Link
              to="/historique"
              className={`nf-nav__link ${location.pathname === '/historique' ? 'is-active' : ''}`}
              onClick={goBrowse}
            >
              Historique
            </Link>
          </nav>

          <div className="nf-nav__right">
            <SearchAutocomplete
              value={query}
              onChange={onSearchChange}
              variant="navbar"
              collapsed={!searching}
              onToggle={() => setSearchOpen(true)}
              onClose={closeSearch}
              className="nf-nav__search"
            />
            <Link
              to="/historique"
              className={`nf-nav__icon nf-nav__history ${location.pathname === '/historique' ? 'is-active' : ''}`}
              aria-label="Historique"
              title="Historique"
              onClick={scrollToTop}
            >
              <NavIcon name="historique" className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="flex flex-col gap-2" aria-label="Menu mobile">
          {[...MAIN_LINKS, ...EXTRA_LINKS].map((item) => {
            const active =
              'tab' in item
                ? isTab(item.tab)
                : location.pathname === item.to || (item.id === 'genres' && isTab('genres'));
            const icon = ('icon' in item ? item.icon : item.id) as NavIconName;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={[
                  'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-semibold',
                  active
                    ? 'border-juxt-primary/45 bg-juxt-primary/14 text-juxt-primary'
                    : 'border-transparent text-juxt-text hover:bg-juxt-primary/8',
                ].join(' ')}
                onClick={() => {
                  setDrawerOpen(false);
                  goBrowse();
                }}
              >
                <NavIconBox name={icon} active={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </MobileDrawer>
    </>
  );
}
