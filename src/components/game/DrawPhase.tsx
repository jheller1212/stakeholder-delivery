import { useState } from 'react'
import type { Player, Market, GameState } from '../../types/game'
import { getDrawCount, getPutBackCount } from '../../lib/gameEngine'
import { HandCard } from './CardDisplay'
import BotTurnOverlay from './BotTurnOverlay'
import { isBotPlayer } from '../../lib/botEngine'

interface Props {
  player: Player
  isMyTurn: boolean
  market: Market
  state: GameState
  onDrawCard: (type: 'asset' | 'liability') => void
  onPutBackCard: (handIndex: number) => void
}

export default function DrawPhase({ player, isMyTurn, market, state, onDrawCard, onPutBackCard }: Props) {
  const [putBackIndex, setPutBackIndex] = useState<number | null>(null)
  const drawCount = getDrawCount(player.character)
  const putBackCount = getPutBackCount(player.character)
  const drawnSoFar = player.total_cards_drawn
  const needsToDrawMore = drawnSoFar < drawCount
  const needsToPutBack = !needsToDrawMore && player.cards_drawn.length > 0

  if (!isMyTurn) {
    const activePlayer = state.current_player_index !== null ? state.players[state.current_player_index] : null
    if (activePlayer && isBotPlayer(activePlayer.user_id)) {
      return <BotTurnOverlay player={activePlayer} phase="drawing" />
    }
    return (
      <div className="flex flex-col items-center gap-4">
        <img src="/chairman.png" alt="Chairman" className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40" />
        <div className="panel-warm rounded-lg px-6 py-2.5">
          <p className="text-amber-300 font-medium">
            {activePlayer ? `${activePlayer.name} is drawing cards...` : 'Drawing Phase'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <p className="text-amber-300 font-bold text-lg">
          {needsToDrawMore ? 'Draw Cards' : 'Put Back Cards'}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {needsToDrawMore
            ? `Draw ${drawCount - drawnSoFar} more card${drawCount - drawnSoFar !== 1 ? 's' : ''} (${drawnSoFar}/${drawCount})`
            : `Put back ${putBackCount} card${putBackCount !== 1 ? 's' : ''} from your hand`}
        </p>
      </div>

      {needsToDrawMore && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onDrawCard('asset')}
            className="px-8 py-5 panel-warm rounded-xl hover:bg-gray-800/90 transition-all group"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-emerald-400 font-semibold text-sm">Draw Asset</span>
            </div>
          </button>
          <button
            onClick={() => onDrawCard('liability')}
            className="px-8 py-5 panel-warm rounded-xl hover:bg-gray-800/90 transition-all group"
          >
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <span className="text-gray-400 font-semibold text-sm">Draw Liability</span>
            </div>
          </button>
        </div>
      )}

      {needsToPutBack && (
        <div className="space-y-4">
          <p className="text-center text-gray-500 text-xs">Select a card to put back:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {player.hand.map((card, i) => (
              <HandCard
                key={i}
                card={card}
                market={market}
                selected={putBackIndex === i}
                onClick={() => setPutBackIndex(putBackIndex === i ? null : i)}
              />
            ))}
          </div>
          {putBackIndex !== null && (
            <div className="text-center">
              <button
                onClick={() => {
                  onPutBackCard(putBackIndex)
                  setPutBackIndex(null)
                }}
                className="px-6 py-2 bg-red-700/80 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Put Back Selected Card
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
