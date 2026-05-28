import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface LobbyPlayer {
  user_id: string
  name: string
  is_host: boolean
}

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [copied, setCopied] = useState(false)

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player'
  const isHost = players.length > 0 && players[0].user_id === user?.id

  useEffect(() => {
    if (!user || !roomCode) return

    const channel = supabase.channel(`lobby:${roomCode}`, {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string; joined_at: string }>()
        const lobbyPlayers: LobbyPlayer[] = Object.entries(state)
          .map(([userId, presences]) => ({
            user_id: userId,
            name: presences[0]?.name || 'Unknown',
            is_host: false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (lobbyPlayers.length > 0) {
          lobbyPlayers[0].is_host = true
        }
        setPlayers(lobbyPlayers)
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        navigate(`/game/${payload.game_id}`)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: displayName, joined_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, roomCode, displayName, navigate])

  const handleStartGame = async () => {
    if (players.length < 2) return // need at least 2 for testing, 4 for real games

    const channel = supabase.channel(`lobby:${roomCode}`)
    // TODO: call edge function to create game, then broadcast game_id
    const gameId = crypto.randomUUID()
    await channel.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { game_id: gameId },
    })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const chairPositions = [
    'left-1/2 -translate-x-1/2 bottom-4',      // bottom center
    'left-[15%] bottom-[15%]',                   // bottom left
    'right-[15%] bottom-[15%]',                  // bottom right
    'left-[5%] top-1/2 -translate-y-1/2',        // left
    'right-[5%] top-1/2 -translate-y-1/2',       // right
    'left-[15%] top-[15%]',                      // top left
    'right-[15%] top-[15%]',                     // top right
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(/boardroom-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Room code header */}
      <div className="mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">Room Code</p>
        <button
          onClick={copyCode}
          className="text-4xl font-bold text-amber-400 tracking-[0.3em] hover:text-amber-300 transition-colors"
        >
          {roomCode}
        </button>
        {copied && <p className="text-green-400 text-sm mt-1">Copied!</p>}
      </div>

      {/* Players around table */}
      <div className="relative w-full max-w-2xl aspect-[4/3] mb-8">
        {/* Table */}
        <div className="absolute inset-[20%] bg-amber-950/40 border border-amber-800/30 rounded-[50%]" />

        {/* Player seats */}
        {players.map((player, i) => (
          <div
            key={player.user_id}
            className={`absolute ${chairPositions[i] || 'hidden'} flex flex-col items-center`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
              player.user_id === user?.id ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}>
              {player.name[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 mt-1 max-w-20 truncate">
              {player.name}
              {player.is_host && ' (host)'}
            </span>
          </div>
        ))}

        {/* Empty seats */}
        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={`absolute ${chairPositions[players.length + i] || 'hidden'} flex flex-col items-center`}
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600">
              ?
            </div>
            <span className="text-xs text-gray-600 mt-1">Waiting...</span>
          </div>
        ))}
      </div>

      {/* Player count & start */}
      <div className="text-center space-y-4">
        <p className="text-gray-400">
          {players.length} / 7 players
          {players.length < 4 && <span className="text-gray-600 ml-2">(need at least 4)</span>}
        </p>

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.length < 2}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-lg transition-colors"
          >
            Start Meeting
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="block mx-auto text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}
