export interface YouTubePlayer {
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
  getIframe: () => HTMLIFrameElement
}

export interface YouTubePlayerOptions {
  videoId: string
  width: string
  height: string
  host: string
  playerVars: { origin: string; playsinline: number; rel: number }
  events: {
    onReady: (event: { target: YouTubePlayer }) => void
    onStateChange: (event: { target: YouTubePlayer; data: number }) => void
    onError: (event: { data: number }) => void
  }
}

export interface YouTubeIframeApi {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YouTubeIframeApi> | undefined

export function loadYouTubePlayerApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    const previousReady = window.onYouTubeIframeAPIReady

    function cleanUp() {
      window.clearTimeout(timeout)
      script.onerror = null
      window.onYouTubeIframeAPIReady = previousReady
    }

    function fail() {
      cleanUp()
      script.remove()
      reject(new Error('Não foi possível carregar o player do YouTube.'))
    }

    const timeout = window.setTimeout(fail, 15000)
    window.onYouTubeIframeAPIReady = () => {
      cleanUp()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('O player do YouTube não está disponível.'))
      previousReady?.()
    }
    script.onerror = fail
    document.head.append(script)
  }).catch((error: unknown) => {
    apiPromise = undefined
    throw error
  })
  return apiPromise
}
