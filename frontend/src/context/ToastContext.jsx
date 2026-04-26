import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

/**
 * Toast types: 'success' | 'error' | 'warning' | 'info'
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const ICONS = { success: '✅', error: '🚫', warning: '⚠️', info: 'ℹ️' }
  const COLORS = {
    success: 'border-green-700 bg-green-900/40 text-green-200',
    error:   'border-red-700 bg-red-900/40 text-red-200',
    warning: 'border-yellow-700 bg-yellow-900/40 text-yellow-200',
    info:    'border-brand/50 bg-brand/10 text-brand-light',
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl animate-fade-in max-w-xs pointer-events-auto ${COLORS[t.type]}`}
          >
            <span>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
