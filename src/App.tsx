import { Route, Routes } from 'react-router-dom';
import { AnimatedOutlet } from './components/layout/AnimatedOutlet';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { CommandCenter } from './components/palette/CommandCenter';
import { MeshBackground } from './components/layout/MeshBackground';
import { MAIN_ID, SkipLink } from './components/layout/SkipLink';
import Home from './routes/Home';
import NotFound from './routes/NotFound';
import PipLab from './routes/PipLab';
import ToolPage from './routes/ToolPage';

function Layout() {
  return (
    <>
      <MeshBackground />
      <SkipLink />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header />
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 overflow-x-clip outline-none">
          <AnimatedOutlet />
        </main>
        <Footer />
      </div>
      <CommandCenter />
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
        <Route path="lab/pip" element={<PipLab />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
