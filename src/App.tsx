import { useLocation, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import PwaInstallBanner from './components/PwaInstallBanner';
import ScrollToTop from './components/ScrollToTop';
import { TitleModalProvider } from './context/TitleModalContext';
import Home from './pages/Home';
import Search from './pages/Search';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
import MyList from './pages/MyList';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  const location = useLocation();
  const watch = location.pathname.startsWith('/watch');
  const moviePage = location.pathname.startsWith('/movie/');
  const hideChrome = watch || moviePage;

  return (
    <TitleModalProvider>
      <ScrollToTop />
      <div className={`app flex min-h-screen flex-col ${watch ? 'is-watch' : ''}`}>
        {hideChrome ? null : <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/liste" element={<MyList />} />
            <Route path="/historique" element={<HistoryPage />} />
            <Route path="/movie/:slug" element={<MovieDetail />} />
            <Route path="/watch/:slug" element={<Watch />} />
          </Routes>
        </main>
        {hideChrome ? null : <Footer />}
        {hideChrome ? null : <BottomNav />}
        {hideChrome ? null : <PwaInstallBanner />}
      </div>
    </TitleModalProvider>
  );
}
