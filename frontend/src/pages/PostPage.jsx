import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import PostCard from '../components/PostCard'

export default function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    api.get(`/posts/${id}`)
      .then(res => setPost(res.data))
      .catch((err) => {
        console.error('Error fetching post:', err)
        toast('Could not load post.', 'error')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-lg mx-auto p-4 py-12 animate-pulse space-y-4">
      <div className="h-10 w-10 rounded-full bg-surface-border" />
      <div className="aspect-square bg-surface-border rounded-xl" />
      <div className="h-4 bg-surface-border rounded w-3/4" />
    </div>
  )

  if (!post) return (
    <div className="text-center py-20 text-gray-500">
      <div className="text-6xl mb-4">🖼️</div>
      <p>Post not found or has been deleted.</p>
      <Link to="/" className="btn-ghost mt-4 inline-block">Back to Feed</Link>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto p-4 py-8 animate-fade-in">
      <PostCard post={post} />
    </div>
  )
}
