import { useId } from 'react';
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
}

/** Friendly failure screen: says what went wrong and offers a way forward. */
export function ErrorCard({
  title,
  message,
  fileName,
  onRetry,
  onBack,
  backLabel = 'Back to your files',
}: ErrorCardProps) {
  const id = useId();
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const retry = (
    <Button key="retry" variant={fileName ? 'ghost' : 'primary'} onClick={onRetry}>
      Try again
    </Button>
  );
  const back = (
    <Button key="back" variant={fileName ? 'primary' : 'ghost'} onClick={onBack}>
      {backLabel}
    </Button>
  );
  return (
    <section role="alert" aria-labelledby={id} className={resultPanel}>
      <Pip pose="shrug" className="mx-auto h-32" />
      <h2
        id={id}
        ref={heading}
        tabIndex={-1}
        className="mt-5 font-display text-3xl font-bold tracking-tight text-balance outline-none"
      >
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{message}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {fileName ? [back, retry] : [retry, back]}
      </div>
    </section>
  );
}
