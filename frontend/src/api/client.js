const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const TOKEN_KEY = 'ksc_parent_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.errors?.[0]?.msg || 'Something went wrong.';
    throw new Error(message);
  }
  return data;
}

export const api = {
  signup: (email, password) =>
    request('/auth/signup', { method: 'POST', body: { email, password, consentAcknowledged: 'true' } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),

  listChildren: () => request('/children'),
  addChild: (child) => request('/children', { method: 'POST', body: child }),
  updateChild: (childId, updates) => request(`/children/${childId}`, { method: 'PATCH', body: updates }),
  removeChild: (childId) => request(`/children/${childId}`, { method: 'DELETE' }),

  listConnections: () => request('/connections'),
  requestConnection: (email) => request('/connections', { method: 'POST', body: { email } }),
  respondConnection: (id, status) => request(`/connections/${id}/respond`, { method: 'POST', body: { status } }),

  createPost: (post) => request('/posts', { method: 'POST', body: post }),
  reviewQueue: () => request('/posts/queue'),
  decidePost: (postId, decision) => request(`/posts/${postId}/decide`, { method: 'POST', body: { decision } }),
  feed: (childId) => request(`/posts/feed${childId ? `?childId=${childId}` : ''}`),
  toggleReaction: (postId, childId, emoji) =>
    request(`/posts/${postId}/reactions`, { method: 'POST', body: { childId, emoji } }),

  createComment: (postId, childId, textContent) =>
    request('/comments', { method: 'POST', body: { postId, childId, textContent } }),
  commentsForPost: (postId) => request(`/comments/for-post/${postId}`),
  commentQueue: () => request('/comments/queue'),
  decideComment: (commentId, decision) =>
    request(`/comments/${commentId}/decide`, { method: 'POST', body: { decision } }),

  report: (payload) => request('/reports', { method: 'POST', body: payload })
};
