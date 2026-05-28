import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CHARACTER_INFO, type Character } from '../types/game'

// Placeholder game page — will be built out with full game logic
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  useAuth() // ensure authenticated
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-950">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-amber-400">Game In Progress</h1>
        <p className="text-gray-400">Game ID: {gameId}</p>

        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-8 max-w-lg">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Characters</h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(CHARACTER_INFO) as [Character, typeof CHARACTER_INFO[Character]][]).map(([key, char]) => (
              <button
                key={key}
                className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-left transition-colors"
              >
                <p className="font-semibold text-amber-400 text-sm">{char.name}</p>
                <ul className="mt-1 space-y-0.5">
                  {char.abilities.map((a, i) => (
                    <li key={i} className="text-xs text-gray-400">· {a}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Leave Game
        </button>
      </div>
    </div>
  )
}
