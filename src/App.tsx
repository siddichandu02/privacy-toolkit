import { ThemeToggle } from './components/ThemeToggle';
import { Badge, Button, useToast } from './components/ui';
import { accentDot } from './components/ui/accent';
import { TOOLS } from './tools';

export default function App() {
  const { toast } = useToast();

  const explainPrivacy = () =>
    toast({
      tone: 'success',
      title: 'Zero uploads',
      description:
        "Open your browser's network panel while using any tool. You won't see your files go anywhere.",
    });

  return (
    <>
      <div className="mesh" aria-hidden="true" />
      <div className="fixed top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-4 py-16 sm:px-8">
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
              <li
                key={tool.id}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-sm backdrop-blur-md"
              >
                <span
                  className={`size-2.5 rounded-full ${accentDot[tool.accent]}`}
                  aria-hidden="true"
                />
                {tool.name}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
