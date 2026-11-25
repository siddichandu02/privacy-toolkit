import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Placement } from '../../lib/pdf/signature-place';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useSignJob } from '../../workers/useSignJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { PdfOpenProblem } from '../pages/PdfOpenProblem';
import { usePdfPages } from '../pages/usePdfPages';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { useObjectUrl } from '../result/useObjectUrl';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { Segmented, type SegmentOption } from '../ui/Segmented';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { QuillScene } from '../wait/scenes/QuillScene';
import { useThumbnails } from '../wait/useThumbnails';
import { WaitStage } from '../wait/WaitStage';
import { EMPTY_DRAFT, type Signature, type SignatureDraft } from './ink';
import { SignaturePad } from './SignaturePad';
import { SignaturePlacer } from './SignaturePlacer';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDF' },
  { id: 'working', label: 'Signing the pages' },
  { id: 'packing', label: 'Saving the signed copy' },
];

type Scope = 'one' | 'all';

const SCOPES: readonly SegmentOption<Scope>[] = [
  { id: 'one', label: 'This page' },
  { id: 'all', label: 'Every page' },
];

/** Bottom right, where signatures usually go. */
const START: Placement = { x: 0.56, y: 0.8, w: 0.34 };

interface Spot {
  page: number;
  place: Placement;
  scope: Scope;
}

const START_SPOT: Spot = { page: 0, place: START, scope: 'one' };

