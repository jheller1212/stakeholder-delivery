import { useEffect, useState } from 'react'
import { subscribeToGame } from '../lib/gameService'
import type { GameState, Character } from '../types/game'

export function useGame(gameId: string | undefined) {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) return

    setLoading(true)
    const unsubscribe = subscribeToGame(gameId, (gameState) => {
      setState(gameState)
      setLoading(false)
    })

    return unsubscribe
  }, [gameId])

  return { state, loading, error, setError }
}

export function useCurrentPlayer(state: GameState | null, userId: string | undefined) {
  if (!state || !userId) return null
  return state.players.find(p => p.user_id === userId) ?? null
}

export function useIsMyTurn(state: GameState | null, userId: string | undefined): boolean {
  if (!state || !userId || state.current_player_index === null) return false
  return state.players[state.current_player_index]?.user_id === userId
}

export function useAvailableCharacters(state: GameState | null): Character[] {
  if (!state) return []
  return ((state as unknown as Record<string, unknown>)._availableCharacters as Character[]) ?? []
}
