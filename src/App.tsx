import { useLocation, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
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

  return (
    <TitleModalProvider>
      <div className={`app flex min-h-screen flex-col ${watch ? 'is-watch' : ''}`}>
        {watch ? null : <Navbar />}
        <main className={watch ? 'flex-1' : 'flex-1 pt-[64px]'}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/liste" element={<MyList />} />
            <Route path="/historique" element={<HistoryPage />} />
            <Route path="/movie/:slug" element={<MovieDetail />} />
            <Route path="/watch/:slug" element={<Watch />} />
          </Routes>
        </main>
        {watch ? null : <Footer />}
      </div>
    </TitleModalProvider>
  );
}
