import { useState } from 'react'
import type { Player, GameState } from '../../types/game'
import { CHARACTER_INFO } from '../../types/game'
import { getPlayableAssets, getPlayableLiabilities } from '../../lib/gameEngine'
import { HandCard, isAsset } from './CardDisplay'

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
      <div className="flex flex-col items-center gap-4">
        <img src="/chairman.png" alt="Chairman" className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40" />
        <div className="panel-warm rounded-lg px-6 py-2.5">
          <p className="text-amber-300 font-medium">
            {state.current_player_index !== null
              ? `${state.players[state.current_player_index].name} is playing...`
              : 'Waiting...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      {/* Turn header */}
      <div className="text-center">
        <p className="text-amber-300 font-bold text-lg">Your Turn</p>
        <p className="text-gray-500 text-xs mt-1">
          Buy assets ({maxAssets} max) · Issue liabilities ({maxLiabilities} max) · Cash: <span className="text-amber-400">{player.cash} gold</span>
        </p>
      </div>

      {/* Events */}
      {state.current_events.length > 0 && (
        <div className="panel-warm rounded-lg p-3 space-y-1">
          {state.current_events.map(event => (
            <div key={event.id} className="text-xs">
              <span className="text-amber-400 font-semibold">{event.title}</span>
              <span className="text-gray-500 ml-1.5">— {event.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hand cards */}
      {player.hand.length > 0 && (
        <div className="flex flex-wrap gap-2.5 justify-center">
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {selectedCard !== null && (
          <button
            onClick={handleAction}
            className="px-5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {isAsset(player.hand[selectedCard]) ? 'Buy Asset' : 'Issue Liability'}
          </button>
        )}

        {canUseAbility && (
          <button
            onClick={() => setShowAbility(!showAbility)}
            className="px-5 py-2 bg-purple-700/60 hover:bg-purple-600/80 text-purple-200 font-semibold rounded-lg transition-colors text-sm border border-purple-500/30"
          >
            Use Ability
          </button>
        )}

        {player.character === 'cfo' && player.liabilities.length > 0 && isMyTurn && (
          <button
            onClick={() => setShowAbility(!showAbility)}
            className="px-5 py-2 bg-blue-700/60 hover:bg-blue-600/80 text-blue-200 font-semibold rounded-lg transition-colors text-sm border border-blue-500/30"
          >
            Redeem Liability
          </button>
        )}

        <button
          onClick={onEndTurn}
          className="px-5 py-2 panel-warm hover:bg-gray-800/90 text-gray-300 font-semibold rounded-lg transition-colors text-sm"
        >
          End Turn
        </button>
      </div>

      {/* Ability panel */}
      {showAbility && (
        <div className="panel-warm rounded-xl p-4 space-y-3">
          {/* Shareholder: Fire */}
          {player.character === 'shareholder' && (
            <>
              <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Fire a Character</h3>
              <p className="text-[10px] text-gray-500">Choose a player to skip their turn</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'banker' && p.character !== 'regulator').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAbilityTarget(p.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      abilityTarget === p.id ? 'border-orange-500 bg-orange-500/10 text-orange-300' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
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
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Force Divestment</h3>
              <p className="text-[10px] text-gray-500">Choose a player, then select a non-green/red asset</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'cso').map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setAbilityTarget(p.id); setDivestAssetIdx(null) }}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      abilityTarget === p.id ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
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
                        className={`px-2 py-1 rounded border text-[10px] capitalize ${
                          divestAssetIdx === i ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-gray-700 bg-gray-800/50 text-gray-400'
                        }`}
                      >
                        {a.color} ({a.gold} gold)
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Regulator */}
          {player.character === 'regulator' && (
            <>
              <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Regulator Ability</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-500 mb-2">Option 1: Swap hand with a player</p>
                  <div className="flex flex-wrap gap-2">
                    {otherPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setAbilityTarget(p.id); setSwapDeckIndices([]) }}
                        className={`px-3 py-1.5 rounded-lg border text-xs ${
                          abilityTarget === p.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {p.name} ({p.hand.length} cards)
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <p className="text-[10px] text-gray-500 mb-2">Option 2: Return cards and draw new</p>
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

          {/* Banker */}
          {player.character === 'banker' && (
            <>
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Terminate Credit Line</h3>
              <p className="text-[10px] text-gray-500">Target must sell assets or pay back liabilities</p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.filter(p => p.character !== 'shareholder' && p.character !== 'regulator').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAbilityTarget(p.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      abilityTarget === p.id ? 'border-gray-400 bg-gray-400/10 text-gray-200' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {p.name} ({p.character ? CHARACTER_INFO[p.character].name : '?'})
                  </button>
                ))}
              </div>
            </>
          )}

          {/* CFO: Redeem */}
          {player.character === 'cfo' && (
            <>
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Redeem a Liability</h3>
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
                      className="px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-gray-400 hover:border-blue-500 disabled:opacity-30"
                    >
                      {l.rfr_type.replace('_', ' ')} +{l.gold} gold (costs {cost})
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Confirm */}
          {(abilityTarget || swapDeckIndices.length > 0) && player.character !== 'cfo' && (
            <button
              onClick={handleAbilityConfirm}
              disabled={player.character === 'stakeholder' && divestAssetIdx === null}
              className="px-4 py-1.5 bg-purple-700/80 hover:bg-purple-600 disabled:opacity-30 text-white font-semibold rounded-lg text-xs"
            >
              Confirm
            </button>
          )}
        </div>
      )}
    </div>
  )
}
