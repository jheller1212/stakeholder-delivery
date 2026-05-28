import { CHARACTER_INFO, type Character, type Player, type GamePhase } from '../../types/game'

const CHARACTER_PORTRAITS: Partial<Record<Character, string>> = {
  head_of_rnd: '/characters/head_of_rnd.png',
  ceo: '/characters/ceo.png',
  cso: '/characters/cso.png',
  cfo: '/characters/cfo.png',
  shareholder: '/characters/shareholder.png',
  stakeholder: '/characters/stakeholder.png',
  banker: '/characters/banker.png',
}

interface Props {
  player: Player
  phase: GamePhase
}

function getPhaseLabel(phase: GamePhase, player: Player): { action: string; detail: string } {
  const name = player.character ? CHARACTER_INFO[player.character].name : player.name
  switch (phase) {
    case 'character_selection':
      return { action: 'Choosing a character...', detail: `${player.name} is picking their role` }
    case 'drawing':
      return { action: 'Drawing cards...', detail: `${name} is drawing from the deck` }
    case 'playing':
      return { action: 'Taking actions...', detail: `${name} is buying assets and issuing liabilities` }
    case 'banker_target':
      return { action: 'Responding to banker...', detail: `${name} must sell assets or pay liabilities` }
    case 'asset_abilities':
      return { action: 'Using abilities...', detail: `${name} is activating purple asset abilities` }
    default:
      return { action: 'Thinking...', detail: '' }
  }
}

export default function BotTurnOverlay({ player, phase }: Props) {
  const portrait = player.character ? CHARACTER_PORTRAITS[player.character] : null
  const charName = player.character ? CHARACTER_INFO[player.character].name : null
  const { action, detail } = getPhaseLabel(phase, player)

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      {/* Bot portrait with pulse ring */}
      <div className="relative">
        {portrait ? (
          <img
            src={portrait}
            alt={charName || player.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/60"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-2xl font-bold">
            {player.name[0]?.toUpperCase()}
          </div>
        )}
        {/* Animated pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping-slow" />
        {/* Bot badge */}
        <span className="absolute -bottom-1 -right-1 bg-gray-700 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-gray-600">
          BOT
        </span>
      </div>

      {/* Name + character */}
      <div className="text-center">
        <p className="text-amber-300 font-semibold text-sm">{player.name}</p>
        {charName && (
          <p className="text-gray-500 text-xs">{charName}</p>
        )}
      </div>

      {/* Action label */}
      <div className="panel-warm rounded-lg px-6 py-2.5 flex items-center gap-3">
        {/* Animated dots */}
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-amber-300 font-medium text-sm">{action}</p>
      </div>

      {detail && (
        <p className="text-gray-600 text-xs">{detail}</p>
      )}
    </div>
  )
}
