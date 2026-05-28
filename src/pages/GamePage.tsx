import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGame, useCurrentPlayer, useIsMyTurn, useAvailableCharacters } from '../hooks/useGame'
import {
  selectCharacter, drawCard, putBackCard, buyAsset, issueLiability, endTurn,
  fireCharacter, divestAsset, swapHands, swapWithDeck, terminateCredit, payBanker, redeemLiability,
} from '../lib/gameService'
import { processBotTurn, registerBot } from '../lib/botController'
import { isBotPlayer } from '../lib/botEngine'
import CharacterSelect from '../components/game/CharacterSelect'
import DrawPhase from '../components/game/DrawPhase'
import PlayPhase from '../components/game/PlayPhase'
import BankerTarget from '../components/game/BankerTarget'
import ResultsScreen from '../components/game/ResultsScreen'
import PlayerBar from '../components/game/PlayerBar'
import type { Character } from '../types/game'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { state, loading, error, setError } = useGame(gameId)
  const currentPlayer = useCurrentPlayer(state, user?.uid)
  const isMyTurn = useIsMyTurn(state, user?.uid)
  const availableCharacters = useAvailableCharacters(state)

  const botsInitialized = useRef(false)

  // Initialize bots from localStorage (set by LobbyPage)
  useEffect(() => {
    if (!gameId || botsInitialized.current) return
    botsInitialized.current = true

    const botsJson = localStorage.getItem(`bots-${gameId}`)
    if (botsJson) {
      try {
        const botEntries = JSON.parse(botsJson) as { user_id: string; difficulty: 'medium' | 'hard' }[]
        for (const bot of botEntries) {
          registerBot(bot.user_id, bot.difficulty)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [gameId])

  // Process bot turns when game state changes
  useEffect(() => {
    if (!state || !gameId) return
    if (state.phase === 'results') return

    // Check if any players are bots
    const hasBots = state.players.some(p => isBotPlayer(p.user_id))
    if (!hasBots) return

    // Small delay to let the UI render first
    const timer = setTimeout(() => {
      processBotTurn(gameId, state)
    }, 500)

    return () => clearTimeout(timer)
  }, [state, gameId])

  const handleError = (err: unknown) => {
    setError(err instanceof Error ? err.message : 'Something went wrong')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400">Loading game...</p>
      </div>
    )
  }

  if (!state || !currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4">
        <p className="text-gray-400">Game not found</p>
        <button onClick={() => navigate('/')} className="text-amber-400 hover:underline text-sm">
          Back to Home
        </button>
      </div>
    )
  }

  const bankerTarget = (state as unknown as Record<string, unknown>)._bankerTarget as string | null
  const isBankerTarget = bankerTarget === currentPlayer.id

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-amber-400">The Bottom (On)line</h1>
            <p className="text-xs text-gray-500">
              Room {state.room_code} · Round {state.turn_number}
              {state.is_final_round && <span className="text-red-400 ml-2">Final Round!</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-400 font-semibold">{currentPlayer.cash}g</p>
            <p className="text-xs text-gray-500">
              {currentPlayer.character?.replace(/_/g, ' ') || 'No character'}
            </p>
          </div>
        </div>

        {/* Players */}
        <PlayerBar
          players={state.players}
          currentPlayerIndex={state.current_player_index}
          myUserId={user!.uid}
        />

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs ml-2">
              dismiss
            </button>
          </div>
        )}

        {/* Phase content */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
          {state.phase === 'character_selection' && (
            <CharacterSelect
              availableCharacters={availableCharacters}
              state={state}
              isMyTurn={isMyTurn}
              currentPlayerCharacter={currentPlayer.character ?? undefined}
              onSelect={(character: Character) => {
                selectCharacter(gameId!, user!.uid, character).catch(handleError)
              }}
            />
          )}

          {state.phase === 'drawing' && (
            <DrawPhase
              player={currentPlayer}
              isMyTurn={isMyTurn}
              onDrawCard={(type) => {
                drawCard(gameId!, user!.uid, type).catch(handleError)
              }}
              onPutBackCard={(index) => {
                putBackCard(gameId!, user!.uid, index).catch(handleError)
              }}
            />
          )}

          {state.phase === 'playing' && (
            <PlayPhase
              state={state}
              player={currentPlayer}
              isMyTurn={isMyTurn}
              onBuyAsset={(index) => buyAsset(gameId!, user!.uid, index).catch(handleError)}
              onIssueLiability={(index) => issueLiability(gameId!, user!.uid, index).catch(handleError)}
              onEndTurn={() => endTurn(gameId!, user!.uid).catch(handleError)}
              onFireCharacter={(targetId) => fireCharacter(gameId!, user!.uid, targetId).catch(handleError)}
              onDivestAsset={(targetId, idx) => divestAsset(gameId!, user!.uid, targetId, idx).catch(handleError)}
              onSwapHands={(targetId) => swapHands(gameId!, user!.uid, targetId).catch(handleError)}
              onSwapWithDeck={(indices) => swapWithDeck(gameId!, user!.uid, indices).catch(handleError)}
              onTerminateCredit={(targetId) => terminateCredit(gameId!, user!.uid, targetId).catch(handleError)}
              onRedeemLiability={(idx) => redeemLiability(gameId!, user!.uid, idx).catch(handleError)}
            />
          )}

          {state.phase === 'banker_target' && (
            <BankerTarget
              state={state}
              player={currentPlayer}
              isBankerTarget={isBankerTarget}
              onPayBanker={(assets, liabilities) => payBanker(gameId!, user!.uid, assets, liabilities).catch(handleError)}
            />
          )}

          {state.phase === 'results' && (
            <ResultsScreen
              state={state}
              onLeave={() => navigate('/')}
            />
          )}
        </div>

        {/* Leave game link */}
        {state.phase !== 'results' && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Leave Game
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
