import { useState } from 'react'
import { CHARACTER_INFO, type Character, type GameState } from '../../types/game'

interface Props {
  availableCharacters: Character[]
  state: GameState
  isMyTurn: boolean
  currentPlayerCharacter?: Character
  onSelect: (character: Character) => void
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

const CHARACTER_COLORS: Record<Character, string> = {
  head_of_rnd: 'border-purple-500 bg-purple-500/10',
  ceo: 'border-yellow-500 bg-yellow-500/10',
  cso: 'border-green-500 bg-green-500/10',
  cfo: 'border-blue-500 bg-blue-500/10',
  shareholder: 'border-orange-500 bg-orange-500/10',
  stakeholder: 'border-red-500 bg-red-500/10',
  regulator: 'border-cyan-500 bg-cyan-500/10',
  banker: 'border-gray-400 bg-gray-400/10',
}

export default function CharacterSelect({ availableCharacters, state, isMyTurn, currentPlayerCharacter, onSelect }: Props) {
  const [selected, setSelected] = useState<Character | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = () => {
    if (!selected) return
    setConfirming(true)
    onSelect(selected)
  }

  if (currentPlayerCharacter) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-amber-400">Character Selected</h2>
        <div className={`inline-block px-6 py-4 rounded-xl border-2 ${CHARACTER_COLORS[currentPlayerCharacter]}`}>
          <p className="text-xl font-semibold text-gray-100">{CHARACTER_INFO[currentPlayerCharacter].name}</p>
          <ul className="mt-2 space-y-1">
            {CHARACTER_INFO[currentPlayerCharacter].abilities.map((a, i) => (
              <li key={i} className="text-sm text-gray-400">{a}</li>
            ))}
          </ul>
        </div>
        <p className="text-gray-500 text-sm">Waiting for other players to choose...</p>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {state.players.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs">
              <span className="text-gray-300">{p.name}</span>
              {p.character ? (
                <span className="text-green-400">Ready</span>
              ) : (
                <span className="text-gray-500">Choosing...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isMyTurn && !currentPlayerCharacter) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-amber-400">Character Selection</h2>
        <p className="text-gray-400">Waiting for your turn to pick a character...</p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs">
              <span className="text-gray-300">{p.name}</span>
              {p.character ? (
                <span className="text-green-400">{CHARACTER_INFO[p.character].name}</span>
              ) : (
                <span className="text-gray-500">Choosing...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-amber-400">Choose Your Character</h2>
        <p className="text-gray-400 mt-1">Select a role for this round</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {availableCharacters.map(key => {
          const char = CHARACTER_INFO[key]
          const isSelected = selected === key
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              disabled={confirming}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? CHARACTER_COLORS[key] + ' ring-2 ring-white/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {CHARACTER_PORTRAITS[key] && (
                  <img
                    src={CHARACTER_PORTRAITS[key]}
                    alt={char.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-100">{char.name}</p>
                  <ul className="mt-1 space-y-0.5">
                    {char.abilities.map((a, i) => (
                      <li key={i} className="text-xs text-gray-400">{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="text-center">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {confirming ? 'Selecting...' : `Play as ${CHARACTER_INFO[selected].name}`}
          </button>
        </div>
      )}
    </div>
  )
}
