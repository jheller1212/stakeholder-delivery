import type { Player, Market } from '../../types/game'
import { assetMarketValue } from '../../lib/gameEngine'

interface Props {
  player: Player
  market: Market
  onClose: () => void
}

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
}

export default function StatsPanel({ player, market, onClose }: Props) {
  return (
    <div className="absolute top-20 left-4 z-40 panel-warm rounded-xl p-4 w-64 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Your Stats</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">close</button>
      </div>

      {/* Assets */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-500 uppercase mb-1">Assets ({player.assets.length})</p>
        {player.assets.length === 0 ? (
          <p className="text-xs text-gray-600">None</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {player.assets.map((a, i) => {
              const mv = assetMarketValue(a, market)
              return (
                <div key={i} className="bg-gray-800/80 rounded p-1.5 text-center">
                  <div className={`w-3 h-3 rounded-full ${COLOR_BG[a.color]} mx-auto mb-0.5`} />
                  <p className="text-[10px] text-amber-400 font-bold">{mv} gold</p>
                  {a.silver > 0 && <p className="text-[8px] text-gray-500">{a.silver}s</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Liabilities */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase mb-1">Liabilities ({player.liabilities.length})</p>
        {player.liabilities.length === 0 ? (
          <p className="text-xs text-gray-600">None</p>
        ) : (
          <div className="space-y-1">
            {player.liabilities.map((l, i) => {
              const cost = l.rfr_type === 'short_term'
                ? l.gold + market.rfr
                : l.gold + market.rfr + market.mrp
              return (
                <div key={i} className="flex items-center justify-between bg-gray-800/80 rounded px-2 py-1">
                  <span className="text-[10px] text-gray-400 capitalize">{l.rfr_type.replace('_', ' ')}</span>
                  <span className="text-[10px] text-red-400">-{cost} gold</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
