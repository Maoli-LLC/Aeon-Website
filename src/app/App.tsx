import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Homepage } from './pages/Homepage';
import { BlogPage } from './pages/BlogPage';
import { MusicCreationPage } from './pages/MusicCreationPage';
import { DreamLatticePage } from './pages/DreamLatticePage';
import { StorePage } from './pages/StorePage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { AdminPage } from './pages/AdminPage';
import '../styles/fonts.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Homepage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="music" element={<MusicCreationPage />} />
          <Route path="dream-lattice" element={<DreamLatticePage />} />
          <Route path="store" element={<StorePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
