import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export default function ProfilePage() {
  const { userId } = useParams()
  const { user: me, refreshUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const avatarInputRef = useRef()

  const targetId = userId || me?._id || me?.id
  const isOwnProfile = !userId || userId === (me?._id || me?.id)

  const [profile, setProfile] = useState(null)
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [editMode, setEditMode]       = useState(false)
  const [bio, setBio]                 = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    if (!targetId) return
    setLoading(true)
    Promise.all([
      api.get(`/auth/user/${targetId}`),
      api.get(`/posts/user/${targetId}`)
    ])
      .then(([profileRes, postsRes]) => {
        const p = profileRes.data
        setProfile(p)
        setPosts(postsRes.data)
        setBio(p.bio || '')
        // Check if current user is in target's followers array
        setIsFollowing(
          (p.followers || []).some(f => (f._id || f)?.toString() === (me?._id || me?.id)?.toString())
        )
      })
      .catch(() => toast('Could not load profile.', 'error'))
      .finally(() => setLoading(false))
  }, [targetId])

  async function handleFollow() {
    try {
      const { data } = await api.post(`/auth/follow/${targetId}`)
      setIsFollowing(data.following)
      setProfile(prev => ({
        ...prev,
        followers: data.following
          ? [...(prev.followers || []), { _id: me._id || me.id }]
          : (prev.followers || []).filter(f => (f._id || f)?.toString() !== (me._id || me.id)?.toString())
      }))
      toast(data.following ? `Followed ${profile.username}` : `Unfollowed ${profile.username}`, 'success')
    } catch { toast('Action failed.', 'error') }
  }

  async function saveBio() {
    try {
      const { data } = await api.put('/auth/profile', { bio })
      setProfile(prev => ({ ...prev, bio: data.bio }))
      setEditMode(false)
      await refreshUser()
      toast('Bio updated!', 'success')
    } catch { toast('Could not save bio.', 'error') }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, profilePicture: data.profilePicture }))
      await refreshUser()
      toast('Profile picture updated!', 'success')
    } catch { toast('Failed to upload avatar.', 'error') }
    finally { setAvatarUploading(false) }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-2xl mx-auto p-4 pt-8 animate-pulse">
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-surface-border" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-surface-border rounded w-32" />
            <div className="flex gap-5">
              {[1,2,3].map(i => <div key={i} className="h-8 w-14 bg-surface-border rounded" />)}
            </div>
            <div className="h-3 bg-surface-border rounded w-48" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-square bg-surface-border rounded-lg" />
        ))}
      </div>
    </div>
  )

  if (!profile) return (
    <div className="text-center py-20 text-gray-500">
      <div className="text-5xl mb-3">🔍</div>
      <p>User not found</p>
    </div>
  )

  const avatarSrc = profile.profilePicture
    || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">

      {/* ── Profile Header ──────────────────────────────────────── */}
      <div className="card p-6 mb-6 animate-fade-in">
        <div className="flex items-start gap-5">

          {/* Avatar with upload button (own profile only) */}
          <div className="relative flex-shrink-0">
            <div className="gradient-ring">
              <img
                src={avatarSrc}
                alt={profile.username}
                className={`w-20 h-20 avatar transition-opacity ${avatarUploading ? 'opacity-40' : 'opacity-100'}`}
              />
            </div>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 bg-brand hover:bg-brand-dark text-white rounded-full p-1.5 border-2 border-surface-card transition-colors shadow-lg"
                  title="Change profile picture"
                >
                  {avatarUploading
                    ? <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <CameraIcon />
                  }
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{profile.username}</h1>

            {/* Stats */}
            <div className="flex gap-5 my-3 text-sm">
              {[
                { label: 'posts',     val: posts.length },
                { label: 'followers', val: profile.followers?.length || 0 },
                { label: 'following', val: profile.following?.length || 0 },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="font-bold text-base">{val}</p>
                  <p className="text-gray-500 text-xs">{label}</p>
                </div>
              ))}
            </div>

            {/* Bio / Edit */}
            {editMode ? (
              <div className="space-y-2">
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="input text-sm resize-none"
                  rows={2}
                  placeholder="Write your bio…"
                  maxLength={150}
                />
                <p className="text-xs text-gray-600 text-right">{bio.length}/150</p>
                <div className="flex gap-2">
                  <button onClick={saveBio}             className="btn-primary text-sm py-1.5 px-4">Save</button>
                  <button onClick={() => setEditMode(false)} className="btn-ghost text-sm py-1.5 px-4">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {profile.bio || <span className="italic text-gray-600">No bio yet</span>}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {isOwnProfile ? (
                    <>
                      <button onClick={() => setEditMode(true)} className="btn-ghost text-sm py-1.5 px-4">
                        Edit Profile
                      </button>
                      <Link to="/settings" className="btn-ghost text-sm py-1.5 px-4">
                        Settings
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        className={isFollowing ? 'btn-ghost text-sm py-1.5 px-5' : 'btn-primary text-sm py-1.5 px-5'}
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                      <Link to={`/chat/${targetId}`} className="btn-ghost text-sm py-1.5 px-5">
                        Message
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Posts Grid ─────────────────────────────────────────── */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">Posts</h2>
      {posts.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm">{isOwnProfile ? 'Share your first post!' : 'No posts yet'}</p>
          {isOwnProfile && (
            <Link to="/create" className="btn-primary inline-block mt-4 text-sm">Create Post</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map(post => (
            <Link
              key={post._id}
              to={`/post/${post._id}`}
              className="aspect-square overflow-hidden rounded-lg bg-surface-border group cursor-pointer relative"
            >
              <img
                src={post.imageUrl}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 text-white text-sm font-semibold">
                <span>❤️ {post.likes?.length || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
