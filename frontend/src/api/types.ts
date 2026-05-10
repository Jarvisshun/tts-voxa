export interface TTSRequest {
  text: string
  model?: string
  voice?: string
  format?: string
  speed?: number
  emotion?: string
}

export interface TTSResponse {
  success: boolean
  data?: {
    audio: string
    format: string
    generation_id: string
  }
  error?: { code: string; message: string }
}

export interface VoiceDesignRequest {
  description: string
  text: string
  format?: string
}

export interface BatchCreateRequest {
  name: string
  texts: string[]
  voice?: string
  model?: string
  format?: string
  speed?: number
}

export interface UpdateInfo {
  current: string
  latest: string
  has_update: boolean
  download_url: string | null
  release_notes: string | null
  error?: string
}