/** Sign PDF: make a signature, place it on a page, stamp it in a worker. */
export function SignTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useSignJob(undefined, queue.items.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const item = queue.items[0];
  const file = item?.file;
  const [thumb] = useThumbnails(job.status === 'running' && file ? [file] : [], 1);
  const [draft, setDraft] = useState<SignatureDraft>(EMPTY_DRAFT);
  const [signature, setSignature] = useState<Signature | null>(null);
  // Where the signature goes belongs to one file; a new file starts fresh.
  const [held, setHeld] = useState<{ id: string; spot: Spot }>({ id: '', spot: START_SPOT });
  const spot = item && held.id === item.id ? held.spot : START_SPOT;
  const setSpot = (next: Spot) => setHeld({ id: item?.id ?? '', spot: next });
  const [last, setLast] = useState<number[]>([]);

  const run = (pages: number[]) => {
    if (!file || !signature) return;
    setLast(pages);
    start({ file, signature: signature.blob, aspect: signature.aspect, place: spot.place, pages });
  };
  const startOver = () => {
    reset();
    queue.clear();
  };

  const swap = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.98 },
      };
  const transition = { duration: 0.22 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {job.status === 'idle' ? (
        <motion.div key="files" {...swap} transition={transition}>
          <ToolWorkbench
            tool={tool}
            queue={queue}
            footer={
              file ? (
                <SignPanel
                  file={file}
                  accent={tool.accent}
                  draft={draft}
                  onDraftChange={setDraft}
                  signature={signature}
                  onSignatureChange={setSignature}
                  spot={spot}
                  onSpotChange={setSpot}
                  onSign={run}
                />
              ) : null
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key={job.status}
          {...swap}
          transition={transition}
          className="mt-12 max-w-xl sm:mt-16"
        >
          {job.status === 'running' ? (
            <WaitStage
              title={`Signing ${file?.name ?? 'your PDF'}`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={<QuillScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title="Your signed PDF is ready"
              fileName={job.name}
              blob={job.blob}
              details={`${
                job.signed === job.pages && job.pages > 1
                  ? `Signed on all ${job.pages} pages`
                  : job.signed === 1
                    ? `Signed on page ${(last[0] ?? 0) + 1} of ${job.pages}`
                    : `Signed on ${job.signed} of ${job.pages} pages`
              }, ${formatBytes(job.blob.size)}.`}
              downloadLabel="Download PDF"
              actions={[
                { label: 'Sign another PDF', onClick: startOver },
                { label: 'Move the signature', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
              reason={job.reason}
              title="Your PDF was not signed"
              message={job.message}
              fileName={job.fileName}
              onRetry={() => run(last)}
              onBack={reset}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SignPanelProps {
  file: File;
  accent: Accent;
  draft: SignatureDraft;
  onDraftChange: (draft: SignatureDraft) => void;
  signature: Signature | null;
  onSignatureChange: (signature: Signature | null) => void;
  spot: Spot;
  onSpotChange: (spot: Spot) => void;
  onSign: (pages: number[]) => void;
}

function SignPanel({
  file,
  accent,
  draft,
  onDraftChange,
  signature,
  onSignatureChange,
  spot,
  onSpotChange,
  onSign,
}: SignPanelProps) {
  const doc = usePdfPages(file);
  const count = doc.status === 'ready' ? doc.pages.count : 0;
  const page = Math.min(spot.page, Math.max(0, count - 1));

  if (doc.status === 'error') {
    return <PdfOpenProblem name={file.name} locked={doc.locked} accent={accent} />;
  }

  const go = (to: number) => onSpotChange({ ...spot, page: Math.min(count - 1, Math.max(0, to)) });

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <section aria-labelledby="sign-make">
        <h2 id="sign-make" className="font-display text-xl font-bold tracking-tight">
          Your signature
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Made right here in your browser. It is never saved or sent anywhere.
        </p>
        <SignaturePad
          accent={accent}
          draft={draft}
          onDraftChange={onDraftChange}
          onChange={onSignatureChange}
        />
      </section>

      <section aria-labelledby="sign-place" className="mt-8 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="sign-place" className="font-display text-xl font-bold tracking-tight">
              Place it
            </h2>
            <p className="mt-1 text-sm text-muted">
              {doc.status !== 'ready'
                ? 'Opening the pages...'
                : signature
                  ? 'Drag it where it belongs.'
                  : 'Sign above and it shows up on the page.'}
            </p>
          </div>
          {count > 1 ? (
            <Segmented
              legend="Pages to sign"
              hideLegend
              options={SCOPES}
              value={spot.scope}
              onChange={(scope) => onSpotChange({ ...spot, scope })}
              accent={accent}
              className="w-full min-[420px]:w-64"
            />
          ) : null}
        </div>

        <div className="mt-5">
          {doc.status === 'ready' ? (
            <>
              {signature ? (
                <PlacedSignature
                  signature={signature}
                  pages={doc.pages}
                  page={page}
                  place={spot.place}
                  onPlaceChange={(place) => onSpotChange({ ...spot, place })}
                  accent={accent}
                />
              ) : (
                <EmptySheet />
              )}
              {count > 1 ? (
                <div className="mt-3 flex items-center justify-center gap-1 text-sm text-muted">
                  <StepButton
                    label="Previous page"
                    back
                    disabled={page === 0}
                    onClick={() => go(page - 1)}
                  />
                  <span aria-live="polite" className="min-w-24 text-center tabular-nums">
                    Page {page + 1} of {count}
                  </span>
                  <StepButton
                    label="Next page"
                    disabled={page >= count - 1}
                    onClick={() => go(page + 1)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="sign-desk grid aspect-[648/824] max-h-[min(70vh,40rem)] w-full place-items-center rounded-2xl border border-line p-6">
              <div className="aspect-[612/792] h-full animate-pulse rounded-[3px] bg-line" />
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {!signature
            ? 'Draw or type your signature to begin.'
            : spot.scope === 'all' && count > 1
              ? `Signs all ${count} pages in the same spot. ${file.name} stays as it is.`
              : `Signs page ${page + 1}. ${file.name} stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={() =>
            onSign(
              spot.scope === 'all' && count > 1
                ? Array.from({ length: count }, (_, i) => i)
                : [page],
            )
          }
          disabled={!signature || doc.status !== 'ready'}
          className="shrink-0"
          icon={<QuillIcon />}
        >
          Sign PDF
        </Button>
      </div>
    </div>
  );
}

function PlacedSignature({
  signature,
  ...rest
}: { signature: Signature } & Omit<
  React.ComponentProps<typeof SignaturePlacer>,
  'signatureUrl' | 'aspect'
>) {
  const url = useObjectUrl(signature.blob);
  if (!url) return <EmptySheet />;
  return <SignaturePlacer signatureUrl={url} aspect={signature.aspect} {...rest} />;
}

function EmptySheet() {
  return (
    <div className="sign-desk grid aspect-[648/824] max-h-[min(70vh,40rem)] w-full place-items-center rounded-2xl border border-line p-6">
      <div className="grid aspect-[612/792] h-full max-h-full place-items-center rounded-[3px] border-2 border-dashed border-line-strong p-6 text-center text-sm text-muted">
        Your signature lands here
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  back,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <path
          d={back ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function QuillIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        d="M3 17c3-1 5-3 6.5-6M17 3c-5 .5-8.5 4-10 9l1.5 1.5C13.5 12 16.5 8 17 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
