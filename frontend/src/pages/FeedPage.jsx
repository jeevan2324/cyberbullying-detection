import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import PostCard from '../components/PostCard'

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-surface-border" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-surface-border rounded w-28" />
          <div className="h-2.5 bg-surface-border rounded w-16" />
        </div>
      </div>
      <div className="bg-surface-border" style={{ aspectRatio: '1/1' }} />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-surface-border rounded w-14" />
        <div className="h-3 bg-surface-border rounded w-56" />
        <div className="h-2.5 bg-surface-border rounded w-24" />
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    api.get('/posts/feed')
      .then(r => setPosts(r.data))
      .catch(() => toast('Could not load feed. Is the backend running?', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-lg mx-auto p-4 space-y-5 py-8">
      <div className="flex items-center justify-between mb-2">
        <div className="h-6 w-28 bg-surface-border rounded-lg animate-pulse" />
        <div className="h-4 w-16 bg-surface-border rounded animate-pulse" />
      </div>
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (!posts.length) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <div className="text-7xl mb-5">📭</div>
      <h2 className="text-2xl font-bold mb-2">Your feed is empty</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6 leading-relaxed">
        Follow people to see their posts here, or share your first post with the world!
      </p>
      <div className="flex gap-3">
        <Link to="/explore" className="btn-primary">Find People</Link>
        <Link to="/create"  className="btn-ghost">Create Post</Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-brand-light to-pink-400 bg-clip-text text-transparent">
          Your Feed
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{posts.length} posts</span>
          <Link to="/explore" className="text-xs text-brand-light hover:underline">
            Explore →
          </Link>
        </div>
      </div>

      {/* AI moderation banner (shown once per session) */}
      <div className="bg-brand/10 border border-brand/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🛡️</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-brand-light">AI Moderation Active</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            All comments are scanned in real-time. Change your level in{' '}
            <Link to="/settings" className="text-brand-light hover:underline">Settings</Link>.
          </p>
        </div>
      </div>

      {/* Posts */}
      {posts.map(post => (
        <PostCard key={post._id} post={post} />
      ))}

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-600 space-y-1">
        <p>You've seen all posts from people you follow.</p>
        <Link to="/explore" className="text-brand-light hover:underline">
          Discover more people →
        </Link>
      </div>
    </div>
  )
}
