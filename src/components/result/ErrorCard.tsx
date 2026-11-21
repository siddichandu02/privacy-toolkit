import { useId } from 'react';
import type { FailReason } from '../../workers/useWorkerJob';
import { Pip } from '../pip/Pip';
import { Button } from '../ui';
import { resultPanel } from './panel';
import { useFocusOnMount } from './useFocusOnMount';

export interface ErrorCardProps {
  title: string;
  message: string;
  /** Set when one file is to blame. Retrying would fail again, so going back leads. */
  fileName?: string;
  onRetry: () => void;
  onBack: () => void;
  backLabel?: string;
  /** `updated`: a newer version was deployed, so reloading is the fix, not retrying. */
  reason?: FailReason;
  /** Reload the page. Swappable for tests. */
  onReload?: () => void;
}

const reloadPage = () => window.location.reload();

/** Friendly failure screen: says what went wrong and offers a way forward. */
export function ErrorCard({
  title,
  message,
  fileName,
  onRetry,
  onBack,
  backLabel = 'Back to your files',
  reason,
  onReload = reloadPage,
}: ErrorCardProps) {
  const id = useId();
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const updated = reason === 'updated';
  const reload = (
    <Button key="reload" variant="primary" onClick={onReload}>
      Reload page
    </Button>
  );
  const retry = (
    <Button key="retry" variant={fileName ? 'ghost' : 'primary'} onClick={onRetry}>
      Try again
    </Button>
  );
  const back = (
    <Button key="back" variant={fileName && !updated ? 'primary' : 'ghost'} onClick={onBack}>
      {backLabel}
    </Button>
  );
  return (
    <section role="alert" aria-labelledby={id} className={resultPanel}>
      <Pip pose={updated ? 'puzzled' : 'shrug'} className="mx-auto h-32" />
      <h2
        id={id}
        ref={heading}
        tabIndex={-1}
        className="mt-5 font-display text-3xl font-bold tracking-tight text-balance outline-none"
      >
        {updated ? 'A newer version is ready' : title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{message}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {updated ? [reload, back] : fileName ? [back, retry] : [retry, back]}
      </div>
    </section>
  );
}
