import { useState } from 'react';
import { api, setToken } from '../api/client.js';

export default function ParentAuth({ onSignedIn }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !consent) {
      setError('Please confirm you are the parent or guardian setting this account up.');
      return;
    }

    setBusy(true);
    try {
      const data = mode === 'signup' ? await api.signup(email, password) : await api.login(email, password);
      setToken(data.token);
      onSignedIn(data.parent);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 32, textAlign: 'center' }}>Kids Safe Circle</h1>
      <p style={{ textAlign: 'center', color: 'var(--color-ink-soft)', marginBottom: 32 }}>
        A closed garden for your child's photos and posts — visible only to families you've personally approved.
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className={mode === 'signup' ? 'btn-primary' : 'btn-quiet'}
            style={{ flex: 1 }}
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
          <button
            type="button"
            className={mode === 'login' ? 'btn-primary' : 'btn-quiet'}
            style={{ flex: 1 }}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'signup' && (
            <div className="field" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                id="consent"
                type="checkbox"
                style={{ width: 'auto', marginTop: 4 }}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <label htmlFor="consent" style={{ fontWeight: 400 }}>
                I am this child's parent or legal guardian, and I'm setting up this account myself.
              </label>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
