import { useEffect, useState } from 'react'
import { listRecentDebates } from './snapshots'
import type { RecentDebate } from '../types'

export function useRecentDebates() {
  const [debates, setDebates] = useState<RecentDebate[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listRecentDebates(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setDebates(result)
      setStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  return {
    debates,
    status,
    retry: () => { setStatus('loading'); setAttempt((value) => value + 1) },
  }
}
