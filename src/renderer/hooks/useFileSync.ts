import { useEffect, useRef } from 'react';
import { useFileStore } from '../stores/useFileStore';
import { useCheckFilesConsistency } from './useIPC';

export function useFileSync() {
  const files = useFileStore(state => state.files);
  const markAsStale = useFileStore(state => state.markAsStale);
  const checkConsistency = useCheckFilesConsistency();
  
  // Throttle check
  const lastCheckTime = useRef(0);
  const isChecking = useRef(false);

  useEffect(() => {
    const handleFocus = async () => {
      const now = Date.now();
      // Check at most every 5 seconds
      if (now - lastCheckTime.current < 5000 || isChecking.current) return;
      
      // Filter only synced files to check? Or all? 
      // If status is already out-of-sync, we might still want to check if it's *still* out of sync (not implemented yet)
      // or just check everything.
      if (files.length === 0) return;

      try {
        isChecking.current = true;
        const changedIds: string[] = await checkConsistency.mutateAsync(files);
        
        if (changedIds && changedIds.length > 0) {
          markAsStale(changedIds);
        }
        lastCheckTime.current = Date.now();
      } catch (error) {
        console.error('File consistency check failed:', error);
      } finally {
        isChecking.current = false;
      }
    };

    window.addEventListener('focus', handleFocus);
    // Also run once on mount if meaningful? No, only on focus or interval.
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [files, markAsStale, checkConsistency]);
}
