import type { Market, GameEvent } from '../../types/game'

interface Props {
  market: Market
  events: GameEvent[]
}

const CONDITION_LABEL = { plus: '+1', zero: '0', minus: '-1' } as const
const CONDITION_COLOR = {
  plus: 'text-green-400',
  zero: 'text-gray-400',
  minus: 'text-red-400',
} as const

const COLOR_DOT: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
}

export default function MarketDisplay({ market, events }: Props) {
  const colors = ['red', 'green', 'blue', 'yellow', 'purple'] as const

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Market Conditions</h3>

      <div className="flex gap-4 mb-3">
        <div className="text-center">
          <p className="text-xs text-gray-500">RFR</p>
          <p className="text-lg font-bold text-amber-400">{market.rfr}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">MRP</p>
          <p className="text-lg font-bold text-amber-400">{market.mrp}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {colors.map(color => {
          const condition = market[color]
          return (
            <div key={color} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${COLOR_DOT[color]}`} />
              <span className={`text-sm font-mono ${CONDITION_COLOR[condition]}`}>
                {CONDITION_LABEL[condition]}
              </span>
            </div>
          )
        })}
      </div>

      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          {events.map(event => (
            <div key={event.id} className="text-xs">
              <span className="text-amber-400 font-semibold">{event.title}</span>
              <span className="text-gray-400 ml-1">— {event.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
