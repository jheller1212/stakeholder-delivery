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
  onDivestAsset: (targetPlayerId: string, assetIndex: number) => void
  onSwapHands: (targetPlayerId: string) => void
  onSwapWithDeck: (cardIndices: number[]) => void
  onTerminateCredit: (targetPlayerId: string) => void
  onRedeemLiability: (liabilityIndex: number) => void
}

export default function PlayPhase({
  state, player, isMyTurn,
  onBuyAsset, onIssueLiability, onEndTurn,
  onFireCharacter, onDivestAsset, onSwapHands, onSwapWithDeck,
  onTerminateCredit, onRedeemLiability,
}: Props) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [showAbility, setShowAbility] = useState(false)
  const [abilityTarget, setAbilityTarget] = useState<string | null>(null)
  const [divestAssetIdx, setDivestAssetIdx] = useState<number | null>(null)
  const [swapDeckIndices, setSwapDeckIndices] = useState<number[]>([])

  const maxAssets = getPlayableAssets(player.character)
  const maxLiabilities = getPlayableLiabilities(player.character)

  const canUseAbility = isMyTurn && !player.has_used_ability && (
    player.character === 'shareholder' ||
    player.character === 'stakeholder' ||
    player.character === 'regulator' ||
    player.character === 'banker' ||
    player.character === 'cfo'
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

  const handleAbilityConfirm = () => {
    if (player.character === 'shareholder' && abilityTarget) {
      onFireCharacter(abilityTarget)
    } else if (player.character === 'stakeholder' && abilityTarget && divestAssetIdx !== null) {
      onDivestAsset(abilityTarget, divestAssetIdx)
    } else if (player.character === 'regulator' && abilityTarget) {
      onSwapHands(abilityTarget)
    } else if (player.character === 'regulator' && swapDeckIndices.length > 0) {
      onSwapWithDeck(swapDeckIndices)
    } else if (player.character === 'banker' && abilityTarget) {
      onTerminateCredit(abilityTarget)
    }
    setShowAbility(false)
    setAbilityTarget(null)
    setDivestAssetIdx(null)
    setSwapDeckIndices([])
  }

  const otherPlayers = state.players.filter(p => p.user_id !== player.user_id)

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
        <p className="text-amber-400 text-sm font-semibold mt-1">Cash: {player.cash}g</p>
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

        {player.character === 'cfo' && player.liabilities.length > 0 && isMyTurn && (
          <button
            onClick={() => setShowAbility(!showAbility)}
            className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            Redeem Liability
          </button>
        )}

        <button
          onClick={onEndTurn}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-semibold rounded-lg transition-colors"
        >
          End Turn
        </button>
      </div>

      {/* Ability panels */}
      {showAbility && (
        <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-4 space-y-3">
          {/* Shareholder: Fire */}
          {player.character === 'shareholder' && (
            <>
              <h3 className="text-sm font-semibold text-orange-400">Fire a Character</h3>
              <p className="text-xs text-gray-400">Choose a player to skip their turn</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'banker' && p.character !== 'regulator').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAbilityTarget(p.id)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      abilityTarget === p.id ? 'border-orange-500 bg-orange-500/10 text-orange-300' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {p.name} ({p.character ? CHARACTER_INFO[p.character].name : '?'})
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Stakeholder: Divest */}
          {player.character === 'stakeholder' && (
            <>
              <h3 className="text-sm font-semibold text-red-400">Force Divestment</h3>
              <p className="text-xs text-gray-400">Choose a player, then select a non-green/red asset to divest</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'cso').map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setAbilityTarget(p.id); setDivestAssetIdx(null) }}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      abilityTarget === p.id ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {p.name} ({p.assets.length} assets)
                  </button>
                ))}
              </div>
              {abilityTarget && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {state.players.find(p => p.id === abilityTarget)?.assets
                    .filter(a => a.color !== 'green' && a.color !== 'red')
                    .map((a, i) => (
                      <button
                        key={i}
                        onClick={() => setDivestAssetIdx(i)}
                        className={`px-2 py-1 rounded border text-xs capitalize ${
                          divestAssetIdx === i ? 'border-red-500 bg-red-500/10' : 'border-gray-600 bg-gray-800'
                        } text-gray-300`}
                      >
                        {a.color} {a.gold}g
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Regulator: Swap hands or deck */}
          {player.character === 'regulator' && (
            <>
              <h3 className="text-sm font-semibold text-cyan-400">Regulator Ability</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Option 1: Swap your hand with another player</p>
                  <div className="flex flex-wrap gap-2">
                    {otherPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setAbilityTarget(p.id); setSwapDeckIndices([]) }}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          abilityTarget === p.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {p.name} ({p.hand.length} cards)
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Option 2: Return cards to deck and draw new ones</p>
                  <div className="flex flex-wrap gap-2">
                    {player.hand.map((card, i) => (
                      <HandCard
                        key={i}
                        card={card}
                        small
                        selected={swapDeckIndices.includes(i)}
                        onClick={() => {
                          setAbilityTarget(null)
                          setSwapDeckIndices(
                            swapDeckIndices.includes(i)
                              ? swapDeckIndices.filter(x => x !== i)
                              : [...swapDeckIndices, i]
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Banker: Terminate credit */}
          {player.character === 'banker' && (
            <>
              <h3 className="text-sm font-semibold text-gray-300">Terminate Credit Line</h3>
              <p className="text-xs text-gray-400">Target must sell assets or pay back liabilities</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'shareholder' && p.character !== 'regulator').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAbilityTarget(p.id)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      abilityTarget === p.id ? 'border-gray-400 bg-gray-400/10 text-gray-200' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {p.name} ({p.character ? CHARACTER_INFO[p.character].name : '?'})
                  </button>
                ))}
              </div>
            </>
          )}

          {/* CFO: Redeem liability */}
          {player.character === 'cfo' && (
            <>
              <h3 className="text-sm font-semibold text-blue-400">Redeem a Liability</h3>
              <p className="text-xs text-gray-400">Pay off a liability at its current cost</p>
              <div className="flex flex-wrap gap-2">
                {player.liabilities.map((l, i) => {
                  const cost = l.rfr_type === 'short_term'
                    ? l.gold + state.market.rfr
                    : l.gold + state.market.rfr + state.market.mrp
                  return (
                    <button
                      key={i}
                      onClick={() => onRedeemLiability(i)}
                      disabled={player.cash < cost}
                      className="px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/5 text-sm text-gray-300 hover:border-blue-500 disabled:opacity-40"
                    >
                      {l.rfr_type.replace('_', ' ')} {l.gold}g (cost: {cost}g)
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Confirm button */}
          {(abilityTarget || swapDeckIndices.length > 0) && player.character !== 'cfo' && (
            <button
              onClick={handleAbilityConfirm}
              disabled={player.character === 'stakeholder' && divestAssetIdx === null}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold rounded-lg text-sm"
            >
              Confirm
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
