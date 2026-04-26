import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-8">
      <div className="animate-scale-in">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-400 mb-6">This page doesn't exist or was removed.</p>
        <Link to="/" className="btn-primary inline-block">Go Home</Link>
      </div>
    </div>
  )
}
