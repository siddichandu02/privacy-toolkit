import { useEffect, useRef } from 'react';
import { useToast } from '../components/ui';
import { useOfflineState, wasJustSaved } from './offline';

/** Says once, on the first visit, that the tools now work with no connection. */
export function OfflineNotice() {
  const state = useOfflineState();
  const { toast } = useToast();
  const told = useRef(false);
  useEffect(() => {
    if (state !== 'ready' || told.current || !wasJustSaved()) return;
    told.current = true;
    toast({
      title: 'Ready to work offline',
      description: 'Every tool is saved on this device. It keeps working with no connection.',
      tone: 'success',
    });
  }, [state, toast]);
  return null;
}
