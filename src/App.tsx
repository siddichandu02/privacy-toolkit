import { TOOLS } from './tools';

const dotClass: Record<(typeof TOOLS)[number]['accent'], string> = {
  violet: 'bg-violet',
  coral: 'bg-coral',
  mint: 'bg-mint',
  sunshine: 'bg-sunshine',
  sky: 'bg-sky',
};

export default function App() {
  return (
    <>
      <div className="mesh" aria-hidden="true" />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-4 py-16 sm:px-8">
        <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-muted backdrop-blur-md">
          <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
          Opening soon
        </p>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-8xl">
          <span className="block">Your files stay</span>{' '}
          <span className="block">on your device.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
          Privacy Toolkit is a set of free PDF and image tools that run entirely in your browser.
          Nothing is uploaded, tracked or stored on a server.
        </p>

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
                  className={`size-2.5 rounded-full ${dotClass[tool.accent]}`}
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
