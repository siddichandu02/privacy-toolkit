import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Fragment, useId, useState } from 'react';
import { CompressDemo } from '../components/home/CompressDemo';
import { HeroDrop } from '../components/home/HeroDrop';
import { HeroStory } from '../components/home/HeroStory';
import { InstallSlip } from '../components/home/InstallSlip';
import { PageDrop } from '../components/home/PageDrop';
import { PrivacyProof } from '../components/privacy/PrivacyProof';
import { PromiseStrip } from '../components/PromiseStrip';
import { ToolBrowser } from '../components/tools/ToolBrowser';
import { TOOLS } from '../tools';
import { useDocumentTitle } from '../useDocumentTitle';

const line: Variants = {
  hidden: { opacity: 0, y: '0.4em', rotate: 1.5 },
  shown: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24, delay: 0.08 + i * 0.12 },
  }),
};

/** The drop zone (and Pip on it) hops in once the headline has landed. */
const hop = (reduced: boolean | null) =>
  reduced
    ? {}
    : {
        initial: { opacity: 0, y: 28, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { type: 'spring' as const, stiffness: 260, damping: 16, delay: 0.45 },
      };

export default function Home() {
  const reduced = useReducedMotion();
  const [proofOpen, setProofOpen] = useState(false);
  const proofId = useId();
  useDocumentTitle();

  // A file dropped on the open page lands in the hero; bring it into view.
  const showHero = () =>
    document
      .getElementById('start')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });

  // The tip under "All tools" takes you back up to the drop area and focuses it.
  const goToDrop = () => {
    showHero();
    document.querySelector<HTMLElement>('#start [role="button"]')?.focus({ preventScroll: true });
  };

  return (
    <PageDrop onLanded={showHero}>
      <div className="mx-auto flex max-w-6xl flex-col px-4 pt-6 pb-8 sm:px-8 sm:pt-12">
        <h1 className="font-display text-[clamp(2rem,5.4vw,4.1rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance">
          {['Every PDF and image tool you need,', 'right in your browser.'].map((text, i) => (
            <Fragment key={text}>
              {i > 0 ? ' ' : null}
              <motion.span
                // Inline on phones so the words wrap naturally; the rise only shows from sm up.
                className="origin-bottom-left sm:block"
                custom={i}
                variants={reduced ? undefined : line}
                initial="hidden"
                animate="shown"
              >
                {text}
              </motion.span>
            </Fragment>
          ))}
        </h1>
        <div className="mt-5 grid items-start gap-x-12 gap-y-12 sm:mt-6 sm:gap-y-16 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="max-w-xl min-w-0">
            <p className="text-lg leading-relaxed text-muted sm:text-xl">
              Merge, split, compress, sign and convert. Your files are processed on your device and
              never sent to a server.{' '}
              <button
                type="button"
                aria-expanded={proofOpen}
                aria-controls={proofId}
                onClick={() => setProofOpen((o) => !o)}
                className="tap rounded font-semibold whitespace-nowrap text-fg underline decoration-mint/70 decoration-2 underline-offset-4 hover:decoration-mint"
              >
                {proofOpen ? 'Hide the check' : 'How can I check?'}
              </button>
            </p>
            <div id={proofId}>
              <AnimatePresence initial={false}>
                {proofOpen ? (
                  <motion.div
                    initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <PrivacyProof className="mt-5 mb-3" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <motion.div {...hop(reduced)}>
            <HeroDrop id="start" />
          </motion.div>
        </div>

        <HeroStory className="mt-8 sm:mt-10" />

        <section
          aria-labelledby="tools-heading"
          className="mt-10 border-t border-dashed border-line-strong pt-8 sm:mt-14 sm:pt-10"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <h2
              id="tools-heading"
              className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight sm:text-3xl"
            >
              All tools
              <span
                aria-hidden="true"
                data-testid="tools-count"
                className="inline-grid h-7 min-w-7 place-items-center rounded-full bg-violet/15 px-2 font-sans text-sm font-bold text-violet-ink tabular-nums ring-1 ring-violet/30"
              >
                {TOOLS.length}
              </span>
            </h2>
            <p className="text-sm text-muted">
              Tip:{' '}
              <button
                type="button"
                onClick={goToDrop}
                className="tap rounded font-semibold text-fg underline decoration-violet/60 decoration-2 underline-offset-4 hover:decoration-violet"
              >
                <span className="pointer-coarse:hidden">drop a file at the top</span>
                <span className="hidden pointer-coarse:inline">choose a file at the top</span>
              </button>{' '}
              and we&rsquo;ll suggest the right tool.
            </p>
          </div>
          <ToolBrowser tools={TOOLS} />
        </section>

        <CompressDemo className="mt-20 later sm:mt-28" />

        <PromiseStrip className="mt-16 later [contain-intrinsic-size:auto_220px] sm:mt-24" />

        <InstallSlip className="mt-6" />
      </div>
    </PageDrop>
  );
}
