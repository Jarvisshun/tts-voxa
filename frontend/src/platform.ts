export function isNative(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform
}

export function isAndroid(): boolean {
  return (window as any).Capacitor?.getPlatform() === 'android'
}

export const APP_VERSION = '2.1.5'
