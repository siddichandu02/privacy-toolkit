import { Outlet, Route, Routes } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import Home from './routes/Home';
import NotFound from './routes/NotFound';
import ToolPage from './routes/ToolPage';

function Layout() {
  return (
    <>
      <div className="mesh" aria-hidden="true" />
      <div className="fixed top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <main className="relative z-10 min-h-dvh">
        <Outlet />
      </main>
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
