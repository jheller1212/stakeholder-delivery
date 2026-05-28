import type { GameState } from '../../types/game'
import { calculateScore } from '../../lib/gameEngine'

interface Props {
  state: GameState
  onLeave: () => void
}

export default function ResultsScreen({ state, onLeave }: Props) {
  const scores = state.players
    .map(p => ({
      player: p,
      score: calculateScore(p, state.market),
    }))
    .sort((a, b) => b.score.total - a.score.total)

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-400">Game Over</h2>
        <p className="text-gray-400 mt-1">Final standings after {state.turn_number} rounds</p>
      </div>

      <div className="space-y-4">
        {scores.map(({ player, score }, rank) => (
          <div
            key={player.id}
            className={`bg-gray-900/80 border rounded-xl p-5 ${
              rank === 0 ? 'border-amber-500' : 'border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${rank === 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  #{rank + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-100">{player.name}</p>
                  <p className="text-xs text-gray-400">{player.character?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${rank === 0 ? 'text-amber-400' : 'text-gray-200'}`}>
                {score.total}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-gray-800 rounded-lg p-2">
                <p className="text-gray-500 text-xs">Assets</p>
                <p className="text-green-400 font-semibold">+{score.assetValue}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <p className="text-gray-500 text-xs">Liabilities</p>
                <p className="text-red-400 font-semibold">-{score.liabilityValue}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <p className="text-gray-500 text-xs">Cash</p>
                <p className="text-amber-400 font-semibold">{score.cashValue}</p>
              </div>
            </div>

            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                Score breakdown
              </summary>
              <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                {score.breakdown.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>

      <div className="text-center space-y-3">
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Final Market</h3>
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-gray-400">RFR: <span className="text-amber-400">{state.market.rfr}</span></span>
            <span className="text-gray-400">MRP: <span className="text-amber-400">{state.market.mrp}</span></span>
          </div>
          <div className="flex justify-center gap-3 mt-2">
            {(['red', 'green', 'blue', 'yellow', 'purple'] as const).map(color => (
              <span key={color} className="text-xs text-gray-400 capitalize">
                {color}: <span className={
                  state.market[color] === 'plus' ? 'text-green-400' :
                  state.market[color] === 'minus' ? 'text-red-400' : 'text-gray-500'
                }>
                  {state.market[color] === 'plus' ? '+1' : state.market[color] === 'minus' ? '-1' : '0'}
                </span>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onLeave}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
