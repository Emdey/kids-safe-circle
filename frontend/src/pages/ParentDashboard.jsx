import { useEffect, useState } from 'react';
import { api, clearToken } from '../api/client.js';
import FenceDivider from '../components/FenceDivider.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { AVATARS, FAVORITE_COLORS, avatarEmoji, colorHex } from '../constants.js';

export default function ParentDashboard({ onSignOut, onEnterGarden }) {
  const [children, setChildren] = useState([]);
  const [connections, setConnections] = useState([]);
  const [queue, setQueue] = useState([]);
  const [commentQueue, setCommentQueue] = useState([]);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAvatar, setNewChildAvatar] = useState(AVATARS[0].key);
  const [newChildColor, setNewChildColor] = useState(FAVORITE_COLORS[0].key);
  const [newChildBio, setNewChildBio] = useState('');
  const [connectEmail, setConnectEmail] = useState('');
  const [message, setMessage] = useState(null);

  async function refreshAll() {
    const [c, conn, q, cq] = await Promise.all([
      api.listChildren(),
      api.listConnections(),
      api.reviewQueue(),
      api.commentQueue()
    ]);
    setChildren(c.children);
    setConnections(conn.connections);
    setQueue(q.queue);
    setCommentQueue(cq.queue);
  }

  useEffect(() => {
    refreshAll().catch((err) => setMessage(err.message));
  }, []);

  async function handleAddChild(e) {
    e.preventDefault();
    try {
      await api.addChild({
        displayName: newChildName,
        avatarKey: newChildAvatar,
        favoriteColor: newChildColor,
        bio: newChildBio.trim() || undefined
      });
      setNewChildName('');
      setNewChildBio('');
      await refreshAll();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleConnect(e) {
    e.preventDefault();
    try {
      const res = await api.requestConnection(connectEmail);
      setMessage(res.message);
      setConnectEmail('');
      await refreshAll();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleRespond(id, status) {
    await api.respondConnection(id, status);
    await refreshAll();
  }

  async function handleDecide(postId, decision) {
    await api.decidePost(postId, decision);
    await refreshAll();
  }

  async function handleDecideComment(commentId, decision) {
    await api.decideComment(commentId, decision);
    await refreshAll();
  }

  const pendingIncoming = connections.filter((c) => c.status === 'pending');
  const approved = connections.filter((c) => c.status === 'approved');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>The Gate</h1>
        <button className="btn-quiet" onClick={() => { clearToken(); onSignOut(); }}>
          Sign out
        </button>
      </header>
      <p style={{ color: 'var(--color-ink-soft)' }}>
        Everything here is private to your family until you say otherwise.
      </p>
      {message && <p className="error-text">{message}</p>}

      <FenceDivider label="Your children" />
      <div className="card">
        {children.length === 0 && <p>No profiles yet — add your first child below.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {children.map((child) => (
            <div
              key={child.id}
              style={{
                border: `2px solid ${colorHex(child.favorite_color)}`,
                borderRadius: 'var(--radius-md)',
                padding: 12,
                minWidth: 130,
                maxWidth: 160,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 32 }}>{avatarEmoji(child.avatar_key)}</div>
              <strong>{child.display_name}</strong>
              {child.bio && (
                <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', marginTop: 4 }}>{child.bio}</p>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddChild}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              placeholder="Child's first name"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              required
              style={{ flex: 1, minWidth: 160 }}
            />
            <select value={newChildAvatar} onChange={(e) => setNewChildAvatar(e.target.value)}>
              {AVATARS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.emoji} {a.key}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>Favorite color:</span>
            {FAVORITE_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setNewChildColor(c.key)}
                aria-label={c.key}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c.hex,
                  border: newChildColor === c.key ? '3px solid var(--color-ink)' : '2px solid transparent',
                  padding: 0
                }}
              />
            ))}
          </div>

          <input
            placeholder="Short bio (optional) — e.g. 'loves dinosaurs and drawing'"
            value={newChildBio}
            onChange={(e) => setNewChildBio(e.target.value)}
            maxLength={100}
            style={{ marginBottom: 8 }}
          />

          <button type="submit" className="btn-primary">Add child</button>
        </form>
      </div>

      <FenceDivider label="Posts waiting for your OK" />
      <div className="card">
        {queue.length === 0 && <p>Nothing waiting for review right now.</p>}
        {queue.map((post) => (
          <div key={post.id} style={{ borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{post.child_name}</strong>
              <StatusBadge status={post.moderation_status} />
            </div>
            {post.content_type === 'text' && <p>{post.text_content}</p>}
            {post.content_type === 'image' && (
              <img src={post.media_url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
            )}
            {post.content_type === 'video' && (
              <>
                <video
                  src={post.media_url}
                  controls
                  style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }}
                />
                <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
                  Videos aren't automatically screened yet — please watch the whole clip before approving.
                </p>
              </>
            )}
            {post.moderation_notes && (
              <p style={{ fontSize: 13, color: 'var(--color-clay)' }}>Automated note: {post.moderation_notes}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-bloom" onClick={() => handleDecide(post.id, 'bloom')}>
                Let it bloom
              </button>
              <button className="btn-quiet" onClick={() => handleDecide(post.id, 'wilted')}>
                Don't show it
              </button>
            </div>
          </div>
        ))}
      </div>

      <FenceDivider label="Comments waiting for your OK" />
      <div className="card">
        {commentQueue.length === 0 && <p>Nothing waiting for review right now.</p>}
        {commentQueue.map((comment) => (
          <div key={comment.id} style={{ borderBottom: '1px solid var(--color-border)', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{comment.child_name}</strong>
              <StatusBadge status={comment.moderation_status} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
              Replying to: {comment.post_content_type === 'text' ? `"${comment.post_text_content}"` : `a ${comment.post_content_type}`}
            </p>
            <p>{comment.text_content}</p>
            {comment.moderation_notes && (
              <p style={{ fontSize: 13, color: 'var(--color-clay)' }}>Automated note: {comment.moderation_notes}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-bloom" onClick={() => handleDecideComment(comment.id, 'bloom')}>
                Let it bloom
              </button>
              <button className="btn-quiet" onClick={() => handleDecideComment(comment.id, 'wilted')}>
                Don't show it
              </button>
            </div>
          </div>
        ))}
      </div>

      <FenceDivider label="Connected families" />
      <div className="card">
        {pendingIncoming.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16 }}>Waiting for your response</h3>
            {pendingIncoming.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span>{c.other_parent_email}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-bloom" onClick={() => handleRespond(c.id, 'approved')}>Approve</button>
                  <button className="btn-quiet" onClick={() => handleRespond(c.id, 'blocked')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 16 }}>Approved ({approved.length})</h3>
        {approved.length === 0 && <p>No connected families yet.</p>}
        {approved.map((c) => (
          <div key={c.id} style={{ padding: '4px 0' }}>{c.other_parent_email}</div>
        ))}

        <form onSubmit={handleConnect} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            type="email"
            placeholder="Another parent's email"
            value={connectEmail}
            onChange={(e) => setConnectEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Send request</button>
        </form>
        <p style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
          There's no directory or search — you can only connect with a parent whose email you already have.
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button className="btn-primary" onClick={onEnterGarden}>Open the garden view</button>
      </div>
    </div>
  );
}
