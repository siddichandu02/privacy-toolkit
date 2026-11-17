import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Fragment, useRef } from 'react';
import { PromiseStrip } from '../components/PromiseStrip';
import { ToolBrowser } from '../components/tools/ToolBrowser';
import { Badge, Button, useToast } from '../components/ui';
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

export default function Home() {
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const toolsRef = useRef<HTMLElement>(null);
  useDocumentTitle();

  const explainPrivacy = () =>
    toast({
      tone: 'success',
      title: 'Zero uploads',
      description:
        "Open your browser's network panel while using any tool. You won't see your files go anywhere.",
    });

  const showTools = () => {
    const section = toolsRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pt-10 pb-8 sm:px-8 sm:pt-20">
      <Badge accent="mint" dot className="mb-6 w-fit px-3.5 py-1 text-sm">
        Opening soon
      </Badge>
      <h1 className="font-display text-[clamp(2.75rem,10vw,7.5rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-balance">
        {['Your files stay', 'on your device.'].map((text, i) => (
          <Fragment key={text}>
            {i > 0 ? ' ' : null}
            <motion.span
              className="block origin-bottom-left"
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
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:mt-8 sm:text-xl">
        Free PDF and image tools that do all the work inside your browser. Nothing is uploaded,
        tracked or stored on a server.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={showTools}>
          Browse the tools
        </Button>
        <Button size="lg" variant="ghost" onClick={explainPrivacy}>
          How can I check that?
        </Button>
      </div>

      <PromiseStrip className="mt-14 sm:mt-20" />

      <section
        ref={toolsRef}
        tabIndex={-1}
        aria-labelledby="tools-heading"
        className="mt-16 scroll-mt-28 sm:mt-24"
      >
        <h2
          id="tools-heading"
          className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Pick a tool
        </h2>
        <ToolBrowser tools={TOOLS} />
      </section>
    </div>
  );
}
