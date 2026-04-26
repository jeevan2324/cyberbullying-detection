import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import CommentSection from './CommentSection'

const HeartIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)
const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

function timeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function PostCard({ post }) {
  const { user } = useAuth()
  const toast    = useToast()

  const myId = user?.id || user?._id
  const [liked,        setLiked]        = useState((post.likes || []).includes(myId))
  const [likeCount,    setLikeCount]    = useState(post.likes?.length || 0)
  const [likeAnim,     setLikeAnim]     = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [imgLoaded,    setImgLoaded]    = useState(false)

  async function handleLike() {
    try {
      const { data } = await api.post(`/posts/${post._id}/like`)
      setLiked(data.liked)
      setLikeCount(data.likeCount)
      if (data.liked) {
        setLikeAnim(true)
        setTimeout(() => setLikeAnim(false), 600)
      }
    } catch {
      toast('Could not update like.', 'error')
    }
  }

  return (
    <article className="card animate-fade-in overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4">
        <Link to={`/profile/${post.user?._id}`}>
          <div className="gradient-ring flex-shrink-0">
            <img
              src={post.user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user?.username}`}
              alt={post.user?.username}
              className="w-9 h-9 rounded-full object-cover"
            />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to={`/profile/${post.user?._id}`}
            className="font-semibold text-sm hover:text-brand-light transition-colors"
          >
            {post.user?.username}
          </Link>
          <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
        </div>
        {/* AI shield badge */}
        <span className="text-xs bg-brand/10 border border-brand/20 text-brand-light px-2 py-0.5 rounded-full flex-shrink-0"
              title="This post was AI-moderated">
          🛡️ Safe
        </span>
      </div>

      {/* ── Image ──────────────────────────────────────────────── */}
      <Link to={`/post/${post._id}`}>
        <div
          className="relative bg-surface-border overflow-hidden"
          style={{ aspectRatio: '1 / 1' }}
          onDoubleClick={handleLike}
        >
          {!imgLoaded && (
            <div className="absolute inset-0 bg-surface-border animate-pulse" />
          )}
          <img
            src={post.imageUrl}
            alt={post.caption || 'Post image'}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          {/* Double-tap heart burst */}
          {likeAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-6xl animate-scale-in text-red-500 drop-shadow-lg">❤️</span>
            </div>
          )}
        </div>
      </Link>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`transition-all duration-200 hover:scale-110 active:scale-90 ${
              liked ? 'text-red-500' : 'text-gray-400 hover:text-white'
            }`}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} />
          </button>
          <button
            onClick={() => setShowComments(v => !v)}
            className="text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
            aria-label="Toggle comments"
          >
            <CommentIcon />
          </button>
        </div>

        <p className="text-sm font-semibold">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>

        {post.caption && (
          <p className="text-sm">
            <Link
              to={`/profile/${post.user?._id}`}
              className="font-semibold mr-2 hover:text-brand-light transition-colors"
            >
              {post.user?.username}
            </Link>
            <span className="text-gray-300">{post.caption}</span>
          </p>
        )}

        <button
          onClick={() => setShowComments(v => !v)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors pb-1"
        >
          {showComments ? '▲ Hide comments' : '▼ View comments'}
        </button>
      </div>

      {/* ── Comments ───────────────────────────────────────────── */}
      {showComments && (
        <div className="border-t border-surface-border px-4 pb-4 animate-fade-in">
          <CommentSection postId={post._id} />
        </div>
      )}
    </article>
  )
}
