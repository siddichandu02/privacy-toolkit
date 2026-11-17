import { Route, Routes } from 'react-router-dom';
import { AnimatedOutlet } from './components/layout/AnimatedOutlet';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { MAIN_ID, SkipLink } from './components/layout/SkipLink';
import Home from './routes/Home';
import NotFound from './routes/NotFound';
import ToolPage from './routes/ToolPage';

function Layout() {
  return (
    <>
      <div className="mesh" aria-hidden="true" />
      <SkipLink />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header />
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
          <AnimatedOutlet />
        </main>
        <Footer />
      </div>
    </>
  );
}

/** Route table. The router itself comes from main.tsx (or a test). */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tools/:id" element={<ToolPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
