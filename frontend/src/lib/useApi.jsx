import { useState, useCallback } from "react"

export function useApi() {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (fn) => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await fn()
      setState({ data, loading: false, error: null })
      return data
    } catch (err) {
      setState({ data: null, loading: false, error: err.message })
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}