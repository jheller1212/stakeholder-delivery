import { useState } from 'react'
import type { Player, Market } from '../../types/game'
import { HandCard } from './CardDisplay'

interface Props {
  player: Player
  market: Market
}

export default function CardTray({ player, market }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`relative z-30 card-tray ${expanded ? '' : 'collapsed'}`}>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900/90 border-t border-gray-700/50 hover:bg-gray-800/90 transition-colors"
      >
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
          Your Cards ({player.hand.length})
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Card content */}
      <div className="bg-gray-900/95 px-4 pb-4 pt-2">
        {player.hand.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No cards in hand</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto card-scroll pb-1 justify-center">
            {player.hand.map((card, i) => (
              <div key={i} className="shrink-0">
                <HandCard card={card} market={market} small />
              </div>
            ))}
          </div>
        )}

        {/* Assets and liabilities summary */}
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase">Assets</span>
            <span className="text-[10px] text-amber-400 font-bold">{player.assets.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase">Liabilities</span>
            <span className="text-[10px] text-red-400 font-bold">{player.liabilities.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
