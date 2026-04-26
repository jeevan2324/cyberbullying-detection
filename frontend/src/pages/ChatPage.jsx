import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const SOCKET_URL = 'http://localhost:5000'

function timeStr(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { userId: chatPartnerId } = useParams()
  const { user: me }  = useAuth()
  const toast         = useToast()
  const navigate      = useNavigate()

  const [conversations,   setConversations]   = useState([])
  const [messages,        setMessages]        = useState([])
  const [partner,         setPartner]         = useState(null)
  const [msgText,         setMsgText]         = useState('')
  const [restriction,     setRestriction]     = useState(null)
  const [search,          setSearch]          = useState('')
  const [searchResults,   setSearchResults]   = useState([])
  const [loadingConvos,   setLoadingConvos]   = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending,         setSending]         = useState(false)

  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const myId      = me?._id || me?.id

  // ── Socket Setup ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join', myId)
    })
    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg])
    })
    socket.on('messageSent', (msg) => {
      setMessages(prev => [...prev, msg])
      setSending(false)
    })
    socket.on('error', (err) => {
      toast(err.message || 'Message blocked.', 'error')
      setSending(false)
    })
    socket.on('connect_error', () => {
      toast('Real-time connection failed. Check the backend server.', 'warning')
    })

    return () => socket.disconnect()
  }, [myId])

  // ── Load Conversations ────────────────────────────────────────────
  useEffect(() => {
    api.get('/chat/conversations')
      .then(r => setConversations(r.data))
      .catch(() => toast('Could not load conversations.', 'error'))
      .finally(() => setLoadingConvos(false))
  }, [])

  // ── Load partner + history when URL param changes ─────────────────
  useEffect(() => {
    if (!chatPartnerId) { setMessages([]); setPartner(null); return }
    setLoadingMessages(true)
    Promise.all([
      api.get(`/auth/user/${chatPartnerId}`),
      api.get(`/chat/history/${chatPartnerId}`),
      api.get(`/chat/can-message/${chatPartnerId}`)
    ])
      .then(([pRes, mRes, cRes]) => {
        setPartner(pRes.data)
        setMessages(mRes.data)
        setRestriction(cRes.data)
      })
      .catch(() => toast('Could not open conversation.', 'error'))
      .finally(() => setLoadingMessages(false))
  }, [chatPartnerId])

  // ── Auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── User search ───────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => {
      api.get(`/auth/search?q=${encodeURIComponent(search)}`)
        .then(r => setSearchResults(r.data))
        .catch(console.error)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function sendMessage() {
    if (!msgText.trim() || !chatPartnerId || sending) return
    setSending(true)
    socketRef.current?.emit('sendMessage', {
      senderId:   myId,
      receiverId: chatPartnerId,
      message:    msgText.trim()
    })
    setMsgText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Conversation sidebar ──────────────────────────────────── */}
      <aside
        className={`flex flex-col w-full md:w-80 flex-shrink-0 border-r border-surface-border bg-surface-card
          ${chatPartnerId ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Header + Search */}
        <div className="p-4 border-b border-surface-border space-y-3">
          <h1 className="font-bold text-lg">Messages</h1>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users to message…"
              className="input text-sm pl-9"
            />
          </div>

          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <div className="card overflow-hidden shadow-xl">
              {searchResults.map(u => (
                <button
                  key={u._id}
                  onClick={() => {
                    navigate(`/chat/${u._id}`)
                    setSearch('')
                    setSearchResults([])
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-border/50 transition-colors"
                >
                  <img
                    src={u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                    alt={u.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium">{u.username}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[160px]">{u.bio || 'No bio'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="space-y-1 p-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 p-2 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-surface-border flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-surface-border rounded w-24" />
                    <div className="h-2.5 bg-surface-border rounded w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-14 px-5 text-gray-600">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1">Search for a user above to start chatting.</p>
            </div>
          ) : (
            conversations.map(({ user: contact, lastMessage }) => (
              <button
                key={contact._id}
                onClick={() => navigate(`/chat/${contact._id}`)}
                className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-surface-border/40 transition-colors border-b border-surface-border/30
                  ${chatPartnerId === contact._id ? 'bg-brand/10 border-l-2 border-l-brand' : ''}`}
              >
                <img
                  src={contact.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.username}`}
                  alt={contact.username}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold">{contact.username}</p>
                  <p className="text-xs text-gray-500 truncate">{lastMessage?.message || 'Say hello!'}</p>
                </div>
                {lastMessage && (
                  <span className="text-xs text-gray-600 flex-shrink-0">{timeStr(lastMessage.createdAt)}</span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat window ───────────────────────────────────────────── */}
      <div className={`flex flex-col flex-1 min-w-0 ${!chatPartnerId ? 'hidden md:flex' : 'flex'}`}>

        {!chatPartnerId ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="text-6xl mb-4">💬</div>
              <h2 className="font-bold text-lg mb-1">Your Messages</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Send private messages to people you follow. Search above to start a new conversation.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface-card flex-shrink-0">
              <button
                onClick={() => navigate('/chat')}
                className="md:hidden text-gray-400 hover:text-white transition-colors p-1"
              >
                ←
              </button>

              {partner ? (
                <>
                  <Link to={`/profile/${partner._id}`}>
                    <img
                      src={partner.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.username}`}
                      alt={partner.username}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${partner._id}`}
                      className="font-semibold text-sm hover:text-brand-light transition-colors"
                    >
                      {partner.username}
                    </Link>
                    {restriction?.isRestricted && restriction.remainingMessages !== Infinity && (
                      <p className="text-xs text-yellow-500">
                        ⚠️ {restriction.remainingMessages} message{restriction.remainingMessages !== 1 ? 's' : ''} remaining
                        (follow each other to unlock unlimited)
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/profile/${partner._id}`}
                    className="btn-ghost text-xs py-1.5 px-3 flex-shrink-0"
                  >
                    View Profile
                  </Link>
                </>
              ) : (
                <div className="h-5 w-32 bg-surface-border rounded animate-pulse" />
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
                  <div className="text-4xl mb-2">👋</div>
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = (msg.senderId?._id || msg.senderId)?.toString() === myId?.toString()
                  const showTime = i === 0 ||
                    new Date(msg.createdAt) - new Date(messages[i - 1]?.createdAt) > 5 * 60 * 1000

                  return (
                    <div key={msg._id || i}>
                      {showTime && (
                        <p className="text-center text-xs text-gray-600 my-2">{timeStr(msg.createdAt)}</p>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                            isMine
                              ? 'bg-brand text-white rounded-br-sm'
                              : 'bg-surface-card border border-surface-border text-gray-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-surface-border bg-surface-card flex-shrink-0">
              {restriction?.isRestricted && restriction.remainingMessages === 0 ? (
                <div className="text-center text-sm text-red-400 py-2 bg-red-900/20 rounded-xl px-4 border border-red-800">
                  🚫 Message limit reached. Follow each other to keep chatting.
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <textarea
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    className="input text-sm flex-1 resize-none py-2.5"
                    rows={1}
                    disabled={sending}
                    style={{ maxHeight: 120, overflowY: 'auto' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!msgText.trim() || sending}
                    className="btn-primary px-4 py-2.5 flex-shrink-0"
                  >
                    {sending
                      ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    }
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
