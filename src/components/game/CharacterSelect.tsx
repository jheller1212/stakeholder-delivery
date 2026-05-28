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
  head_of_rnd: 'border-purple-400',
  ceo: 'border-yellow-400',
  cso: 'border-green-400',
  cfo: 'border-blue-400',
  shareholder: 'border-orange-400',
  stakeholder: 'border-red-400',
  regulator: 'border-cyan-400',
  banker: 'border-gray-300',
}

export default function CharacterSelect({ availableCharacters, state, isMyTurn, currentPlayerCharacter, onSelect }: Props) {
  const [selected, setSelected] = useState<Character | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = () => {
    if (!selected) return
    setConfirming(true)
    onSelect(selected)
  }

  // Already selected — show reveal screen like Figma
  if (currentPlayerCharacter) {
    const char = CHARACTER_INFO[currentPlayerCharacter]
    const portrait = CHARACTER_PORTRAITS[currentPlayerCharacter]
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        {/* Portrait */}
        {portrait && (
          <img
            src={portrait}
            alt={char.name}
            className={`w-28 h-28 rounded-full object-cover border-3 ${CHARACTER_COLORS[currentPlayerCharacter]} portrait-glow`}
          />
        )}
        {/* Name banner */}
        <div className="panel-warm rounded-lg px-8 py-2.5">
          <p className="text-amber-300 font-bold text-lg tracking-wide text-center">
            You are The {char.name}
          </p>
        </div>
        {/* Abilities */}
        <div className="panel-warm rounded-xl p-5 flex gap-4 items-start w-full">
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-amber-500/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Your Abilities:</p>
            <ul className="space-y-1.5">
              {char.abilities.map((a, i) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">·</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Waiting indicator */}
        <p className="text-gray-500 text-xs">Waiting for other players to choose...</p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900/60 rounded-full text-[10px] border border-gray-800">
              <span className="text-gray-300">{p.name}</span>
              {p.character ? (
                <span className="text-green-400">Ready</span>
              ) : (
                <span className="text-gray-600">...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Not my turn — waiting
  if (!isMyTurn) {
    return (
      <div className="flex flex-col items-center gap-6">
        {/* Chairman announcing */}
        <img src="/chairman.png" alt="Chairman" className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40" />
        <div className="panel-warm rounded-lg px-6 py-2.5">
          <p className="text-amber-300 font-medium text-center">The chairman is calling...</p>
        </div>
        <p className="text-gray-500 text-sm">Waiting for your turn to pick a character</p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900/60 rounded-full text-[10px] border border-gray-800">
              <span className="text-gray-300">{p.name}</span>
              {p.character ? (
                <span className="text-green-400">{CHARACTER_INFO[p.character].name}</span>
              ) : (
                <span className="text-gray-600">Choosing...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // My turn — character grid
  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div className="text-center">
        <p className="text-amber-300 font-bold text-lg">Choose Your Character</p>
        <p className="text-gray-500 text-xs mt-1">Select a role for this round</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {availableCharacters.map(key => {
          const char = CHARACTER_INFO[key]
          const portrait = CHARACTER_PORTRAITS[key]
          const isSelected = selected === key
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              disabled={confirming}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? `${CHARACTER_COLORS[key]} bg-gray-800/80 ring-1 ring-white/10 scale-[1.02]`
                  : 'border-gray-700/50 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/60'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {portrait ? (
                  <img src={portrait} alt={char.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-lg">?</div>
                )}
                <p className="font-semibold text-gray-200 text-sm text-center">{char.name}</p>
                <ul className="space-y-0.5 w-full">
                  {char.abilities.map((a, i) => (
                    <li key={i} className="text-[10px] text-gray-500 leading-tight">{a}</li>
                  ))}
                </ul>
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
            className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {confirming ? 'Selecting...' : `Play as ${CHARACTER_INFO[selected].name}`}
          </button>
        </div>
      )}
    </div>
  )
}
