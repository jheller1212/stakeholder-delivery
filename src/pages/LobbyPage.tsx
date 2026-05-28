import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../lib/firebase'
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore'
import { createGame } from '../lib/gameService'

interface LobbyPlayer {
  user_id: string
  name: string
  joined_at: number
}

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [copied, setCopied] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player'
  const isHost = players.length > 0 && players[0].user_id === user?.uid

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

  const handleStartGame = async () => {
    if (!roomCode || players.length < 2) return
    const gameId = crypto.randomUUID()
    // Create the game state in Firestore
    await createGame(gameId, roomCode, players.map(p => ({ user_id: p.user_id, name: p.name })))
    // Signal all lobby clients to navigate to the game
    await setDoc(doc(db, 'lobbies', roomCode), { game_id: gameId, started_at: serverTimestamp() }, { merge: true })
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(/boardroom-bg.jpg)',
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

        {players.map((player, i) => (
          <div
            key={player.user_id}
            className={`absolute ${chairPositions[i] || 'hidden'} flex flex-col items-center`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
              player.user_id === user?.uid ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}>
              {player.name[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 mt-1 max-w-20 truncate">
              {player.name}
              {i === 0 && ' (host)'}
            </span>
          </div>
        ))}

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

      <div className="text-center space-y-4">
        <p className="text-gray-400">
          {players.length} / 7 players
          {players.length < 4 && <span className="text-gray-600 ml-2">(need at least 4)</span>}
        </p>

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.length < 1}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-lg transition-colors"
          >
            Start Meeting
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
