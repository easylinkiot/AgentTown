import { Platform } from 'react-native';

export function isElectronDesktopShell() {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  const runtime = (window as typeof window & { uschatDesktop?: { shell?: string } }).uschatDesktop;
  return runtime?.shell === 'electron';
}
