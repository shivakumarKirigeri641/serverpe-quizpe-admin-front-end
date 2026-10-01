/**
 * src/lib/secure.js
 * ---------------------------------------------------------------------------
 * The browser half of the encrypted admin channel.
 *
 * What the Network tab shows once this is active: a handshake (two public
 * keys), then only `POST /admin/api/_x` with ciphertext both ways. The real
 * method, path, query and body — children's names, parents' numbers, payments
 * — travel inside the envelope.
 *
 * The key is agreed per visit (ECDH P-256 -> HKDF-SHA-256 -> AES-256-GCM) and
 * never sent. The server returns a sealed token holding it, which only the
 * server can open, so the session survives a pm2 restart without either side
 * keeping state. A reload agrees a new key.
 *
 * ─── IT DECIDES FOR ITSELF, AND FAILS TO PLAIN ──────────────────────────────
 *
 * Nothing here is configured. On the first call it asks for a handshake once:
 *   · 404 or any error  -> the server has ADMIN_TUNNEL off. Remember that, stop
 *                          asking, and send ordinary JSON for the rest of the
 *                          visit. This is the normal case today.
 *   · a key comes back  -> use the channel from then on.
 *
 * So this file cannot break the panel by existing. A build carrying it behaves
 * exactly like a build without it until someone sets ADMIN_TUNNEL=1 on the
 * server — which means the front-end can ship first, and must.
 *
 * Web Crypto only exists on HTTPS or localhost. On plain http from a phone on
 * the Wi-Fi it is simply absent, available() is false, and everything falls
 * back — which the server accepts unless ADMIN_TUNNEL_REQUIRE=1.
 * ---------------------------------------------------------------------------
 */

const enc = new TextEncoder();
const INFO = enc.encode('quizpe/tunnel/v1');

const b64 = (bytes) => {
  const a = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < a.length; i += 1) s += String.fromCharCode(a[i]);
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const join = (a, b) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };
const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, '0')).join('');

/** A random id this browser keeps. The server binds each key to it (and to the
    user agent), so a key copied into another browser is refused. */
let memId = null;
function deviceId() {
  try {
    let id = localStorage.getItem('quizpe.dev');
    if (!id) { id = rand() + rand(); localStorage.setItem('quizpe.dev', id); }
    return id;
  } catch {
    memId = memId || rand() + rand();
    return memId;                            // private window
  }
}

export const available = () =>
  Boolean(globalThis.crypto && globalThis.crypto.subtle && globalThis.isSecureContext);

let session = null;
let unsupported = false;

async function agree(base) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));

  const res = await fetch(`${base}/admin/api/_hs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-qp-d': deviceId() },
    body: JSON.stringify({ pub: b64(pub) }),
  });
  if (!res.ok) throw new Error(`handshake ${res.status}`);

  const { k, pub: serverB64, ttl } = await res.json();
  const serverRaw = unb64(serverB64);
  const serverPub = await crypto.subtle.importKey('raw', serverRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: serverPub }, pair.privateKey, 256);
  const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: join(pub, serverRaw), info: INFO },
    hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

  // Renew a minute before the server would stop accepting it.
  return { k, key, renewAt: Date.now() + Math.max(60000, (Number(ttl) || 1800000) - 60000) };
}

/** The current session, agreeing one if needed. Null when the server has it off. */
async function current(base, fresh = false) {
  if (unsupported || !available()) return null;
  if (fresh || !session) {
    session = agree(base).catch((e) => {
      unsupported = true;                      // ask once, then stop asking
      session = null;
      if (!/handshake 404/.test(e.message)) console.warn('[secure] channel unavailable:', e.message);
      return null;
    });
  }
  const s = await session;
  if (s && Date.now() > s.renewAt) return current(base, true);
  return s;
}

async function sealWith(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return b64(join(iv, new Uint8Array(body)));
}

async function openWith(key, text) {
  const raw = unb64(text);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, key, raw.subarray(12));
  return JSON.parse(new TextDecoder().decode(clear));
}

/**
 * Send one call through the channel.
 *
 * @returns {Promise<{ status:number, data:object }|null>}
 *          null means "not available — send it plainly", which is the caller's
 *          normal path and not an error.
 */
export async function send(base, { method = 'GET', path, body, token, signal }) {
  const s = await current(base);
  if (!s) return null;

  const [p, query = ''] = String(path).split('?');
  const envelope = { method, path: p, query, body: body ?? {}, time: Date.now(), nonce: rand() + rand() };

  const headers = { 'Content-Type': 'application/json', 'x-qp-d': deviceId() };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}/admin/api/_x`, {
    method: 'POST', headers, signal,
    body: JSON.stringify({ k: s.k, d: await sealWith(s.key, envelope) }),
  });

  // The key aged out mid-visit: agree a new one and send this call again.
  if (res.status === 401) {
    const out = await res.json().catch(() => ({}));
    if (/Session key/i.test(out.error || '')) {
      session = null;
      return send(base, { method, path, body, token, signal });
    }
    return { status: 401, data: out };
  }

  const out = await res.json().catch(() => ({}));
  if (!out.d) return { status: res.status, data: out };       // an error, sent plainly
  return { status: res.status, data: await openWith(s.key, out.d) };
}

/** For the Settings screen: is this visit actually encrypted? */
export const state = () => (unsupported ? 'off' : session ? 'on' : 'unknown');
