import { useState, useEffect, useCallback } from 'react'

interface UseIpcQueryResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useIpcQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseIpcQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setIsLoading(false))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}
