import { useState } from 'react'
import type { Player, GameState } from '../../types/game'

interface Props {
  state: GameState
  player: Player
  isBankerTarget: boolean
  onPayBanker: (assetIndices: number[], liabilityIndices: number[]) => void
}

export default function BankerTarget({ state, player, isBankerTarget, onPayBanker }: Props) {
  const [selectedAssets, setSelectedAssets] = useState<number[]>([])
  const [selectedLiabilities, setSelectedLiabilities] = useState<number[]>([])

  if (!isBankerTarget) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="panel-warm rounded-lg px-6 py-2.5">
          <p className="text-red-400 font-medium">Credit Terminated</p>
        </div>
        <p className="text-gray-500 text-sm">The Banker has terminated a player's credit. Waiting for their response...</p>
      </div>
    )
  }

  const toggleAsset = (i: number) => setSelectedAssets(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  const toggleLiability = (i: number) => setSelectedLiabilities(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <div className="text-center">
        <p className="text-red-400 font-bold text-lg">Credit Terminated!</p>
        <p className="text-gray-500 text-xs mt-1">
          You must sell assets and/or pay back liabilities. Cash: <span className="text-amber-400">{player.cash}g</span>
        </p>
      </div>

      {player.assets.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-2">Sell Assets (at market value)</p>
          <div className="flex flex-wrap gap-2">
            {player.assets.map((a, i) => {
              const condition = state.market[a.color]
              const value = a.gold + (condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0)
              return (
                <button
                  key={i}
                  onClick={() => toggleAsset(i)}
                  className={`px-3 py-1.5 rounded-lg border text-xs capitalize ${
                    selectedAssets.includes(i)
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {a.color} {a.gold}g (value: {value}g)
                </button>
              )
            })}
          </div>
        </div>
      )}

      {player.liabilities.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-2">Pay Back Liabilities</p>
          <div className="flex flex-wrap gap-2">
            {player.liabilities.map((l, i) => {
              const cost = l.rfr_type === 'short_term'
                ? l.gold + state.market.rfr
                : l.gold + state.market.rfr + state.market.mrp
              return (
                <button
                  key={i}
                  onClick={() => toggleLiability(i)}
                  className={`px-3 py-1.5 rounded-lg border text-xs ${
                    selectedLiabilities.includes(i)
                      ? 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {l.rfr_type.replace('_', ' ')} (cost: {cost}g)
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => onPayBanker(selectedAssets, selectedLiabilities)}
          disabled={selectedAssets.length === 0 && selectedLiabilities.length === 0}
          className="px-6 py-2 bg-red-700/80 hover:bg-red-600 disabled:opacity-30 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  )
}
