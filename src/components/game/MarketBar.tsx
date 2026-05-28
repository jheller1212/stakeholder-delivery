import type { Market } from '../../types/game'

interface Props {
  market: Market
}

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
}

const CONDITION_SYMBOL = { plus: '+', zero: '·', minus: '−' } as const
const CONDITION_RING = {
  plus: 'ring-green-400',
  zero: 'ring-gray-500',
  minus: 'ring-red-400',
} as const

export default function MarketBar({ market }: Props) {
  const colors = ['red', 'green', 'blue', 'yellow', 'purple'] as const

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Color dots */}
      <div className="flex items-center gap-2">
        {colors.map(color => {
          const condition = market[color]
          return (
            <div
              key={color}
              className={`relative w-6 h-6 rounded-full ${COLOR_BG[color]} ring-2 ${CONDITION_RING[condition]} flex items-center justify-center`}
              title={`${color}: ${condition}`}
            >
              <span className="text-white text-[10px] font-bold drop-shadow-sm">
                {CONDITION_SYMBOL[condition]}
              </span>
            </div>
          )
        })}
      </div>
      {/* RFR / MRP */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-gray-400">
          RFR <span className="text-amber-400 font-semibold">{market.rfr}</span>
        </span>
        <span className="text-gray-400">
          MRP <span className="text-amber-400 font-semibold">{market.mrp}</span>
        </span>
      </div>
    </div>
  )
}
