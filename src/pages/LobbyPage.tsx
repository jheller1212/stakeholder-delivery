import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../lib/firebase'
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore'
import { createGame } from '../lib/gameService'
import { registerBot } from '../lib/botController'
import { getBotName, type BotDifficulty } from '../lib/botEngine'

interface LobbyPlayer {
  user_id: string
  name: string
  joined_at: number
}

interface BotEntry {
  user_id: string
  name: string
  difficulty: BotDifficulty
}

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [bots, setBots] = useState<BotEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player'
  const isHost = players.length > 0 && players[0].user_id === user?.uid
  const totalPlayers = players.length + bots.length

  useEffect(() => {
    if (!user || !roomCode) return
    const playersRef = collection(db, 'lobbies', roomCode, 'players')
    const playerDoc = doc(playersRef, user.uid)
    setDoc(playerDoc, { user_id: user.uid, name: displayName, joined_at: Date.now() })
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const lobbyPlayers: LobbyPlayer[] = snapshot.docs
        .map(d => d.data() as LobbyPlayer)
        .sort((a, b) => a.joined_at - b.joined_at)
      setPlayers(lobbyPlayers)
    })
    const lobbyDoc = doc(db, 'lobbies', roomCode)
    const unsubLobby = onSnapshot(lobbyDoc, (snapshot) => {
      const data = snapshot.data()
      if (data?.game_id && !gameStarted) {
        setGameStarted(true)
        navigate(`/game/${data.game_id}`)
      }
    })
    return () => { deleteDoc(playerDoc); unsubPlayers(); unsubLobby() }
  }, [user, roomCode, displayName, navigate, gameStarted])

  const addBot = (difficulty: BotDifficulty) => {
    if (totalPlayers >= 7) return
    const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setBots(prev => [...prev, { user_id: botId, name: getBotName(bots.length), difficulty }])
  }

  const removeBot = (botId: string) => setBots(prev => prev.filter(b => b.user_id !== botId))

  const handleStartGame = async () => {
    if (!roomCode || totalPlayers < 1 || starting) return
    setStarting(true)
    setError(null)
    try {
      for (const bot of bots) registerBot(bot.user_id, bot.difficulty)
      const gameId = crypto.randomUUID()
      const allPlayers = [
        ...players.map(p => ({ user_id: p.user_id, name: p.name })),
        ...bots.map(b => ({ user_id: b.user_id, name: b.name })),
      ]
      localStorage.setItem(`bots-${gameId}`, JSON.stringify(
        bots.map(b => ({ user_id: b.user_id, difficulty: b.difficulty }))
      ))
      await createGame(gameId, roomCode, allPlayers)
      await setDoc(doc(db, 'lobbies', roomCode), { game_id: gameId, started_at: serverTimestamp() }, { merge: true })
    } catch (err) {
      console.error('Failed to start game:', err)
      setError(err instanceof Error ? err.message : 'Failed to start game')
      setStarting(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allDisplayPlayers = [
    ...players.map(p => ({ ...p, isBot: false, difficulty: undefined as BotDifficulty | undefined })),
    ...bots.map(b => ({ user_id: b.user_id, name: b.name, joined_at: 0, isBot: true, difficulty: b.difficulty })),
  ]

  // Seat positions around a virtual oval table
  const seatPositions = [
    'left-1/2 -translate-x-1/2 bottom-[8%]',
    'left-[12%] bottom-[18%]',
    'right-[12%] bottom-[18%]',
    'left-[4%] top-1/2 -translate-y-1/2',
    'right-[4%] top-1/2 -translate-y-1/2',
    'left-[15%] top-[18%]',
    'right-[15%] top-[18%]',
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 game-bg">
      {/* Room code */}
      <div className="mb-6 text-center">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Room Code</p>
        <button
          onClick={copyCode}
          className="text-3xl font-bold text-amber-400 tracking-[0.3em] hover:text-amber-300 transition-colors"
        >
          {roomCode}
        </button>
        {copied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
      </div>

      {/* Table area */}
      <div className="relative w-full max-w-xl aspect-[4/3] mb-6">
        {/* Table surface */}
        <div className="absolute inset-[18%] bg-amber-950/20 border border-amber-800/15 rounded-[50%] shadow-[inset_0_0_60px_rgba(0,0,0,0.3)]" />

        {/* Player seats */}
        {allDisplayPlayers.map((player, i) => (
          <div
            key={player.user_id}
            className={`absolute ${seatPositions[i] || 'hidden'} flex flex-col items-center`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              player.user_id === user?.uid
                ? 'bg-amber-600/80 text-white border-amber-400'
                : player.isBot
                  ? 'bg-indigo-800/60 text-indigo-200 border-indigo-500/50'
                  : 'bg-gray-800/60 text-gray-300 border-gray-600'
            }`}>
              {player.isBot ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                player.name[0]?.toUpperCase()
              )}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 max-w-16 truncate">
              {player.name}
              {i === 0 && !player.isBot && ' (host)'}
            </span>
            {player.isBot && (
              <span className={`text-[9px] mt-0.5 ${
                player.difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {player.difficulty}
              </span>
            )}
            {player.isBot && isHost && (
              <button
                onClick={() => removeBot(player.user_id)}
                className="text-[9px] text-gray-600 hover:text-red-400 mt-0.5"
              >
                remove
              </button>
            )}
          </div>
        ))}

        {/* Empty seats */}
        {Array.from({ length: Math.max(0, 4 - totalPlayers) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={`absolute ${seatPositions[totalPlayers + i] || 'hidden'} flex flex-col items-center`}
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-700/50 flex items-center justify-center text-gray-700">
              ?
            </div>
            <span className="text-[10px] text-gray-700 mt-1">Waiting...</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="text-center space-y-3">
        <p className="text-gray-500 text-xs">
          {totalPlayers} / 7 players
          {totalPlayers < 4 && <span className="text-gray-700 ml-2">(need at least 4)</span>}
        </p>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {isHost && totalPlayers < 7 && (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => addBot('medium')}
              className="px-3 py-1.5 bg-yellow-700/30 hover:bg-yellow-700/50 border border-yellow-700/40 text-yellow-300 text-xs rounded-lg transition-colors"
            >
              + Medium Bot
            </button>
            <button
              onClick={() => addBot('hard')}
              className="px-3 py-1.5 bg-red-700/30 hover:bg-red-700/50 border border-red-700/40 text-red-300 text-xs rounded-lg transition-colors"
            >
              + Hard Bot
            </button>
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={totalPlayers < 1 || starting}
            className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {starting ? 'Starting...' : 'Start Meeting'}
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="block mx-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}
