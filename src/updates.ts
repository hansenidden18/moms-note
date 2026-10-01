import { registerSW } from "virtual:pwa-register";

let activate: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function startWebUpdates() {
  activate = registerSW({
    onOfflineReady() {
      window.dispatchEvent(new Event("hayati-offline-ready"));
    },
    onNeedRefresh() {
      window.dispatchEvent(new Event("hayati-update-ready"));
    },
  });
}

export function applyWebUpdate() {
  return activate?.(true);
}
