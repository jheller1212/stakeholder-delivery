import type { Player, Character } from '../../types/game'
import { CHARACTER_INFO } from '../../types/game'

interface Props {
  players: Player[]
  currentPlayerIndex: number | null
  myUserId: string
}

const CHAR_COLOR: Partial<Record<Character, string>> = {
  head_of_rnd: 'text-purple-400',
  ceo: 'text-yellow-400',
  cso: 'text-green-400',
  cfo: 'text-blue-400',
  shareholder: 'text-orange-400',
  stakeholder: 'text-red-400',
  regulator: 'text-cyan-400',
  banker: 'text-gray-300',
}

export default function PlayerBar({ players, currentPlayerIndex, myUserId }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {players.map((p, i) => {
        const isCurrent = i === currentPlayerIndex
        const isMe = p.user_id === myUserId
        return (
          <div
            key={p.id}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              isCurrent
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-gray-700 bg-gray-800/50'
            } ${isMe ? 'ring-1 ring-amber-400/30' : ''}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${isMe ? 'text-amber-300' : 'text-gray-200'}`}>
                {p.name}
                {isMe && <span className="text-gray-500 text-xs ml-1">(you)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {p.character && (
                <span className={`text-xs ${CHAR_COLOR[p.character] || 'text-gray-400'}`}>
                  {CHARACTER_INFO[p.character].name}
                </span>
              )}
              <span className="text-xs text-amber-400">{p.cash}g</span>
              <span className="text-xs text-gray-500">{p.assets.length} assets</span>
              <span className="text-xs text-gray-500">{p.liabilities.length} liab</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
