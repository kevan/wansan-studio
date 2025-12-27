import { useEffect, useState, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useProjectStore } from '../stores/useProjectStore';
import { useProjectIO } from './useProjectIO';

export type AutoSaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export function useAutoSave() {
  const [status, setStatus] = useState<AutoSaveStatus>('saved');
  const [lastError, setLastError] = useState<string | null>(null);
  const { saveProject } = useProjectIO();
  const currentProjectPath = useProjectStore((s) => s.currentProjectPath);
  
  // Use a ref to track if we have pending changes
  const isDirty = useRef(false);

  const performSave = useCallback(async () => {
    if (!currentProjectPath || !isDirty.current) return;
    
    setStatus('saving');
    try {
      await saveProject();
      isDirty.current = false;
      setStatus('saved');
      setLastError(null);
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      setStatus('error');
      setLastError(err.message || 'Failed to save project');
    }
  }, [currentProjectPath, saveProject]);

  // Debounced save (2000ms)
  const debouncedSave = useCallback(
    debounce(() => {
      performSave();
    }, 2000),
    [performSave]
  );

  // Subscribe to relevant store changes
  useEffect(() => {
    if (!currentProjectPath) return;

    // We subscribe to the whole state but filter for "content" changes
    // Alternatively, we could specify keys. 
    // For simplicity and robustness, any change to files, relations, sessions, or registry is a change.
    const unsub = useProjectStore.subscribe((state, prevState) => {
      // Avoid triggering on transient UI state changes if possible, 
      // but useProjectStore has mixed state. 
      // We check for structural data changes.
      if (
        state.files !== prevState.files ||
        state.sessions !== prevState.sessions ||
        state.widgetRegistry !== prevState.widgetRegistry ||
        state.activeSessionId !== prevState.activeSessionId ||
        state.activeView !== prevState.activeView
      ) {
        isDirty.current = true;
        setStatus('unsaved');
        debouncedSave();
      }
    });

    return () => {
      unsub();
      debouncedSave.cancel();
    };
  }, [currentProjectPath, debouncedSave]);

  // Save on blur
  useEffect(() => {
    const handleBlur = () => {
      if (isDirty.current) {
        debouncedSave.cancel();
        performSave();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [performSave, debouncedSave]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        // We can't await here reliably in all browsers, 
        // but Electron utility processes / main process handling often keeps it alive.
        // We trigger the save.
        performSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [performSave]);

  return { 
    status, 
    lastError,
    forceSave: performSave 
  };
}
