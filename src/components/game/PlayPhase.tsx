import { useState } from 'react'
import type { Player, GameState } from '../../types/game'
import { CHARACTER_INFO } from '../../types/game'
import { getPlayableAssets, getPlayableLiabilities } from '../../lib/gameEngine'
import { HandCard, isAsset } from './CardDisplay'
import MarketDisplay from './MarketDisplay'

interface Props {
  state: GameState
  player: Player
  isMyTurn: boolean
  onBuyAsset: (handIndex: number) => void
  onIssueLiability: (handIndex: number) => void
  onEndTurn: () => void
  onFireCharacter: (targetPlayerId: string) => void
}

export default function PlayPhase({ state, player, isMyTurn, onBuyAsset, onIssueLiability, onEndTurn, onFireCharacter }: Props) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [showAbility, setShowAbility] = useState(false)
  const [fireTarget, setFireTarget] = useState<string | null>(null)

  const maxAssets = getPlayableAssets(player.character)
  const maxLiabilities = getPlayableLiabilities(player.character)

  const canUseAbility = isMyTurn && !player.has_used_ability && (
    player.character === 'shareholder' ||
    player.character === 'stakeholder' ||
    player.character === 'regulator' ||
    player.character === 'banker'
  )

  const handleAction = () => {
    if (selectedCard === null) return
    const card = player.hand[selectedCard]
    if (isAsset(card)) {
      onBuyAsset(selectedCard)
    } else {
      onIssueLiability(selectedCard)
    }
    setSelectedCard(null)
  }

  const handleFire = () => {
    if (!fireTarget) return
    onFireCharacter(fireTarget)
    setShowAbility(false)
    setFireTarget(null)
  }

  const fireableTargets = state.players.filter(p =>
    p.user_id !== player.user_id &&
    p.character !== 'banker' &&
    p.character !== 'regulator'
  )

  if (!isMyTurn) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-amber-400">Playing Phase</h2>
          <p className="text-gray-400 text-sm">
            {state.current_player_index !== null
              ? `${state.players[state.current_player_index].name} is playing...`
              : 'Waiting...'}
          </p>
        </div>
        <MarketDisplay market={state.market} events={state.current_events} />
        <MyAssets player={player} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-amber-400">Your Turn</h2>
        <p className="text-gray-400 text-sm">
          Buy assets ({maxAssets} max) or issue liabilities ({maxLiabilities} max)
        </p>
        <p className="text-amber-400 text-sm font-semibold mt-1">
          Cash: {player.cash}g
        </p>
      </div>

      <MarketDisplay market={state.market} events={state.current_events} />

      {/* Hand */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-400">Your Hand</h3>
        {player.hand.length === 0 ? (
          <p className="text-gray-500 text-sm">No cards in hand</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {player.hand.map((card, i) => (
              <HandCard
                key={i}
                card={card}
                market={state.market}
                selected={selectedCard === i}
                onClick={() => setSelectedCard(selectedCard === i ? null : i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {selectedCard !== null && (
          <button
            onClick={handleAction}
            className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
          >
            {isAsset(player.hand[selectedCard]) ? 'Buy Asset' : 'Issue Liability'}
          </button>
        )}

        {canUseAbility && (
          <button
            onClick={() => setShowAbility(!showAbility)}
            className="px-6 py-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors"
          >
            Use Ability
          </button>
        )}

        <button
          onClick={onEndTurn}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-semibold rounded-lg transition-colors"
        >
          End Turn
        </button>
      </div>

      {/* Ability panel */}
      {showAbility && player.character === 'shareholder' && (
        <div className="bg-gray-900 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-orange-400">Fire a Character</h3>
          <p className="text-xs text-gray-400">Choose a player to skip their turn this round</p>
          <div className="flex flex-wrap gap-2">
            {fireableTargets.map(p => (
              <button
                key={p.id}
                onClick={() => setFireTarget(p.id)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  fireTarget === p.id
                    ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                {p.name} ({p.character ? CHARACTER_INFO[p.character].name : '?'})
              </button>
            ))}
          </div>
          {fireTarget && (
            <button
              onClick={handleFire}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm"
            >
              Confirm Fire
            </button>
          )}
        </div>
      )}

      <MyAssets player={player} />
    </div>
  )
}

function MyAssets({ player }: { player: Player }) {
  return (
    <div className="space-y-3">
      {player.assets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-1">Your Assets ({player.assets.length})</h3>
          <div className="flex flex-wrap gap-2">
            {player.assets.map((a, i) => (
              <div key={i} className={`px-2 py-1 rounded border text-xs capitalize
                ${a.color === 'red' ? 'border-red-500/50 text-red-300' :
                  a.color === 'green' ? 'border-green-500/50 text-green-300' :
                  a.color === 'blue' ? 'border-blue-500/50 text-blue-300' :
                  a.color === 'yellow' ? 'border-yellow-500/50 text-yellow-300' :
                  'border-purple-500/50 text-purple-300'}`}
              >
                {a.color} {a.gold}g {a.silver > 0 ? `${a.silver}s` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {player.liabilities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-1">Your Liabilities ({player.liabilities.length})</h3>
          <div className="flex flex-wrap gap-2">
            {player.liabilities.map((l, i) => (
              <div key={i} className="px-2 py-1 rounded border border-gray-500/50 text-xs text-gray-300">
                {l.rfr_type.replace('_', ' ')} {l.gold}g
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
