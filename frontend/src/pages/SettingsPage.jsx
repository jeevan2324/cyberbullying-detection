import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const LEVELS = [
  {
    id: 'beginner',
    icon: '🟢',
    label: 'Beginner',
    threshold: '>80%',
    actions: ['Hides highly toxic (>80%) comments from public view'],
    desc: 'Only blocks clearly harmful content. Best for casual users.'
  },
  {
    id: 'intermediate',
    icon: '🟡',
    label: 'Intermediate',
    threshold: '>50%',
    actions: ['Hides highly toxic (>80%)', 'Blurs medium toxicity (>50%) — click to reveal'],
    desc: 'Balanced protection. Recommended for most users.'
  },
  {
    id: 'strict',
    icon: '🔴',
    label: 'Strict',
    threshold: '>30%',
    actions: ['Completely blocks any comment scoring above 30% toxicity'],
    desc: 'Maximum protection. Ideal for sensitive accounts.'
  },
]

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [level,   setLevel]   = useState(user?.moderation_level || 'intermediate')
  const [loading, setLoading] = useState(false)
  const changed = level !== (user?.moderation_level || 'intermediate')

  async function saveSettings() {
    setLoading(true)
    try {
      const { data } = await api.put('/auth/profile', { moderation_level: level })
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
      toast('Moderation settings saved!', 'success')
    } catch {
      toast('Could not save settings.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your experience on Just Post</p>
      </div>

      {/* ── Moderation Level ──────────────────────────────────── */}
      <div className="card p-5 animate-fade-in">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <span>🤖</span> AI Moderation Level
        </h2>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Controls how the AI handles comments left on <strong className="text-gray-300">your posts</strong>.
          Comments on others' posts use their level.
        </p>

        <div className="space-y-2.5">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                level === l.id
                  ? 'border-brand bg-brand/10'
                  : 'border-surface-border hover:border-brand/30 hover:bg-brand/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{l.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{l.label}</span>
                    {level === l.id && (
                      <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">Active</span>
                    )}
                    <span className="text-xs text-gray-600 ml-auto">toxicity {l.threshold}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                  {level === l.id && (
                    <ul className="mt-2 space-y-0.5">
                      {l.actions.map(a => (
                        <li key={a} className="text-xs text-brand-light flex items-start gap-1.5">
                          <span className="mt-0.5">→</span> {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={saveSettings}
          disabled={loading || !changed}
          className="btn-primary w-full mt-4 py-2.5"
        >
          {loading ? 'Saving…' : changed ? 'Save Changes' : 'No Changes'}
        </button>
      </div>

      {/* ── How It Works ─────────────────────────────────────── */}
      <div className="card p-5 animate-fade-in space-y-3">
        <h2 className="font-semibold">🧠 How the AI Works</h2>
        <div className="space-y-3 text-sm">
          {[
            { icon: '🔡', title: 'Text Analysis', body: 'BERT + multilingual XLM-RoBERTa models detect toxicity in English, Hindi, Kannada, and mixed (code-switched) languages like "Tu useless hai bro".' },
            { icon: '🖼️', title: 'Image Moderation', body: 'Every uploaded image is scanned by OCR (Tesseract) to extract embedded text, which is then run through the toxicity pipeline.' },
            { icon: '📚', title: 'Dynamic Learning', body: 'Users can flag words with the ⚑ button. Words reported 10+ times are auto-promoted to the global block list and synced to the AI service.' },
            { icon: '⚡', title: 'Real-time', body: 'Moderation runs before the comment is saved to the database — blocked comments never touch storage.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <span className="text-lg flex-shrink-0">{icon}</span>
              <div>
                <p className="font-medium text-gray-200">{title}</p>
                <p className="text-gray-500 text-xs leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Account Info ─────────────────────────────────────── */}
      <div className="card p-5 animate-fade-in">
        <h2 className="font-semibold mb-3">👤 Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Username</span>
            <span className="font-medium">@{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Moderation Level</span>
            <span className="font-medium capitalize">{user?.moderation_level}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
