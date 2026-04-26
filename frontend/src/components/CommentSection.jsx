import { useState, useEffect } from 'react'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

/**
 * Task 5: DISPLAY COMMENTS BASED ON STATUS
 */
function CommentItem({ comment }) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Task 5: Blocked comments (status: blocked) are not rendered
  if (comment.status === 'blocked') {
    console.log(`[Task 7] Skipping render for blocked comment: ${comment._id}`);
    return null;
  }

  return (
    <div className="flex gap-3 py-3 border-b border-surface-border animate-fade-in group">
      <img
        src={comment.user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.username}`}
        className="w-8 h-8 rounded-full bg-surface-border object-cover flex-shrink-0"
        alt={comment.user?.username}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 mb-1">{comment.user?.username}</p>
        
        {/* Task 5: Hidden → Show hidden message */}
        {comment.status === 'hidden' && (
          <div className="text-sm italic text-gray-500 bg-red-900/10 border border-red-900/20 px-3 py-2 rounded-lg">
            🚫 This comment is hidden because it was flagged as toxic.
          </div>
        )}

        {/* Task 5: Blurred → Blur text using CSS */}
        {comment.status === 'blurred' && (
          <div className="relative">
            <p className={`text-sm leading-relaxed transition-all duration-300 ${!isRevealed ? 'blur-md select-none pointer-events-none' : ''}`}>
              {comment.text}
            </p>
            {!isRevealed && (
              <button 
                onClick={() => setIsRevealed(true)}
                className="mt-2 text-[10px] uppercase tracking-wider font-bold text-brand-light hover:text-white transition-colors"
              >
                Reveal sensitive content
              </button>
            )}
            {isRevealed && (
               <button 
               onClick={() => setIsRevealed(false)}
               className="mt-2 text-[10px] text-gray-600 hover:text-gray-400"
             >
               Hide again
             </button>
            )}
          </div>
        )}

        {/* Task 5: Allowed → Show normally */}
        {(comment.status === 'allowed' || !comment.status) && (
          <p className="text-sm text-gray-200 leading-relaxed break-words">{comment.text}</p>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const toast = useToast()

  // Fetch comments on load
  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${postId}`);
      setComments(data);
    } catch (err) {
      console.error('[Task 7] Fetch error:', err);
    } finally {
      setFetching(false);
    }
  };

  /**
   * Task 2: handleComment() function
   */
  const handleComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    console.log(`[Task 7] Sending POST /comments/add for post ${postId}`);

    try {
      // Task 2: API call to POST /comments/add
      const { data } = await api.post('/comments/add', { 
        postId, 
        text: text.trim() 
      });

      console.log('[Task 7] Success response:', data);
      
      // Update local state
      setComments(prev => [...prev, data]);
      setText('');
      
      // Notify based on status
      if (data.status === 'blurred') toast('Comment posted (blurred).', 'warning');
      else if (data.status === 'hidden') toast('Comment posted (hidden).', 'warning');
      else toast('Comment posted!', 'success');

    } catch (err) {
      // Task 7: Error handling
      const errorMsg = err.response?.data?.error || 'Failed to post comment.';
      console.error('[Task 7] Submission error:', errorMsg);
      toast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Comment List */}
      <div className="space-y-1">
        {fetching ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-surface-border rounded w-1/2" />
            <div className="h-4 bg-surface-border rounded w-3/4" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No comments yet.</p>
        ) : (
          comments.map(c => <CommentItem key={c._id} comment={c} />)
        )}
      </div>

      {/* Task 2: Input Field and Submit Button */}
      <form onSubmit={handleComment} className="flex gap-2 border-t border-surface-border pt-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="input flex-1 py-2 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="btn-primary py-2 px-6 text-sm flex-shrink-0"
        >
          {loading ? (
             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : 'Post'}
        </button>
      </form>
    </div>
  )
}
