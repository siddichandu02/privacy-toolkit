import { Link } from 'react-router-dom';
import { Badge, Button, useToast } from '../components/ui';
import { accentDot } from '../components/ui/accent';
import { TOOLS, toolPath } from '../tools';
import { useDocumentTitle } from '../useDocumentTitle';

export default function Home() {
  const { toast } = useToast();
  useDocumentTitle();

  const explainPrivacy = () =>
    toast({
      tone: 'success',
      title: 'Zero uploads',
      description:
        "Open your browser's network panel while using any tool. You won't see your files go anywhere.",
    });

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-4 py-16 sm:px-8">
      <Badge accent="mint" dot className="mb-6 w-fit px-3.5 py-1 text-sm">
        Opening soon
      </Badge>
      <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-8xl">
        <span className="block">Your files stay</span>{' '}
        <span className="block">on your device.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
        Privacy Toolkit is a set of free PDF and image tools that run entirely in your browser.
        Nothing is uploaded, tracked or stored on a server.
      </p>
      <div className="mt-8">
        <Button variant="ghost" onClick={explainPrivacy}>
          How can I check that?
        </Button>
      </div>

      <section aria-labelledby="coming-heading" className="mt-14">
        <h2 id="coming-heading" className="font-display text-lg font-semibold text-fg/90">
          Tools on the way
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {TOOLS.map((tool) => (
            <li key={tool.id}>
              <Link
                to={toolPath(tool.id)}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-sm backdrop-blur-md transition-colors hover:border-line-strong hover:bg-surface-strong"
              >
                <span
                  className={`size-2.5 rounded-full ${accentDot[tool.accent]}`}
                  aria-hidden="true"
                />
                {tool.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
