import { useState } from 'react'
import type { Player } from '../../types/game'
import { getDrawCount, getPutBackCount } from '../../lib/gameEngine'
import { HandCard } from './CardDisplay'

interface Props {
  player: Player
  isMyTurn: boolean
  onDrawCard: (type: 'asset' | 'liability') => void
  onPutBackCard: (handIndex: number) => void
}

export default function DrawPhase({ player, isMyTurn, onDrawCard, onPutBackCard }: Props) {
  const [putBackIndex, setPutBackIndex] = useState<number | null>(null)
  const drawCount = getDrawCount(player.character)
  const putBackCount = getPutBackCount(player.character)
  const drawnSoFar = player.total_cards_drawn
  const needsToDrawMore = drawnSoFar < drawCount
  const needsToPutBack = !needsToDrawMore && player.cards_drawn.length > 0

  if (!isMyTurn) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-amber-400">Drawing Phase</h2>
        <p className="text-gray-400">Waiting for the current player to draw cards...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-amber-400">
          {needsToDrawMore ? 'Draw Cards' : 'Put Back Cards'}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {needsToDrawMore
            ? `Draw ${drawCount - drawnSoFar} more card${drawCount - drawnSoFar !== 1 ? 's' : ''} (${drawnSoFar}/${drawCount})`
            : `Put back ${putBackCount} card${putBackCount !== 1 ? 's' : ''} from your hand`}
        </p>
      </div>

      {needsToDrawMore && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onDrawCard('asset')}
            className="px-6 py-4 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded-xl text-white font-semibold transition-colors"
          >
            Draw Asset
          </button>
          <button
            onClick={() => onDrawCard('liability')}
            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-xl text-white font-semibold transition-colors"
          >
            Draw Liability
          </button>
        </div>
      )}

      {needsToPutBack && (
        <div className="space-y-4">
          <p className="text-center text-gray-400 text-sm">Select a card to put back:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {player.hand.map((card, i) => (
              <HandCard
                key={i}
                card={card}
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
                className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Put Back Selected Card
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-400">Your Hand ({player.hand.length} cards)</h3>
        <div className="flex flex-wrap gap-2">
          {player.hand.map((card, i) => (
            <HandCard key={i} card={card} small />
          ))}
        </div>
      </div>
    </div>
  )
}
