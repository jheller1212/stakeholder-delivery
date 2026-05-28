import type { GameState, Character } from '../../types/game'
import { calculateScore } from '../../lib/gameEngine'

interface Props {
  state: GameState
  onLeave: () => void
}

const CHARACTER_PORTRAITS: Partial<Record<Character, string>> = {
  head_of_rnd: '/characters/head_of_rnd.png',
  ceo: '/characters/ceo.png',
  cso: '/characters/cso.png',
  cfo: '/characters/cfo.png',
  shareholder: '/characters/shareholder.png',
  stakeholder: '/characters/stakeholder.png',
  banker: '/characters/banker.png',
}

const RANK_STYLES = [
  'border-amber-500 bg-amber-500/5',
  'border-gray-400 bg-gray-400/5',
  'border-amber-700 bg-amber-700/5',
]

export default function ResultsScreen({ state, onLeave }: Props) {
  const scores = state.players
    .map(p => ({
      player: p,
      score: calculateScore(p, state.market),
    }))
    .sort((a, b) => b.score.total - a.score.total)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <p className="text-amber-300 font-bold text-2xl">Game Over</p>
        <p className="text-gray-500 text-xs mt-1">Final standings after {state.turn_number} rounds</p>
      </div>

      <div className="space-y-3">
        {scores.map(({ player, score }, rank) => {
          const portrait = player.character ? CHARACTER_PORTRAITS[player.character] : null
          return (
            <div
              key={player.id}
              className={`panel-warm rounded-xl p-4 border ${RANK_STYLES[rank] || 'border-gray-800'}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <span className={`text-2xl font-bold w-8 text-center ${
                  rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-gray-400' : rank === 2 ? 'text-amber-700' : 'text-gray-600'
                }`}>
                  {rank + 1}
                </span>

                {/* Portrait */}
                {portrait ? (
                  <img src={portrait} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-700" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 font-bold">
                    {player.name[0]?.toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 text-sm">{player.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{player.character?.replace(/_/g, ' ')}</p>
                </div>

                {/* Score */}
                <span className={`text-xl font-bold ${rank === 0 ? 'text-amber-400' : 'text-gray-200'}`}>
                  {score.total}
                </span>
              </div>

              {/* Score breakdown bar */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-gray-900/60 rounded px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Assets</p>
                  <p className="text-green-400 font-semibold text-sm">+{score.assetValue}</p>
                </div>
                <div className="bg-gray-900/60 rounded px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Liabilities</p>
                  <p className="text-red-400 font-semibold text-sm">-{score.liabilityValue}</p>
                </div>
                <div className="bg-gray-900/60 rounded px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Cash</p>
                  <p className="text-amber-400 font-semibold text-sm">{score.cashValue}</p>
                </div>
              </div>

              <details className="mt-2">
                <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">Score Breakdown</summary>
                <ul className="mt-1 space-y-0.5 text-[10px] text-gray-500">
                  {score.breakdown.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </details>

              <details className="mt-1">
                <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">Economic Explanation</summary>
                <div className="mt-1 space-y-1.5">
                  {score.explanations.map((text, i) => (
                    <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{text}</p>
                  ))}
                </div>
              </details>
            </div>
          )
        })}
      </div>

      {/* Final market */}
      <div className="panel-warm rounded-xl p-3 text-center">
        <p className="text-[10px] text-gray-500 uppercase mb-2">Final Market</p>
        <div className="flex justify-center gap-4 text-xs">
          <span className="text-gray-500">RFR: <span className="text-amber-400">{state.market.rfr}</span></span>
          <span className="text-gray-500">MRP: <span className="text-amber-400">{state.market.mrp}</span></span>
        </div>
        <div className="flex justify-center gap-3 mt-1.5">
          {(['red', 'green', 'blue', 'yellow', 'purple'] as const).map(color => (
            <span key={color} className="text-[10px] text-gray-500 capitalize">
              {color}: <span className={
                state.market[color] === 'plus' ? 'text-green-400' :
                state.market[color] === 'minus' ? 'text-red-400' : 'text-gray-600'
              }>
                {state.market[color] === 'plus' ? '+1' : state.market[color] === 'minus' ? '-1' : '0'}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onLeave}
          className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
