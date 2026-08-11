import { useEffect, useState } from 'react';
import { api, clearToken } from '../api/client.js';
import FenceDivider from '../components/FenceDivider.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const AVATARS = ['sprout-1', 'sprout-2', 'sprout-3', 'sprout-4', 'sprout-5', 'sprout-6'];

export default function ParentDashboard({ onSignOut, onEnterGarden }) {
  const [children, setChildren] = useState([]);
  const [connections, setConnections] = useState([]);
  const [queue, setQueue] = useState([]);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAvatar, setNewChildAvatar] = useState(AVATARS[0]);
  const [connectEmail, setConnectEmail] = useState('');
  const [message, setMessage] = useState(null);

  async function refreshAll() {
    const [c, conn, q] = await Promise.all([api.listChildren(), api.listConnections(), api.reviewQueue()]);
    setChildren(c.children);
    setConnections(conn.connections);
    setQueue(q.queue);
  }

  useEffect(() => {
    refreshAll().catch((err) => setMessage(err.message));
  }, []);

  async function handleAddChild(e) {
    e.preventDefault();
    try {
      await api.addChild({ displayName: newChildName, avatarKey: newChildAvatar });
      setNewChildName('');
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
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                minWidth: 120,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 32 }}>🌱</div>
              <strong>{child.display_name}</strong>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddChild} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Child's first name"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            required
            style={{ flex: 1, minWidth: 160 }}
          />
          <select value={newChildAvatar} onChange={(e) => setNewChildAvatar(e.target.value)}>
            {AVATARS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
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
