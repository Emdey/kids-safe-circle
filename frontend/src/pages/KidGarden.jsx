import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function KidGarden({ children, onBackToGate }) {
  const [activeChild, setActiveChild] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [justPlanted, setJustPlanted] = useState(false);

  useEffect(() => {
    api.feed().then((res) => setPosts(res.posts));
  }, []);

  async function plantPost(e) {
    e.preventDefault();
    if (!draft.trim() || !activeChild) return;
    await api.createPost({ childId: activeChild.id, contentType: 'text', textContent: draft.trim() });
    setDraft('');
    setJustPlanted(true);
    setTimeout(() => setJustPlanted(false), 2500);
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
                border: '3px solid var(--color-sprout)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                width: 130,
                fontSize: 18
              }}
            >
              <div style={{ fontSize: 40 }}>🌱</div>
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
        <button type="submit" className="btn-bloom" style={{ marginTop: 8, fontSize: 18 }}>
          Plant it 🌱
        </button>
        {justPlanted && (
          <p style={{ color: 'var(--color-hedge)', fontWeight: 700 }}>
            Planted! A grown-up will take a look before it shows up in the garden.
          </p>
        )}
      </form>

      <h2 style={{ marginTop: 32, fontSize: 20 }}>The garden 🌼</h2>
      {posts.length === 0 && <p>Nothing has bloomed yet — check back soon!</p>}
      {posts.map((post) => (
        <div key={post.id} className="card" style={{ marginTop: 12 }}>
          <strong>{post.child_name}</strong>
          {post.content_type === 'text' ? (
            <p style={{ fontSize: 18 }}>{post.text_content}</p>
          ) : (
            <img src={post.media_url} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
          )}
        </div>
      ))}
    </div>
  );
}
