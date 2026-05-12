export function isNative(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform
}

export function isAndroid(): boolean {
  return (window as any).Capacitor?.getPlatform() === 'android'
}

declare const __APP_VERSION__: string
export const APP_VERSION = __APP_VERSION__
