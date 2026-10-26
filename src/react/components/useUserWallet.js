import { useEffect, useState } from 'react';

// Each consumer lives under a user/environment key. Never retain a balance across identities.
export function useUserWallet(client, environment, enabled = true) {
  const [wallet, setWallet] = useState(null), [balance, setBalance] = useState(null);
  const [error, setError] = useState(''), [balanceError, setBalanceError] = useState('');
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    setLoading(true); setError(''); setBalance(null);
    Promise.resolve().then(() => client.wallet.get({ environment }, { signal: abort.signal }))
      .then(value => { if (!abort.signal.aborted) setWallet(value); })
      .catch(e => { if (!abort.signal.aborted) { setWallet(null); setError(e.message); } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [client, environment, revision, enabled]);
  useEffect(() => {
    if (!enabled) return;
    if (!wallet?.linked) { setBalance(null); return; }
    const abort = new AbortController();
    setRefreshing(true); setBalanceError('');
    Promise.resolve().then(() => client.wallet.balance({ environment }, { signal: abort.signal })).then(value => {
      if (value.accountNumber !== wallet.accountNumber) throw new Error('Refresh your linked wallet before viewing the balance.');
      if (!abort.signal.aborted) setBalance(value);
    }).catch(e => { if (!abort.signal.aborted) { setBalance(null); setBalanceError(e.message); } })
      .finally(() => { if (!abort.signal.aborted) setRefreshing(false); });
    return () => abort.abort();
  }, [client, environment, wallet, enabled]);
  return { wallet, balance, error, balanceError, loading, refreshing, setWallet, setError, refresh: () => setRevision(v => v + 1) };
}

export const walletNumber = value => value?.replace(/(.{4})(?=.)/g, '$1 ');
export const walletMoney = value => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
