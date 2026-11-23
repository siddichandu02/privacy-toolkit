import { Fragment } from 'react';

/**
 * A file name that wraps after its dashes, underscores and dots instead of in
 * the middle of a word ("report-final-" / "compressed.pdf"). Very long words
 * with no such marks still wrap anywhere rather than overflow.
 */
export function FileName({ name, className = '' }: { name: string; className?: string }) {
  const parts = name.replace(/[-_.]/g, '$&\n').split('\n');
  return (
    <span className={`[overflow-wrap:anywhere] ${className}`}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <wbr /> : null}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
