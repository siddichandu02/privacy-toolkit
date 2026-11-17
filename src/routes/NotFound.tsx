import { Link } from 'react-router-dom';
import { Pip } from '../components/pip/Pip';
import { useDocumentTitle } from '../useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-24 text-center sm:px-8">
      <Pip pose="puzzled" className="mb-8 h-36 sm:h-44" />
      <h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-6xl">
        This page folded itself away.
      </h1>
      <p className="mt-5 max-w-md text-lg text-muted">
        The link might be old or mistyped. Every tool is still one click away.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center rounded-control bg-violet-fill px-5 font-semibold text-on-violet shadow-soft transition-shadow hover:shadow-glow-violet"
      >
        Back to all tools
      </Link>
    </div>
  );
}
