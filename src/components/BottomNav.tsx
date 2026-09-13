import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { NavIcon, type NavIconName } from './NavIcons';

const TABS: Array<{
  id: string;
  label: string;
  to: string;
  icon: NavIconName;
  match: (pathname: string, tab: string | null) => boolean;
}> = [
  {
    id: 'home',
    label: 'Accueil',
    to: '/',
    icon: 'accueil',
    match: (pathname, tab) =>
      pathname === '/' && (!tab || tab === 'accueil' || tab === 'genres' || tab === 'animation'),
  },
  {
    id: 'films',
    label: 'Films',
    to: '/?tab=films',
    icon: 'films',
    match: (pathname, tab) => pathname === '/' && tab === 'films',
  },
  {
    id: 'series',
    label: 'Séries',
    to: '/?tab=series',
    icon: 'series',
    match: (pathname, tab) => pathname === '/' && tab === 'series',
  },
  {
    id: 'favorites',
    label: 'Favoris',
    to: '/liste',
    icon: 'heart',
    match: (pathname) => pathname === '/liste',
  },
];

export default function BottomNav() {
  const location = useLocation();
  const [params] = useSearchParams();
  const tab = params.get('tab');

  return (
    <nav className="m-bottom-nav" aria-label="Navigation principale">
      <ul className="m-bottom-nav__list">
        {TABS.map((item) => {
          const active = item.match(location.pathname, tab);
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className={`m-bottom-nav__tab ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => window.scrollTo(0, 0)}
              >
                <NavIcon name={item.icon} className="m-bottom-nav__icon" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
