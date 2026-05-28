import type { Player, Character } from '../../types/game'

interface Props {
  players: Player[]
  currentPlayerIndex: number | null
  myUserId: string
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

export default function PlayerSeats({ players, currentPlayerIndex, myUserId }: Props) {
  return (
    <div className="relative z-10 px-4 pb-2">
      <div className="flex justify-center gap-3 flex-wrap">
        {players.map((p, i) => {
          const isCurrent = i === currentPlayerIndex
          const isMe = p.user_id === myUserId
          const portrait = p.character ? CHARACTER_PORTRAITS[p.character] : null

          return (
            <div key={p.id} className="flex flex-col items-center gap-1">
              {/* Seat circle */}
              <div className={`relative ${isCurrent ? 'seat-active' : ''}`}>
                {portrait ? (
                  <img
                    src={portrait}
                    alt={p.name}
                    className={`w-10 h-10 rounded-full object-cover border-2 ${
                      isCurrent ? 'border-amber-400' : isMe ? 'border-amber-600/50' : 'border-gray-700'
                    }`}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    isCurrent ? 'border-amber-400 bg-gray-700 text-amber-300' : 'border-gray-700 bg-gray-800 text-gray-500'
                  }`}>
                    ?
                  </div>
                )}
                {/* Cash badge */}
                <span className="absolute -bottom-0.5 -right-0.5 bg-gray-900 text-amber-400 text-[8px] font-bold px-1 rounded-full border border-gray-700">
                  {p.cash}&#x2009;gold
                </span>
              </div>
              {/* Name */}
              <span className={`text-[10px] max-w-14 truncate ${
                isMe ? 'text-amber-300' : 'text-gray-400'
              }`}>
                {isMe ? 'You' : p.name}
              </span>
              {/* Asset dots */}
              <div className="flex gap-0.5">
                {p.assets.slice(0, 6).map((a, j) => (
                  <div
                    key={j}
                    className={`w-1.5 h-1.5 rounded-full ${
                      a.color === 'red' ? 'bg-red-500' :
                      a.color === 'green' ? 'bg-green-500' :
                      a.color === 'blue' ? 'bg-blue-500' :
                      a.color === 'yellow' ? 'bg-yellow-400' :
                      'bg-purple-500'
                    }`}
                  />
                ))}
                {p.assets.length === 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
