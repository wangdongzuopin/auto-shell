import { useState, useCallback } from 'react'

interface UseIpcCommandResult<TInput extends unknown[], TOutput> {
  execute: (...args: TInput) => Promise<TOutput | null>
  data: TOutput | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useIpcCommand<TInput extends unknown[] = [], TOutput = void>(
  fn: (...args: TInput) => Promise<TOutput>
): UseIpcCommandResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (...args: TInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      setData(result)
      return result
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [fn])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return { execute, data, isLoading, error, reset }
}
