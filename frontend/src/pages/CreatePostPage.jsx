import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

export default function CreatePostPage() {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const toast = useToast()

  // 1. File input handler
  const onFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      console.log('[Post Fix] File selected:', selectedFile) // Task Debug Log
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }

  // 3. handlePost() function
  const handlePost = async (e) => {
    e.preventDefault()
    if (!file) return toast('Please select an image', 'warning')

    setLoading(true)
    
    // 1. Use FormData
    const formData = new FormData()
    formData.append('image', file) // Field name MUST be "image"
    formData.append('caption', caption)

    try {
      console.log('[Post Fix] Sending POST /posts/create...')
      
      // 3. Axios request with proper headers
      const { data } = await api.post('/posts/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      console.log('[Post Fix] Upload success:', data)
      toast('Post created!', 'success')
      navigate('/')
    } catch (err) {
      console.error('[Post Fix] Upload failed:', err)
      toast('Failed to upload post', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Create Post</h1>
      
      <form onSubmit={handlePost} className="card p-6 space-y-4">
        {/* File Picker */}
        <div className="relative aspect-square bg-surface-border rounded-xl overflow-hidden border-2 border-dashed border-gray-700">
          <input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-4xl">🖼️</span>
              <p className="text-sm mt-2">Pick an image</p>
            </div>
          )}
        </div>

        {/* 2. Caption input */}
        <textarea
          placeholder="Caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="input w-full min-h-[100px]"
        />

        <button
          type="submit"
          disabled={loading || !file}
          className="btn-primary w-full py-3"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  )
}
