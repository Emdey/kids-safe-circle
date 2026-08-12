import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { uploadMedia, mediaUploadConfigured } from '../api/cloudinary.js';
import { AVATARS, avatarEmoji, colorHex } from '../constants.js';

const MAX_FILE_MB = 25;
const REACTION_EMOJI = ['🌻', '💚', '😊', '👍', '🎉'];

function PostCard({ post, activeChild, onChanged }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSent, setCommentSent] = useState(false);

  async function toggleComments() {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      const res = await api.commentsForPost(post.id);
      setComments(res.comments);
      setLoadingComments(false);
    }
    setShowComments((s) => !s);
  }

  async function handleReact(emoji) {
    await api.toggleReaction(post.id, activeChild.id, emoji);
    onChanged();
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    await api.createComment(post.id, activeChild.id, commentDraft.trim());
    setCommentDraft('');
    setCommentSent(true);
    setTimeout(() => setCommentSent(false), 2500);
  }

  return (
    <div className="card" style={{ marginTop: 12, borderLeft: `4px solid ${colorHex(post.favorite_color)}` }}>
      <strong>{avatarEmoji(post.avatar_key)} {post.child_name}</strong>
      {post.content_type === 'text' && <p style={{ fontSize: 18 }}>{post.text_content}</p>}
      {post.content_type === 'image' && (
        <img src={post.media_url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
      )}
      {post.content_type === 'video' && (
        <video src={post.media_url} controls style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {REACTION_EMOJI.map((emoji) => {
          const found = post.reactions?.find((r) => r.emoji === emoji);
          const isMine = post.my_reaction === emoji;
          return (
            <button
              key={emoji}
              type="button"
              className={isMine ? 'btn-bloom' : 'btn-quiet'}
              style={{ padding: '4px 10px', fontSize: 16 }}
              onClick={() => handleReact(emoji)}
            >
              {emoji} {found ? found.count : ''}
            </button>
          );
        })}
      </div>

      <button type="button" className="btn-quiet" style={{ marginTop: 8, fontSize: 13 }} onClick={toggleComments}>
        💬 {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count === 1 ? '' : 's'}` : 'Say something nice'}
      </button>

      {showComments && (
        <div style={{ marginTop: 8 }}>
          {loadingComments && <p style={{ fontSize: 13 }}>Loading…</p>}
          {comments.map((c) => (
            <p key={c.id} style={{ fontSize: 14, margin: '4px 0' }}>
              <strong>{avatarEmoji(c.avatar_key)} {c.child_name}:</strong> {c.text_content}
            </p>
          ))}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              placeholder="Write something kind…"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              maxLength={300}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-bloom" style={{ padding: '6px 14px' }}>
              Send
            </button>
          </form>
          {commentSent && (
            <p style={{ fontSize: 13, color: 'var(--color-hedge)', fontWeight: 700 }}>
              Sent! A grown-up will look at it before others see it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function KidGarden({ children, onBackToGate }) {
  const [activeChild, setActiveChild] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [justPlanted, setJustPlanted] = useState(false);

  async function refreshFeed() {
    if (!activeChild) return;
    const res = await api.feed(activeChild.id);
    setPosts(res.posts);
  }

  useEffect(() => {
    refreshFeed();
  }, [activeChild]);

  function handleFileChange(e) {
    setError(null);
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!/^image\/|^video\//.test(picked.type)) {
      setError('Please choose a photo or a video.');
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too big - please choose one under ${MAX_FILE_MB}MB.`);
      return;
    }
    setFile(picked);
  }

  async function plantPost(e) {
    e.preventDefault();
    if (!activeChild || (!draft.trim() && !file)) return;
    setError(null);

    try {
      if (file) {
        setUploading(true);
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const mediaUrl = await uploadMedia(file, resourceType);
        await api.createPost({ childId: activeChild.id, contentType: resourceType, mediaUrl });
      } else {
        await api.createPost({ childId: activeChild.id, contentType: 'text', textContent: draft.trim() });
      }
      setDraft('');
      setFile(null);
      setJustPlanted(true);
      setTimeout(() => setJustPlanted(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!activeChild) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <h1 style={{ fontSize: 30 }}>Who's playing? 🌻</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 24 }}>
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveChild(child)}
              style={{
                background: 'var(--color-bg-elevated)',
                border: `3px solid ${colorHex(child.favorite_color)}`,
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                width: 130,
                fontSize: 18
              }}
            >
              <div style={{ fontSize: 40 }}>{avatarEmoji(child.avatar_key)}</div>
              {child.display_name}
            </button>
          ))}
        </div>
        <button className="btn-quiet" style={{ marginTop: 32 }} onClick={onBackToGate}>
          Back to the gate
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24 }}>Hi, {activeChild.display_name}! 👋</h1>
        <button className="btn-quiet" onClick={() => setActiveChild(null)}>Switch</button>
      </div>

      <form onSubmit={plantPost} className="card" style={{ marginTop: 16 }}>
        <label htmlFor="draft" style={{ fontWeight: 700 }}>
          Plant something for your garden friends 🌻
        </label>
        <textarea
          id="draft"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={Boolean(file)}
          style={{
            width: '100%',
            marginTop: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}
          placeholder="What do you want to share?"
        />

        {mediaUploadConfigured() ? (
          <div style={{ marginTop: 8 }}>
            <label
              htmlFor="mediaFile"
              className="btn-quiet"
              style={{ display: 'inline-block', cursor: 'pointer' }}
            >
              📷 Add a photo or video instead
            </label>
            <input
              id="mediaFile"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{file.name}</span>
                <button type="button" className="btn-quiet" onClick={() => setFile(null)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--color-clay)', marginTop: 8 }}>
            Photo/video sharing isn't set up yet. (cloud name:{' '}
            {import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'MISSING'}, preset:{' '}
            {import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'MISSING'})
          </p>
        )}

        <button type="submit" className="btn-bloom" style={{ marginTop: 8, fontSize: 18 }} disabled={uploading}>
          {uploading ? 'Planting…' : 'Plant it 🌱'}
        </button>

        {error && <p className="error-text">{error}</p>}
        {justPlanted && (
          <p style={{ color: 'var(--color-hedge)', fontWeight: 700 }}>
            Planted! A grown-up will take a look before it shows up in the garden.
          </p>
        )}
      </form>

      <h2 style={{ marginTop: 32, fontSize: 20 }}>The garden 🌼</h2>
      {posts.length === 0 && <p>Nothing has bloomed yet — check back soon!</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} activeChild={activeChild} onChanged={refreshFeed} />
      ))}
    </div>
  );
}
