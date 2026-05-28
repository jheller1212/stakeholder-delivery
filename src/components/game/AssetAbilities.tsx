import { useState } from 'react'
import type { Player, GameState, CardColor } from '../../types/game'

const COLORS: CardColor[] = ['red', 'green', 'blue', 'yellow', 'purple']

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
}

interface Props {
  state: GameState
  player: Player
  isMyTurn: boolean
  onMinusIntoPlus: (assetIndex: number, color: CardColor) => void
  onSilverIntoGold: (purpleAssetIndex: number, targetAssetIndex: number) => void
  onChangeAssetColor: (purpleAssetIndex: number, targetAssetIndex: number, newColor: CardColor) => void
  onConfirm: () => void
}

export default function AssetAbilities({ state, player, isMyTurn, onMinusIntoPlus, onSilverIntoGold, onChangeAssetColor, onConfirm }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)

  const purpleAbilityAssets = player.assets
    .map((a, i) => ({ asset: a, index: i }))
    .filter(({ asset }) => asset.color === 'purple' && asset.ability)

  if (!isMyTurn) {
    const currentName = state.current_player_index !== null
      ? state.players[state.current_player_index].name
      : '...'
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="panel-warm rounded-lg px-6 py-2.5">
          <p className="text-purple-300 font-medium">{currentName} is using purple asset abilities...</p>
        </div>
      </div>
    )
  }

  if (purpleAbilityAssets.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <p className="text-purple-300 font-bold text-lg">Purple Asset Abilities</p>
          <p className="text-gray-500 text-xs mt-1">You have no purple assets with abilities.</p>
        </div>
        <div className="text-center">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-purple-700/80 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Continue to Results
          </button>
        </div>
      </div>
    )
  }

  const minusColors = COLORS.filter(c => state.market[c] === 'minus')

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <div className="text-center">
        <p className="text-purple-300 font-bold text-lg">Purple Asset Abilities</p>
        <p className="text-gray-500 text-xs mt-1">Use your purple asset abilities before final scoring</p>
      </div>

      {purpleAbilityAssets.map(({ asset, index }) => (
        <div key={index} className="panel-warm rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${COLOR_BG[asset.color]}`} />
            <span className="text-sm text-purple-300 font-semibold">
              {asset.ability === 'minus_into_plus' && 'Minus into Plus'}
              {asset.ability === 'silver_into_gold' && 'Silver into Gold'}
              {asset.ability === 'change_asset_color' && 'Change Asset Color'}
            </span>
            <span className="text-[10px] text-gray-500">({asset.gold} gold)</span>
          </div>

          {asset.ability === 'minus_into_plus' && (
            <div>
              <p className="text-[10px] text-gray-500 mb-2">Choose a color to flip from minus to plus</p>
              {minusColors.length === 0 ? (
                <p className="text-xs text-gray-600">No colors are currently minus</p>
              ) : (
                <div className="flex gap-2">
                  {minusColors.map(c => (
                    <button
                      key={c}
                      onClick={() => onMinusIntoPlus(index, c)}
                      className="px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-xs text-gray-400 hover:border-purple-500 capitalize"
                    >
                      <div className={`w-3 h-3 rounded-full ${COLOR_BG[c]} inline-block mr-1`} />
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {asset.ability === 'silver_into_gold' && (
            <div>
              <p className="text-[10px] text-gray-500 mb-2">Choose an asset to convert its silver to gold</p>
              <div className="flex flex-wrap gap-2">
                {player.assets.filter(a => a.silver > 0).map((a) => {
                  const realIndex = player.assets.indexOf(a)
                  return (
                    <button
                      key={realIndex}
                      onClick={() => onSilverIntoGold(index, realIndex)}
                      className="px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-xs text-gray-400 hover:border-purple-500 capitalize"
                    >
                      {a.color} ({a.gold} gold + {a.silver} silver)
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {asset.ability === 'change_asset_color' && (
            <div>
              <p className="text-[10px] text-gray-500 mb-2">Choose an asset, then pick a new color</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {player.assets.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTarget(i)}
                    className={`px-3 py-1.5 rounded-lg border text-xs capitalize ${
                      selectedTarget === i
                        ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {a.color} ({a.gold} gold)
                  </button>
                ))}
              </div>
              {selectedTarget !== null && (
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        onChangeAssetColor(index, selectedTarget, c)
                        setSelectedTarget(null)
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 text-xs text-gray-400 hover:border-purple-500 capitalize"
                    >
                      <div className={`w-3 h-3 rounded-full ${COLOR_BG[c]} inline-block mr-1`} />
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="text-center">
        <button
          onClick={onConfirm}
          className="px-6 py-2 bg-purple-700/80 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Done — Continue to Results
        </button>
      </div>
    </div>
  )
}
