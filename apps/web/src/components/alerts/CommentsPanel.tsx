import { CSSProperties, useState } from 'react';
import type { AlertComment } from '../../types/domain';
import { formatDateTime } from '../../utils/dateFormat';

interface CommentsPanelProps {
  comments: AlertComment[];
  onAddComment: (message: string) => Promise<void>;
  hideTitle?: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginBottom: 'var(--space-md)',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  badge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-muted)',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-md)',
    maxHeight: 250,
    overflowY: 'auto',
  },
  comment: {
    padding: 'var(--space-sm) var(--space-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-xs)',
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
  },
  commentTime: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
  commentMessage: {
    fontSize: 13,
    color: 'var(--color-text-primary)',
    lineHeight: 1.5,
  },
  empty: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    marginBottom: 'var(--space-md)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
  },
  textarea: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: 60,
  },
  button: {
    alignSelf: 'flex-end',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export function CommentsPanel({ comments, onAddComment, hideTitle = false }: CommentsPanelProps) {
  const [message, setMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  const handleSubmit = async () => {
    if (!message.trim() || isPosting) return;
    
    setIsPosting(true);
    try {
      await onAddComment(message.trim());
      setMessage('');
    } finally {
      setIsPosting(false);
    }
  };
  
  return (
    <div style={styles.container}>
      {!hideTitle && (
        <div style={styles.title}>
          Comments
          <span style={styles.badge}>{comments.length}</span>
        </div>
      )}
      
      {comments.length === 0 ? (
        <div style={styles.empty}>No comments yet</div>
      ) : (
        <div style={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.id} style={styles.comment}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>{comment.author.name}</span>
                <span style={styles.commentTime}>
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <div style={styles.commentMessage}>{comment.message}</div>
            </div>
          ))}
        </div>
      )}
      
      <div style={styles.form}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a comment..."
          style={styles.textarea}
          aria-label="Comment message"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isPosting}
          style={{
            ...styles.button,
            ...(!message.trim() || isPosting ? styles.buttonDisabled : {}),
          }}
          aria-label="Post comment"
        >
          {isPosting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}

