import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function HomePage() {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player'

  const handleCreate = () => {
    const code = generateRoomCode()
    navigate(`/lobby/${code}`)
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length < 3) {
      setError('Enter a valid room code')
      return
    }
    navigate(`/lobby/${code}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(/boardroom-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-gray-400 text-sm">{displayName}</span>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold text-amber-400 tracking-tight mb-2">
        The Bottom (On)line
      </h1>
      <p className="text-gray-400 mb-12">Welcome, {displayName}</p>

      <div className="w-full max-w-sm space-y-6">
        <button
          onClick={handleCreate}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-lg transition-colors"
        >
          Create New Game
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-700" />
          <span className="text-gray-500 text-sm">or join existing</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <input
            type="text"
            placeholder="Room Code"
            value={joinCode}
            onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
            maxLength={6}
            className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 text-center text-2xl tracking-[0.3em] uppercase"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-semibold rounded-lg transition-colors"
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  )
}
