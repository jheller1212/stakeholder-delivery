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

  // Join lobby and listen for changes
  useEffect(() => {
    if (!user || !roomCode) return

    const playersRef = collection(db, 'lobbies', roomCode, 'players')
    const playerDoc = doc(playersRef, user.uid)

    // Add self to lobby
    setDoc(playerDoc, {
      user_id: user.uid,
      name: displayName,
      joined_at: Date.now(),
    })

    // Listen for player changes
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const lobbyPlayers: LobbyPlayer[] = snapshot.docs
        .map(d => d.data() as LobbyPlayer)
        .sort((a, b) => a.joined_at - b.joined_at)
      setPlayers(lobbyPlayers)
    })

    // Listen for game start
    const lobbyDoc = doc(db, 'lobbies', roomCode)
    const unsubLobby = onSnapshot(lobbyDoc, (snapshot) => {
      const data = snapshot.data()
      if (data?.game_id && !gameStarted) {
        setGameStarted(true)
        navigate(`/game/${data.game_id}`)
      }
    })

    // Remove self on leave
    return () => {
      deleteDoc(playerDoc)
      unsubPlayers()
      unsubLobby()
    }
  }, [user, roomCode, displayName, navigate, gameStarted])

  const addBot = (difficulty: BotDifficulty) => {
    if (totalPlayers >= 7) return
    const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const botName = getBotName(bots.length)
    setBots(prev => [...prev, { user_id: botId, name: botName, difficulty }])
  }

  const removeBot = (botId: string) => {
    setBots(prev => prev.filter(b => b.user_id !== botId))
  }

  const handleStartGame = async () => {
    if (!roomCode || totalPlayers < 1 || starting) return
    setStarting(true)
    setError(null)
    try {
      // Register all bots with the bot controller
      for (const bot of bots) {
        registerBot(bot.user_id, bot.difficulty)
      }

      const gameId = crypto.randomUUID()
      const allPlayers = [
        ...players.map(p => ({ user_id: p.user_id, name: p.name })),
        ...bots.map(b => ({ user_id: b.user_id, name: b.name })),
      ]

      // Store bot info in localStorage so GamePage can pick it up
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

  const handleLeave = () => {
    navigate('/')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const chairPositions = [
    'left-1/2 -translate-x-1/2 bottom-4',
    'left-[15%] bottom-[15%]',
    'right-[15%] bottom-[15%]',
    'left-[5%] top-1/2 -translate-y-1/2',
    'right-[5%] top-1/2 -translate-y-1/2',
    'left-[15%] top-[15%]',
    'right-[15%] top-[15%]',
  ]

  const allDisplayPlayers = [
    ...players.map(p => ({ ...p, isBot: false, difficulty: undefined as BotDifficulty | undefined })),
    ...bots.map(b => ({ user_id: b.user_id, name: b.name, joined_at: 0, isBot: true, difficulty: b.difficulty })),
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(/boardroom-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
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

      <div className="relative w-full max-w-2xl aspect-[4/3] mb-8">
        <div className="absolute inset-[20%] bg-amber-950/40 border border-amber-800/30 rounded-[50%]" />

        {allDisplayPlayers.map((player, i) => (
          <div
            key={player.user_id}
            className={`absolute ${chairPositions[i] || 'hidden'} flex flex-col items-center`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
              player.user_id === user?.uid
                ? 'bg-amber-600 text-white'
                : player.isBot
                  ? 'bg-indigo-700 text-indigo-200'
                  : 'bg-gray-700 text-gray-300'
            }`}>
              {player.isBot ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                player.name[0]?.toUpperCase()
              )}
            </div>
            <span className="text-xs text-gray-300 mt-1 max-w-20 truncate">
              {player.name}
              {i === 0 && !player.isBot && ' (host)'}
            </span>
            {player.isBot && (
              <span className={`text-[10px] mt-0.5 ${
                player.difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {player.difficulty}
              </span>
            )}
            {player.isBot && isHost && (
              <button
                onClick={() => removeBot(player.user_id)}
                className="text-[10px] text-gray-600 hover:text-red-400 mt-0.5"
              >
                remove
              </button>
            )}
          </div>
        ))}

        {Array.from({ length: Math.max(0, 4 - totalPlayers) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={`absolute ${chairPositions[totalPlayers + i] || 'hidden'} flex flex-col items-center`}
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600">
              ?
            </div>
            <span className="text-xs text-gray-600 mt-1">Waiting...</span>
          </div>
        ))}
      </div>

      <div className="text-center space-y-4">
        <p className="text-gray-400">
          {totalPlayers} / 7 players
          {totalPlayers < 4 && <span className="text-gray-600 ml-2">(need at least 4)</span>}
        </p>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {isHost && totalPlayers < 7 && (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => addBot('medium')}
              className="px-4 py-2 bg-yellow-700/40 hover:bg-yellow-700/60 border border-yellow-700/50 text-yellow-300 text-sm rounded-lg transition-colors"
            >
              + Medium Bot
            </button>
            <button
              onClick={() => addBot('hard')}
              className="px-4 py-2 bg-red-700/40 hover:bg-red-700/60 border border-red-700/50 text-red-300 text-sm rounded-lg transition-colors"
            >
              + Hard Bot
            </button>
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={totalPlayers < 1 || starting}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-lg transition-colors"
          >
            {starting ? 'Starting...' : 'Start Meeting'}
          </button>
        )}

        <button
          onClick={handleLeave}
          className="block mx-auto text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}
