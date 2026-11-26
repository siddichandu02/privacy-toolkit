import { motion } from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';
import { IosSteps } from '../install/IosSteps';
import { Button } from '../ui';
import { Sheet } from './Sheet';

/** Safari on iPhone and iPad has no install button, so show the two taps instead. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const still = useStillMotion();
  return (
    <Sheet label="Add to Home Screen" onClose={onClose} testId="install-sheet">
      <div className="flex flex-col items-center px-6 pt-7 pb-6 text-center">
        <motion.svg
          viewBox="0 0 64 64"
          className="size-16 drop-shadow-[0_8px_14px_rgb(124_92_255/0.45)]"
          aria-hidden="true"
          initial={still ? false : { y: -18, rotate: -14, scale: 0.9 }}
          animate={{ y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.12 }}
        >
          <rect width="64" height="64" rx="15" fill="#15123A" />
          <path d="M18 46V22l14-8 14 8v24l-14-8z" fill="#7C5CFF" />
          <path d="M32 14v24l14 8V22z" fill="#FF6B8B" />
        </motion.svg>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Keep it on your home screen
        </h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          It opens in its own window and works with no connection. Your files still never leave your
          device.
        </p>
        <IosSteps className="mt-5 text-left" />
        <Button className="mt-6" onClick={onClose}>
          Got it
        </Button>
      </div>
    </Sheet>
  );
}
