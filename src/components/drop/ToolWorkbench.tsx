import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { DropZone, RejectionNotice } from './DropZone';
import { FileList } from './FileList';
import { UndoBar } from './UndoBar';
import { useFileQueue, type FileQueue } from './useFileQueue';
import { formatBytes, rulesFor, type Rejection } from './validate';

/**
 * Where a tool's files are gathered: a big drop sheet to start, then the file
 * list with a slim "add more" strip under it.
 */
export function ToolWorkbench({
  tool,
  queue: outside,
  footer,
}: {
  tool: ToolInfo;
  /** Pass a queue to keep the files when the workbench unmounts (e.g. while a job runs). */
  queue?: FileQueue;
  /** The tool's main action, shown under the list once there are files. */
  footer?: ReactNode;
}) {
  const still = useStillMotion();
  const own = useFileQueue();
  const queue = outside ?? own;
  // Shared by the full and compact zones so a message survives the swap.
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const rules = rulesFor(tool.input);
  const { items, forget } = queue;
  // Undo only makes sense while the list is on screen.
  useEffect(() => forget, [forget]);
  const hasFiles = items.length > 0;
  const room = rules.maxFiles === undefined || items.length < rules.maxFiles;
  const total = items.reduce((sum, item) => sum + item.file.size, 0);
  const swap = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <section aria-label="Your files" className="mt-12 sm:mt-16">
      <AnimatePresence mode="wait" initial={false}>
        {hasFiles ? (
          <motion.div key="list" {...swap} transition={{ duration: 0.22 }}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <p className="font-display text-2xl font-bold tracking-tight">
                {items.length === 1
                  ? `1 ${tool.input.kind === 'pdf' ? 'PDF' : 'image'}`
                  : `${items.length} ${rules.kindLabel}`}
                <span className="ml-3 font-sans text-base font-medium text-muted">
                  {formatBytes(total)}
                  {items.length > 1 ? ' in total' : null}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  queue.removeAll();
                  setRejected([]);
                }}
                className="rounded-lg text-sm font-semibold text-muted transition-colors hover:text-coral"
              >
                {items.length === 1 ? 'Remove' : 'Remove all'}
              </button>
            </div>
            {tool.input.ordered && items.length > 1 ? (
              <p className="mb-4 text-sm text-muted">
                Files are used top to bottom. Drag the grip or use the arrows to change the order.
              </p>
            ) : null}
            <FileList
              items={items}
              accent={tool.accent}
              ordered={tool.input.ordered}
              onReorder={queue.setItems}
              onMove={queue.move}
              onRemove={queue.remove}
            />
            {room ? (
              <div className="mt-4">
                <DropZone
                  rejected={rejected}
                  onRejectedChange={setRejected}
                  compact
                  rules={rules}
                  accent={tool.accent}
                  existingCount={items.length}
                  onFiles={queue.add}
                />
              </div>
            ) : (
              <RejectionNotice rejected={rejected} onDismiss={() => setRejected([])} />
            )}
            {footer ? <div className="mt-8">{footer}</div> : null}
          </motion.div>
        ) : (
          <motion.div key="empty" {...swap} transition={{ duration: 0.22 }}>
            <DropZone
              rejected={rejected}
              onRejectedChange={setRejected}
              rules={rules}
              accent={tool.accent}
              onFiles={queue.add}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <UndoBar
        removed={queue.removed}
        accent={tool.accent}
        onUndo={queue.undo}
        onDone={queue.forget}
      />
    </section>
  );
}
