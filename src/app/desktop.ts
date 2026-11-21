/**
 * Bridge to the Electron desktop shell (exposed by electron/preload.cjs).
 * Undefined in the browser build.
 */
export interface DesktopBridge {
  platform: string;
  version: string;
  quit(): void;
  setHardwareAcceleration(enabled: boolean): void;
  getHardwareAcceleration(): boolean;
  recordLicenseAcceptance(hash: string): void;
  licenseAcceptedHash(): string | null;
  toggleFullscreen(): void;
  saveFile(name: string, contents: string): Promise<boolean>;
  openFile(): Promise<string | null>;
}

declare global {
  interface Window {
    substationDesktop?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | undefined = typeof window !== 'undefined' ? window.substationDesktop : undefined;
export const isDesktop = !!desktop;
