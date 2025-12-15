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

export function UpdateModal() {
  const [open, setOpen] = useState(false)
  const [latestVersion, setLatestVersion] = useState('')

  useEffect(() => {
    const handleForceUpdate = (event: Event) => {
       const customEvent = event as CustomEvent;
       setLatestVersion(customEvent.detail || 'New Version');
       setOpen(true);
    }
    document.addEventListener('force-update', handleForceUpdate);
    return () => document.removeEventListener('force-update', handleForceUpdate);
  }, []);

  const handleDownload = () => {
    window.electronAPI.openExternal('https://wansan.app');
  }

  // Prevent closing by not providing onOpenChange handler that actually closes, 
  // and hiding the X button via CSS class in DialogContent if standard shadcn components are used.
  return (
    <Dialog open={open}> 
      <DialogContent className="sm:max-w-[425px] [&>button]:hidden pointer-events-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}> 
        <DialogHeader>
          <DialogTitle>Critical Update Required</DialogTitle>
          <DialogDescription>
            A new version ({latestVersion}) is available and required to continue using Wansan Studio.
            Please update to access the latest features and security fixes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDownload} className="w-full">Download Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
