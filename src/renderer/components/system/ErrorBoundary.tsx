import React from 'react';
import { Button } from '@/components/ui/button';
import { useLogStore } from '../../stores/useLogStore';
import i18n from '../../i18n';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Ideal: write to useLogStore via a helper (cannot use hooks in class components directly)
    // For now, we can manually get the store instance if needed, or rely on GlobalErrorHandler catching. 
    // Let GlobalErrorHandler handle global errors. This catches React render errors.
    void useLogStore.getState().addLog({
      type: 'error',
      message: error.message,
      stack: error.stack,
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{i18n.t('error_boundary_title', { ns: 'common' })}</h2>
          <p className="text-zinc-500 mb-4 max-w-md text-sm">
            {i18n.t('error_boundary_description', { ns: 'common', error_message: this.state.error?.message || 'unknown error' })}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>{i18n.t('error_boundary_reload_button', { ns: 'common' })}</Button>
            {/* Future: Add 'Export Logs' button here too */}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
