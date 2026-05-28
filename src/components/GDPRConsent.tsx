import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export default function GDPRConsent({ children }: Props) {
  const { user } = useAuth()
  const [consentStatus, setConsentStatus] = useState<'loading' | 'needed' | 'granted' | 'declined'>('loading')

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'consent', user.uid)
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        setConsentStatus(snap.data().research_consent ? 'granted' : 'declined')
      } else {
        setConsentStatus('needed')
      }
    })
  }, [user])

  const handleConsent = async (consent: boolean) => {
    if (!user) return
    await setDoc(doc(db, 'consent', user.uid), {
      user_id: user.uid,
      email: user.email,
      research_consent: consent,
      consented_at: new Date().toISOString(),
    })
    setConsentStatus(consent ? 'granted' : 'declined')
  }

  if (consentStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (consentStatus === 'needed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
        <div className="max-w-lg w-full bg-gray-900 border border-gray-700 rounded-xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-amber-400">Research Data Consent</h2>

          <div className="space-y-3 text-sm text-gray-300">
            <p>
              Welcome to <strong>The Bottom (On)line</strong>, a game designed at Maastricht University
              to teach business economics concepts.
            </p>
            <p>
              Your gameplay data (game actions, scores, and timing) may be used for
              academic research to improve economics education. This data is stored
              in the EU (GDPR-compliant) and handled by Maastricht University.
            </p>
            <p>
              <strong>What data is collected:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Game actions and decisions (cards drawn, assets bought, etc.)</li>
              <li>Final scores and game outcomes</li>
              <li>Time spent per turn</li>
              <li>Your email address (for linking to grades if applicable)</li>
            </ul>
            <p>
              <strong>Your rights:</strong> You can withdraw consent at any time. Your gameplay
              data will then be excluded from research (but grading data is retained
              under legitimate educational interest).
            </p>
            <p className="text-gray-500 text-xs">
              For questions, contact Prof. Mark Sanders at Maastricht University.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleConsent(true)}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
            >
              I Consent to Research Use
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 font-semibold rounded-lg transition-colors"
            >
              Play Without Research
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
