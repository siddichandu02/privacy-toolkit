import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Fragment, useId, useState } from 'react';
import { HeroDrop } from '../components/home/HeroDrop';
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
        <div className="mt-5 grid items-center gap-x-12 gap-y-12 sm:mt-6 sm:gap-y-16 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="max-w-xl">
            <p className="text-lg leading-relaxed text-muted sm:text-xl">
              Merge, split, compress, sign and convert. Your files are processed on your device and
              never sent to a server.{' '}
              <button
                type="button"
                aria-expanded={proofOpen}
                aria-controls={proofId}
                onClick={() => setProofOpen((o) => !o)}
                className="rounded font-semibold whitespace-nowrap text-fg underline decoration-mint/70 decoration-2 underline-offset-4 hover:decoration-mint"
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
                    <PrivacyProof className="mt-5" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <motion.div {...hop(reduced)}>
            <HeroDrop id="start" />
          </motion.div>
        </div>

        <section aria-labelledby="tools-heading" className="mt-8 sm:mt-12">
          <h2
            id="tools-heading"
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Or pick a tool
          </h2>
          <ToolBrowser tools={TOOLS} />
        </section>

        <PromiseStrip className="mt-16 sm:mt-24" />
      </div>
    </PageDrop>
  );
}
