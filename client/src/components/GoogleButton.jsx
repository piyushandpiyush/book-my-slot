import { useEffect, useRef, useState } from 'react';
import api from '../services/api.js';

const SRC = 'https://accounts.google.com/gsi/client';

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    let s = document.querySelector(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = SRC; s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    s.addEventListener('load', resolve, { once: true });
    s.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), { once: true });
  });
}

// Renders the official "Sign in with Google" button. `onCredential(idToken)` receives the Google ID token,
// which the backend verifies - the browser result is never trusted on its own.
export default function GoogleButton({ onCredential, text = 'continue_with' }) {
  const box = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [state, setState] = useState('loading'); // loading | ready | off | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/config');
        const clientId = data.data.googleClientId;
        if (!clientId) { if (!cancelled) setState('off'); return; }
        await loadGsi();
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) });
        window.google.accounts.id.renderButton(box.current, { theme: 'filled_black', size: 'large', text, shape: 'pill', width: 320 });
        setState('ready');
      } catch { if (!cancelled) setState('error'); }
    })();
    return () => { cancelled = true; };
  }, [text]);

  if (state === 'off') return <p className="muted small">Google sign-in is not configured yet (set GOOGLE_CLIENT_ID on the server).</p>;
  if (state === 'error') return <p className="muted small">Google sign-in could not be loaded. Check your internet connection.</p>;
  return <div ref={box} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
}
