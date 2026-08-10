import { useEffect, useState } from 'react';
import { api, getToken } from './api/client.js';
import ParentAuth from './pages/ParentAuth.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import KidGarden from './pages/KidGarden.jsx';

export default function App() {
  const [parent, setParent] = useState(null);
  const [view, setView] = useState('gate'); // 'gate' | 'garden'
  const [children, setChildren] = useState([]);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (getToken()) {
      api
        .listChildren()
        .then(() => setParent({}))
        .catch(() => {})
        .finally(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, []);

  async function enterGarden() {
    const res = await api.listChildren();
    setChildren(res.children);
    setView('garden');
  }

  if (checkingSession) return null;

  if (!parent) {
    return <ParentAuth onSignedIn={(p) => setParent(p)} />;
  }

  if (view === 'garden') {
    return <KidGarden children={children} onBackToGate={() => setView('gate')} />;
  }

  return <ParentDashboard onSignOut={() => setParent(null)} onEnterGarden={enterGarden} />;
}
