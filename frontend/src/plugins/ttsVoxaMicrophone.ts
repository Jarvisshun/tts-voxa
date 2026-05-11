import { registerPlugin } from '@capacitor/core'

export interface TtsVoxaMicrophonePlugin {
  checkMicPermission(): Promise<{ granted: boolean }>
  requestMicPermission(): Promise<{ granted: boolean; error?: string }>
  startMicRecording(): Promise<{ status: string }>
  stopMicRecording(): Promise<{ base64: string; format: string; size: number }>
}

export default registerPlugin<TtsVoxaMicrophonePlugin>('TtsVoxaMicrophone')
