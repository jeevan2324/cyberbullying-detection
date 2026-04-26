import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast(`Welcome back, ${user.username}! 👋`, 'success')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-scale-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-bounce">🛡️</div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-brand-light via-pink-400 to-amber-400 bg-clip-text text-transparent">
            Just Post
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Safe social, powered by AI</p>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-center">Sign in to your account</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
              <span>🚫</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="input"
              required
              autoComplete="email"
            />
            <input
              id="login-password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="input"
              required
              autoComplete="current-password"
            />
            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={loading}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </span>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-xs text-gray-600">OR</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <Link
            to="/register"
            className="btn-ghost w-full text-center block text-sm py-2.5"
          >
            Create new account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {['🤖 AI Moderation', '🌐 Multilingual', '🔒 JWT Auth', '⚡ Real-time Chat'].map(f => (
            <span key={f} className="text-xs bg-surface-card border border-surface-border text-gray-500 px-3 py-1 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
