import { useEffect, useRef, useState } from 'react'
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
import PlayerSeats from '../components/game/PlayerSeats'
import MarketBar from '../components/game/MarketBar'
import CardTray from '../components/game/CardTray'
import StatsPanel from '../components/game/StatsPanel'
import type { Character } from '../types/game'

const CHARACTER_PORTRAITS: Partial<Record<Character, string>> = {
  head_of_rnd: '/characters/head_of_rnd.png',
  ceo: '/characters/ceo.png',
  cso: '/characters/cso.png',
  cfo: '/characters/cfo.png',
  shareholder: '/characters/shareholder.png',
  stakeholder: '/characters/stakeholder.png',
  banker: '/characters/banker.png',
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { state, loading, error, setError } = useGame(gameId)
  const currentPlayer = useCurrentPlayer(state, user?.uid)
  const isMyTurn = useIsMyTurn(state, user?.uid)
  const availableCharacters = useAvailableCharacters(state)
  const [showStats, setShowStats] = useState(false)

  const botsInitialized = useRef(false)

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
      } catch { /* ignore */ }
    }
  }, [gameId])

  useEffect(() => {
    if (!state || !gameId || state.phase === 'results') return
    const hasBots = state.players.some(p => isBotPlayer(p.user_id))
    if (!hasBots) return
    const timer = setTimeout(() => { processBotTurn(gameId, state) }, 500)
    return () => clearTimeout(timer)
  }, [state, gameId])

  const handleError = (err: unknown) => {
    setError(err instanceof Error ? err.message : 'Something went wrong')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center game-bg">
        <p className="text-amber-400/60 text-lg">Entering the boardroom...</p>
      </div>
    )
  }

  if (!state || !currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center game-bg gap-4">
        <p className="text-gray-400">Game not found</p>
        <button onClick={() => navigate('/')} className="text-amber-400 hover:underline text-sm">
          Back to Home
        </button>
      </div>
    )
  }

  const bankerTarget = (state as unknown as Record<string, unknown>)._bankerTarget as string | null
  const isBankerTarget = bankerTarget === currentPlayer.id
  const portrait = currentPlayer.character ? CHARACTER_PORTRAITS[currentPlayer.character] : null

  return (
    <div className="min-h-screen game-bg flex flex-col relative overflow-hidden">
      {/* Top bar */}
      <div className="relative z-20 flex items-start justify-between px-4 pt-3">
        {/* Player info (top-left) */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="relative"
          >
            {portrait ? (
              <img
                src={portrait}
                alt={currentPlayer.character || ''}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/50"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-lg font-bold">
                {currentPlayer.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {currentPlayer.cash}g
            </span>
          </button>
          <div className="text-xs mt-1">
            <p className="text-amber-300 font-semibold">{currentPlayer.name}</p>
            <p className="text-gray-500">{currentPlayer.character?.replace(/_/g, ' ') || 'No role'}</p>
          </div>
        </div>

        {/* Market conditions (top-center) */}
        <MarketBar market={state.market} />

        {/* Round info (top-right) */}
        <div className="text-right text-xs">
          <p className="text-gray-500">Round {state.turn_number}</p>
          {state.is_final_round && <p className="text-red-400 font-semibold">Final Round</p>}
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-400 text-[10px] mt-1 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Stats panel (expandable) */}
      {showStats && (
        <StatsPanel player={currentPlayer} market={state.market} onClose={() => setShowStats(false)} />
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 rounded-lg px-4 py-2 text-red-200 text-sm flex items-center gap-2 max-w-md">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs ml-2 shrink-0">
            dismiss
          </button>
        </div>
      )}

      {/* Main center content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-4">
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
            market={state.market}
            onDrawCard={(type) => drawCard(gameId!, user!.uid, type).catch(handleError)}
            onPutBackCard={(index) => putBackCard(gameId!, user!.uid, index).catch(handleError)}
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
          <ResultsScreen state={state} onLeave={() => navigate('/')} />
        )}
      </div>

      {/* Player seats (bottom area, above card tray) */}
      {state.phase !== 'results' && (
        <PlayerSeats
          players={state.players}
          currentPlayerIndex={state.current_player_index}
          myUserId={user!.uid}
        />
      )}

      {/* Card tray (bottom) */}
      {state.phase !== 'results' && state.phase !== 'character_selection' && (
        <CardTray player={currentPlayer} market={state.market} />
      )}
    </div>
  )
}
