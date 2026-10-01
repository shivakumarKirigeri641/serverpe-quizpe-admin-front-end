import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

/**
 * src/lib/session.jsx
 * ---------------------------------------------------------------------------
 * Who is signed in, and what they may do — for the whole panel.
 *
 * FAILING OPEN IS DELIBERATE. If /me cannot be reached, or answers without a
 * `can` list because the back-end is older than this build, every capability
 * check returns true and the panel behaves exactly as it did before
 * capabilities existed. The alternative — hiding navigation because a request
 * failed — is indistinguishable from features silently disappearing, and the
 * person it would happen to owns the business.
 *
 * This is not the security boundary. The server decides what an admin may
 * actually do; this only decides what is worth offering them.
 */

const Ctx = createContext(null);

export function SessionProvider({ authed, children }) {
  const [me, setMe] = useState(null);
  const [can, setCan] = useState(null);        // null = unknown → allow everything
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    if (!authed) { setMe(null); setCan(null); setReady(true); return Promise.resolve(); }
    return api.me()
      .then((out) => {
        setMe({ mobile: out.mobile, super: !!out.super, enforcing: !!out.enforcing });
        setCan(Array.isArray(out.can) ? out.can : null);
      })
      .catch(() => { setMe(null); setCan(null); })   // older back-end, or offline
      .finally(() => setReady(true));
  }, [authed]);

  useEffect(() => { load(); }, [load]);

  return <Ctx.Provider value={{ me, can, ready, reload: load }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx) || { me: null, can: null, ready: true };

/** May this admin open the thing that needs `cap`? Unknown means yes. */
export function useAllowed() {
  const { can } = useSession();
  return (cap) => !cap || !Array.isArray(can) || can.includes(cap);
}
