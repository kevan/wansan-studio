import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { useTranslation } from 'react-i18next'

export function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null)
  const { t } = useTranslation('common')

  useEffect(() => {
    const handleForceUpdate = (event: Event) => {
       const customEvent = event as CustomEvent;
       const detail = customEvent.detail;
       
       if (detail && typeof detail === 'object') {
           setUpdateInfo(detail);
       } else {
           setUpdateInfo({ version: detail || 'New Version', url: 'https://wansan.app' });
       }
    }
    document.addEventListener('force-update', handleForceUpdate);
    return () => document.removeEventListener('force-update', handleForceUpdate);
  }, []);

  const handleDownload = () => {
    if (!updateInfo) return;
    if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(updateInfo.url);
    } else {
        window.open(updateInfo.url, '_blank');
    }
  }

  if (!updateInfo) return null;

  // Prevent closing by not providing onOpenChange handler that actually closes, 
  // and hiding the X button via CSS class in DialogContent if standard shadcn components are used.
  return (
    <Dialog open={true}> 
      <DialogContent className="sm:max-w-[425px] [&>button]:hidden pointer-events-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}> 
        <DialogHeader>
          <DialogTitle>{t('update_modal_title')}</DialogTitle>
          <DialogDescription>
            {t('update_modal_desc', { version: updateInfo.version })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDownload} className="w-full bg-red-600 hover:bg-red-700 text-white">{t('update_modal_button')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
