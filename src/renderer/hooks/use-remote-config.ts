import { useEffect } from 'react';
import { useSettingsStore, RemoteConfig } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';
import semver from 'semver';

export function useRemoteConfig() {
  const setRemoteConfig = useSettingsStore(s => s.setRemoteConfig);
  const updateSettings = useSettingsStore(s => s.updateSettings);
  const dismissedAnnouncementId = useSettingsStore(s => s.dismissedAnnouncementId);
  const { addToast } = useToastStore();
  const appVersion = window.electronAPI.version.app; // Get real app version

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("https://api.wansan.app/v1/config", {
            headers: { 'X-App-Version': appVersion }
        });
        if (!res.ok) return;
        
        const data = await res.json();
        
        const config: RemoteConfig = {
            min_version: data.min_version,
            latest_version: data.latest_version,
            beta_code: data.beta_code,
            announcement: data.announcement,
            features: data.features,
        };
        
        setRemoteConfig(config);
        
        // Update validBetaCodes if present (backward compatibility / legacy field)
        if (Array.isArray(data.valid_beta_codes)) {
             updateSettings({ validBetaCodes: data.valid_beta_codes });
        }

        // 1. Force Update Check
        if (config.min_version && semver.lt(appVersion, config.min_version)) {
           // Dispatch global event for the modal
           const event = new CustomEvent('force-update', { detail: config.latest_version });
           document.dispatchEvent(event);
        }

        // 2. Announcement Check
        if (config.announcement && config.announcement.id !== dismissedAnnouncementId) {
            addToast({
                title: config.announcement.level === 'warning' ? 'Important' : 'Announcement',
                description: config.announcement.text,
                type: config.announcement.level === 'warning' ? 'error' : 'info',
                duration: 10000,
            });
            // We don't auto-dismiss here. A "Mark as read" feature would be needed in UI.
        }
      } catch (e) {
        console.error("Config fetch failed", e);
      }
    }
    fetchConfig();
  }, [setRemoteConfig, addToast, dismissedAnnouncementId, appVersion, updateSettings]);
}
