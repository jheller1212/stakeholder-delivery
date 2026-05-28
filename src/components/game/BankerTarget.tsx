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
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-amber-400">Credit Terminated</h2>
        <p className="text-gray-400">The Banker has terminated a player's credit line. Waiting for them to respond...</p>
      </div>
    )
  }

  const toggleAsset = (i: number) => {
    setSelectedAssets(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const toggleLiability = (i: number) => {
    setSelectedLiabilities(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-400">Credit Terminated!</h2>
        <p className="text-gray-400 text-sm">
          The Banker has terminated your credit line. You must sell assets and/or pay back liabilities.
        </p>
        <p className="text-amber-400 text-sm mt-1">Cash: {player.cash}g</p>
      </div>

      {player.assets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Sell Assets (at market value)</h3>
          <div className="flex flex-wrap gap-2">
            {player.assets.map((a, i) => {
              const condition = state.market[a.color]
              const value = a.gold + (condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0)
              return (
                <button
                  key={i}
                  onClick={() => toggleAsset(i)}
                  className={`px-3 py-2 rounded-lg border text-sm capitalize ${
                    selectedAssets.includes(i)
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
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
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Pay Back Liabilities</h3>
          <div className="flex flex-wrap gap-2">
            {player.liabilities.map((l, i) => {
              const cost = l.rfr_type === 'short_term'
                ? l.gold + state.market.rfr
                : l.gold + state.market.rfr + state.market.mrp
              return (
                <button
                  key={i}
                  onClick={() => toggleLiability(i)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    selectedLiabilities.includes(i)
                      ? 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
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
          className="px-6 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  )
}
