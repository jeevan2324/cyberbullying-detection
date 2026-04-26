import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setUsers([]); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/auth/search?q=${encodeURIComponent(q)}`)
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  return (
    <div className="max-w-xl mx-auto p-4 py-8">
      <h1 className="text-xl font-bold mb-4">Explore</h1>

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        <input
          id="explore-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users by username…"
          className="input pl-10"
          autoFocus
        />
        {searching && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </span>
        )}
      </div>

      {/* Results */}
      {users.length > 0 ? (
        <div className="space-y-2">
          {users.map(u => (
            <button
              key={u._id}
              onClick={() => navigate(`/profile/${u._id}`)}
              className="flex items-center gap-4 w-full card p-4 hover:border-brand/50 transition-all duration-200 animate-fade-in text-left"
            >
              <img
                src={u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                alt={u.username}
                className="w-12 h-12 avatar flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold">{u.username}</p>
                <p className="text-sm text-gray-500 truncate">{u.bio || 'No bio yet'}</p>
              </div>
              <span className="ml-auto text-gray-600">→</span>
            </button>
          ))}
        </div>
      ) : query && !searching ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-2">🤷</div>
          <p>No users found for <strong>"{query}"</strong></p>
        </div>
      ) : !query ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium text-gray-400">Find people to follow</p>
          <p className="text-sm mt-1">Type a username to search</p>
        </div>
      ) : null}
    </div>
  )
}
