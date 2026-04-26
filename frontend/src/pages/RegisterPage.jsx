import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function RegisterPage() {
  const [form, setForm]   = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      const user = await register(form.username, form.email, form.password)
      toast(`Account created! Welcome, ${user.username} 🎉`, 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const field = (id, type, placeholder, key, opts = {}) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      className="input"
      required
      {...opts}
    />
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-scale-in relative z-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-brand-light via-pink-400 to-amber-400 bg-clip-text text-transparent">
            Just Post
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Join the safe social network</p>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-center">Create your account</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
              <span>🚫</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {field('reg-username', 'text',     'Username',             'username', { autoComplete: 'username' })}
            {field('reg-email',    'email',    'Email address',        'email',    { autoComplete: 'email' })}
            {field('reg-password', 'password', 'Password (min 6 chars)', 'password', { autoComplete: 'new-password' })}

            <button
              id="reg-submit"
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
                    Creating account…
                  </span>
                : 'Create Account'
              }
            </button>
          </form>

          {/* AI moderation notice */}
          <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-brand-light mb-1">🤖 AI-Powered Moderation</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Comments and images are scanned in real-time for cyberbullying using BERT and OCR. You can choose your moderation level in Settings.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-light hover:underline font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
