import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';

export function CloudgateAccountLink() {
  const { client } = useCloudgate();
  const { headerUser } = useAuthContext();
  const userId = headerUser?.user?.id;
  const key = `cloudgate-link:${client.config.apiUrl}:${client.auth.tenancyName}:${userId}`;
  const [link, setLink] = useState(null), [pending, setPending] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [link?.userId, link?.photoUrl]);
  const popup = useRef(null), generation = useRef(0);
  const remember = useCallback(value => {
    try { value ? sessionStorage.setItem(key, JSON.stringify(value)) : sessionStorage.removeItem(key); } catch { /* Popup flow still works without storage. */ }
    setPending(value);
  }, [key]);
  const refresh = useCallback(async () => {
    const value = await client.accountLink.get();
    setLink(value);
    if (value.linked) remember(null);
    return value;
  }, [client, remember]);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setLink(null); setError(''); setPending(null);
    client.accountLink.get({ signal: abort.signal }).then(value => {
      if (!active) return;
      setLink(value);
      try {
        const saved = JSON.parse(sessionStorage.getItem(key));
        if (!value.linked && saved?.code && Date.parse(saved.expiresAt) > Date.now()) setPending(saved);
        else sessionStorage.removeItem(key);
      } catch { /* No saved redirect continuation. */ }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; generation.current++; abort.abort(); };
  }, [client, key]);

  useEffect(() => {
    if (!pending) return;
    let active = true, timer;
    const abort = new AbortController();
    const poll = async () => {
      try {
        if (Date.parse(pending.expiresAt) <= Date.now()) throw new Error('This request expired. Start linking again.');
        const value = await client.accountLink.complete({ code: pending.code }, { signal: abort.signal });
        if (!active) return;
        if (value.pending) { timer = setTimeout(poll, 1500); return; }
        setLink(value); remember(null); setError(''); popup.current?.close();
      } catch (err) {
        if (!active) return;
        // A response can be lost after a successful completion; the stored link is authoritative.
        try {
          const value = await client.accountLink.get({ signal: abort.signal });
          if (!active) return;
          if (value.linked) { setLink(value); remember(null); return; }
        } catch { /* Display the original completion error. */ }
        if (!active) return;
        setError(err.message);
        if (err.code === 'network' || err.code === 'timeout') timer = setTimeout(poll, 5000);
        else remember(null);
      }
    };
    poll();
    return () => { active = false; clearTimeout(timer); abort.abort(); };
  }, [client, pending, remember]);

  const start = async () => {
    const current = ++generation.current;
    // Open during the user gesture, before the server request. No cross-window token messaging is used.
    popup.current = window.open('about:blank', '_blank', 'popup,width=560,height=760');
    if (popup.current) popup.current.opener = null;
    setBusy(true); setError('');
    try {
      const returnUrl = new URL(window.location.href); returnUrl.hash = '';
      const ticket = await client.accountLink.start({ returnUrl: returnUrl.href });
      if (current !== generation.current) { popup.current?.close(); return; }
      remember(ticket);
      if (popup.current) {
        const authorizationUrl = new URL(ticket.authorizationUrl);
        const fragment = new URLSearchParams(authorizationUrl.hash.slice(1));
        fragment.set('popup', '1');
        authorizationUrl.hash = fragment.toString();
        popup.current.location.replace(authorizationUrl.href);
      }
      else window.location.assign(ticket.authorizationUrl);
    } catch (err) { popup.current?.close(); if (current === generation.current) setError(err.message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const detach = async () => {
    generation.current++; setBusy(true); setError('');
    // This also revokes pending approvals, including requests opened in another tab.
    remember(null); popup.current?.close();
    try { await client.accountLink.detach(); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <section className="card flex flex-col gap-4 p-6" aria-labelledby="cloudgate-link-title">
    <div><h2 id="cloudgate-link-title" className="font-semibold">Cloudgate account</h2>
      <p className="mt-1 text-sm text-mist-muted">Connect your Cloudgate account to this IdP profile. Your link is saved for future sign-ins. Linking is optional; back-office access uses your app role’s permissions.</p></div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
    {link?.linked ? <>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-sm font-semibold text-accent">
          {link.photoUrl && !imageFailed ? <img src={link.photoUrl} alt={`Profile picture of ${link.displayName || 'linked Cloudgate account'}`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
            : <span aria-hidden="true">{(link.displayName || link.email || 'Cloudgate').trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase()}</span>}
        </span>
        <div className="min-w-0"><p className="break-words font-medium">{link.displayName || 'Linked Cloudgate account'}</p><p className="break-all text-sm text-mist-muted">{link.email}</p></div>
      </div>
      {!link.available && <p className="text-sm">This account is currently unavailable. You can detach it and link an active account.</p>}
      <button className="btn-ghost self-start" disabled={busy} onClick={detach}>{busy ? 'Detaching…' : 'Detach Cloudgate account'}</button>
    </> : pending ? <>
      <p role="status" className="text-sm">Waiting for you to sign in and approve the link in Cloudgate.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" disabled aria-busy="true">
          <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Linking…
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={detach}>Cancel linking</button>
      </div>
    </> : link ? <button className="btn-primary self-start" disabled={busy} onClick={start}>{busy ? 'Opening Cloudgate…' : 'Link Cloudgate account'}</button>
      : error ? <button className="btn-ghost self-start" onClick={() => { setError(''); refresh().catch(err => setError(err.message)); }}>Try again</button>
      : <p role="status" className="text-sm text-mist-muted">Loading account link…</p>}
  </section>;
}
