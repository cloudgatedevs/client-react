import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Check, Copy, History, Plus, QrCode, RefreshCw, Ticket, Unplug } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { Notice } from './forms.jsx';
import { WalletConnectButton, WalletConnectReturn } from './WalletConnect.jsx';
import { AboutEzarLink } from './AboutEzarLink.jsx';
import { EzarLogo } from './EzarLogo.jsx';
import { walletNumber } from './useUserWallet.js';
import { DisconnectWallet, PayInvoice, ReceiveWallet, SendWallet, TopupWallet } from './WalletDialogs.jsx';

export const valueText = value => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);
export const walletDate = value => {
  if (!value) return '—';
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const operationLabels = ['Awaiting PIN', 'Processing', 'Processing', 'Completed', 'Failed', 'Needs review', 'Cancelled'];
export function WalletBadge({ status, children }) { return <span className={`cg-w-status is-${status}`}>{children}</span>; }
export function CopyWalletNumber({ number }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (copied) { const timer = setTimeout(() => setCopied(false), 2500); return () => clearTimeout(timer); } }, [copied]);
  return <><button type="button" className="cg-w-icon" title={copied ? 'Copied' : 'Copy account number'} aria-label={copied ? 'Account number copied' : 'Copy voucher wallet account number'} onClick={async () => {
    try { await navigator.clipboard.writeText(number); setCopied(true); setError(''); } catch { setError('Select the account number to copy it.'); }
  }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button><span className="sr-only" role="status">{copied ? 'Account number copied' : error}</span></>;
}
function useWalletRead(client, method, environment, enabled, revision, skip = 0, take = 10, accountNumber) {
  const [state, setState] = useState({ data: null, busy: true, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    setState(old => ({ ...old, busy: true, error: '' }));
    Promise.resolve().then(() => client.wallet[method]({ environment, skip, take }, { signal: abort.signal }))
      .then(data => { if (accountNumber && data.accountNumber !== accountNumber) throw new Error('The response does not match your linked wallet. Please refresh.'); if (!abort.signal.aborted) setState({ data, busy: false, error: '' }); })
      .catch(error => { if (!abort.signal.aborted) setState({ data: null, busy: false, error: error.message }); });
    return () => abort.abort();
  }, [client, method, environment, enabled, revision, skip, take, accountNumber]);
  return state;
}
function useDraft(key) {
  const [value, setValue] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } });
  const update = next => { setValue(next); try { if (next) sessionStorage.setItem(key, JSON.stringify(next)); else sessionStorage.removeItem(key); } catch { /* In-memory recovery remains available. */ } };
  return [value, update];
}
function Pager({ page, size, count, busy, setPage }) {
  if (!count) return null;
  return <div className="cg-w-pager"><span>{page * size + 1}–{Math.min((page + 1) * size, count)} of {count}</span><div>
    <button type="button" className="btn-ghost btn-sm" disabled={!page || busy} onClick={() => setPage(page - 1)}>Previous</button>
    <button type="button" className="btn-ghost btn-sm" disabled={(page + 1) * size >= count || busy} onClick={() => setPage(page + 1)}>Next</button></div></div>;
}
function Skeleton({ rows = 3 }) { return <div className="cg-w-skeleton" role="status" aria-label="Loading wallet records">{Array.from({ length: rows }, (_, i) => <span className="cg-account-skeleton" key={i} />)}</div>; }

export function WalletWorkspace() {
  const available = useWalletAvailability();
  const visible = useWalletAvailability(undefined, true);
  const { client, identity } = useCloudgate(), { headerUser } = useAuthContext();
  const [connectionRevision, setConnectionRevision] = useState(0);
  const environment = identity?.environment ?? client.config.environment;
  if (!headerUser?.user?.id) return null;
  if (!available) return <section className="card cg-heading-copy p-6"><h1 className="text-xl font-semibold">{visible ? 'Coming soon' : 'Wallet unavailable'}</h1><p className="text-sm text-mist-muted">{visible ? 'Production eZAR wallets are not available yet. You can try your wallet in Sandbox.' : 'User wallets are not enabled for this project, country and environment.'}</p></section>;
  const scope = `${client.config.apiUrl}:${client.auth.tenancyName}:${headerUser.user.id}:${environment}`;
  return <Workspace key={`${scope}:${connectionRevision}`} client={client} environment={environment} scope={scope} onDisconnected={() => setConnectionRevision(value => value + 1)} />;
}
function Workspace({ client, environment, scope, onDisconnected }) {
  const [revision, setRevision] = useState(0), [modal, setModal] = useState(null), [session, setSession] = useState(null);
  // `/account/wallet?pay=<paymentId>` opens the pay-invoice dialog for one of the tenant's invoices.
  const [payInvoiceId, setPayInvoiceId] = useState(() => { const value = Number(new URLSearchParams(window.location.search).get('pay')); return Number.isSafeInteger(value) && value > 0 ? value : null; });
  const [tab, setTab] = useState('holdings'), [voucherPage, setVoucherPage] = useState(0), [historyPage, setHistoryPage] = useState(0);
  const status = useWalletRead(client, 'get', environment, true, revision);
  const wallet = status.data, linked = !!wallet?.linked;
  const balance = useWalletRead(client, 'balance', environment, linked, revision, 0, 10, wallet?.accountNumber);
  const vouchers = useWalletRead(client, 'holdings', environment, linked && tab === 'holdings', revision, voucherPage * 6, 6, wallet?.accountNumber);
  const history = useWalletRead(client, 'transactions', environment, linked && tab === 'history', revision, historyPage * 10, 10, wallet?.accountNumber);
  const [draft, setDraft] = useDraft(`cg-wallet-send:${scope}`), [topup, setTopup] = useDraft(`cg-wallet-topup:${scope}`);
  const refresh = () => setRevision(v => v + 1);
  useEffect(() => { const focus = () => refresh(); window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus); }, []);
  const matched = source => source.data?.accountNumber === wallet?.accountNumber ? source.data : null;
  const funds = matched(balance), holdings = matched(vouchers), transactions = matched(history);
  const owned = funds ? funds.available + funds.reserved + funds.restricted : null;
  const settling = funds?.pending > 0 || funds?.reserved > 0 || transactions?.items.some(item => [1, 2].includes(item.status));
  useEffect(() => { if (settling) { const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 10000); return () => clearInterval(timer); } }, [settling]);
  const close = () => { setModal(null); refresh(); };
  const openSend = operationId => {
    if (operationId) setDraft({ operationId, attempted: true });
    setModal('send');
  };
  return <div className="cg-w-workspace">
    <header className="cg-w-heading"><div><p className="cg-account-eyebrow">YOUR ACCOUNT</p><h1>My wallet</h1><p>Your money. Ready for what’s next.</p></div>
      <button type="button" className="btn-ghost" disabled={status.busy || balance.busy && linked} onClick={refresh}><RefreshCw size={15} className={status.busy ? 'animate-spin' : ''} />Refresh wallet</button></header>
    <Notice error>{status.error}</Notice>
    {!wallet && status.busy ? <Skeleton /> : !linked && !status.error ? <section className="card cg-w-activate"><EzarLogo size={48} /><div className="cg-heading-copy"><h2>Your eZAR wallet starts here</h2><p>Connect your voucher wallet or create one to pay for goods using your eZAR balance.</p></div><div className="cg-w-connect-actions"><WalletConnectButton client={client} environment={environment} onConnected={refresh} /><AboutEzarLink /></div></section> : linked && <>
      <div className="cg-w-overview"><section className="cg-w-balance" aria-label="Wallet balance">
        <div className="cg-w-balance-heading"><span><EzarLogo size={28} decorative />eZAR wallet</span><WalletBadge status={wallet.production ? 'neutral' : 'available'}>{wallet.production ? 'Production' : 'Sandbox'}</WalletBadge></div>
        <span className="cg-w-label">Wallet balance</span>
        {funds ? <div className="cg-w-amount">{valueText(owned)} <span>eZAR</span></div> : balance.error ? <Notice error>{balance.error}</Notice> : <span className="cg-account-skeleton cg-w-amount-skeleton" aria-label="Loading balance" />}
        <p className="cg-w-available">{funds ? `${valueText(funds.available)} eZAR available to send` : 'Checking your available funds…'}{balance.busy && funds && <RefreshCw size={12} className="animate-spin" aria-label="Refreshing balance" />}</p>
        <div className="cg-w-actions"><button type="button" onClick={() => openSend()}><ArrowUpRight size={19} /><span>{draft ? 'Resume send' : 'Send'}</span></button><button type="button" onClick={() => setModal('receive')}><ArrowDownLeft size={19} /><span>Receive</span></button><button type="button" onClick={() => setModal('topup')}><Plus size={19} /><span>Top up</span></button></div>
        {funds && (funds.reserved > 0 || funds.pending > 0 || funds.restricted > 0) && <div className="cg-w-balance-breakdown">
          {funds.reserved > 0 && <span>{valueText(funds.reserved)} reserved</span>}{funds.pending > 0 && <span>{valueText(funds.pending)} awaiting confirmation</span>}{funds.restricted > 0 && <span>{valueText(funds.restricted)} restricted</span>}
          <small>Reserved funds remain in your wallet until the transfer completes. Pending vouchers are not yet included in your balance.</small></div>}
      </section><section className="card cg-w-account" aria-label="Receiving account"><div className="cg-w-section-heading"><span className="cg-w-symbol"><QrCode size={20} /></span><div><h2>Made to receive</h2><p>One account for every payment.</p></div></div>
        <div><span className="cg-w-label">Voucher wallet account number</span><div className="cg-w-account-number"><strong>{walletNumber(wallet.accountNumber)}</strong><CopyWalletNumber number={wallet.accountNumber} /><button type="button" className="cg-w-icon" aria-label="Show receive QR code" onClick={() => setModal('receive')}><QrCode size={16} /></button></div></div>
        <div className="cg-w-account-bottom"><div><span className="cg-w-label">Linked mobile</span><span>{wallet.phoneNumber}</span></div><WalletBadge status="neutral">XCAP Voucher</WalletBadge></div>
        <p className="cg-w-hint">Share your account number or QR code to receive eZAR from another voucher wallet account.</p>
        <div className="cg-w-account-actions"><AboutEzarLink /><button type="button" className="btn-ghost btn-sm w-fit" onClick={() => setModal('disconnect')}><Unplug size={14} />Disconnect wallet</button></div></section></div>
      {topup && <div className="cg-w-pending"><Plus size={18} /><span>A top-up is ready to continue. Open checkout or check its payment status.</span><button className="btn-ghost btn-sm" onClick={() => setModal('topup')}>View top-up<ArrowRight size={14} /></button></div>}
      <section className="card cg-w-records"><div className="cg-w-records-heading"><div role="tablist" aria-label="Wallet records" onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'holdings' : event.key === 'End' ? 'history' : tab === 'holdings' ? 'history' : 'holdings'; setTab(next); event.currentTarget.querySelector(`[id="wallet-tab-${next}"]`)?.focus(); } }}>
        <button role="tab" id="wallet-tab-holdings" aria-controls="wallet-panel-holdings" aria-selected={tab === 'holdings'} tabIndex={tab === 'holdings' ? 0 : -1} onClick={() => setTab('holdings')}><Ticket size={16} />Your vouchers</button>
        <button role="tab" id="wallet-tab-history" aria-controls="wallet-panel-history" aria-selected={tab === 'history'} tabIndex={tab === 'history' ? 0 : -1} onClick={() => setTab('history')}><History size={16} />Transaction history</button></div></div>
        {tab === 'holdings' ? <div role="tabpanel" id="wallet-panel-holdings" aria-labelledby="wallet-tab-holdings" aria-busy={vouchers.busy}>
          <div className="cg-w-panel-heading"><h2>Value in your wallet</h2><p>Vouchers with a remaining value. Used vouchers appear in your history.</p></div>
          <Notice error>{vouchers.error}</Notice>{!holdings && vouchers.busy ? <Skeleton /> : holdings?.items.length ? <div className="cg-w-vouchers">{holdings.items.map(item => <article className="cg-w-voucher" key={item.id}>
            <div><Ticket size={18} /><WalletBadge status={item.status}>{({ available: 'Available', reserved: 'Reserved', pending: 'Pending', restricted: 'Restricted' })[item.status]}</WalletBadge></div><strong>{valueText(item.amount)} <small>eZAR</small></strong><p>{walletDate(item.createdAtUtc)}</p>{item.expiresAtUtc && <p>Expires {walletDate(item.expiresAtUtc)}</p>}</article>)}</div> : !vouchers.error && <div className="cg-w-empty"><Ticket size={28} /><div className="cg-heading-copy"><h3>No vouchers with value yet</h3><p>Receive eZAR or top up to add value to your wallet.</p></div><button className="btn-ghost" onClick={() => setModal('topup')}>Top up wallet</button></div>}
          <Pager page={voucherPage} size={6} count={holdings?.totalCount} busy={vouchers.busy} setPage={setVoucherPage} /></div> :
          <div role="tabpanel" id="wallet-panel-history" aria-labelledby="wallet-tab-history" aria-busy={history.busy}><div className="cg-w-panel-heading"><h2>Your latest activity</h2><p>Incoming payments, outgoing transfers and their current status.</p></div>
            <Notice error>{history.error}</Notice>{!transactions && history.busy ? <Skeleton /> : transactions?.items.length ? <div className="cg-w-table-wrap"><table className="cg-w-table"><thead><tr><th>Transaction</th><th className="cg-w-date-column">Date</th><th>Status</th><th>Amount</th></tr></thead><tbody>{transactions.items.map(item => {
              const incoming = item.direction === 'in', label = item.kind === 0 ? item.status === 3 ? 'Wallet funded' : 'Wallet funding' : item.kind === 8 ? incoming ? 'Mobile voucher received' : 'Mobile voucher sent' : item.kind === 3 ? 'Withdrawal' : item.kind === 6 ? incoming ? 'Voucher received' : 'Voucher sent' : incoming ? item.status === 3 ? 'Payment received' : 'Incoming payment' : item.kind === 2 || item.kind === 4 ? 'Invoice payment' : item.status === 3 ? 'Transfer sent' : 'Wallet transfer';
              return <tr key={item.id}><td><div className="cg-w-transaction"><span className={`cg-w-direction ${incoming ? 'is-in' : ''}`}>{incoming ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div><strong>{label}</strong><small>{item.counterpartyAccountNumber && item.counterpartyAccountNumber !== wallet.accountNumber ? `${incoming ? 'From' : 'To'} ${walletNumber(item.counterpartyAccountNumber)}` : 'eZAR wallet'}<span className="cg-w-mobile-date">{walletDate(item.createdAtUtc)}</span></small>{item.canAuthorize && item.kind === 1 && <button className="cg-w-link" onClick={() => openSend(item.id)}>Review transfer<ArrowRight size={12} /></button>}{item.canAuthorize && item.kind !== 1 && <small>Open the original payment to review this transaction.</small>}</div></div></td><td className="cg-w-date-column">{walletDate(item.createdAtUtc)}</td><td><WalletBadge status={item.status === 3 ? 'available' : [4, 5].includes(item.status) ? 'restricted' : item.status === 6 ? 'neutral' : 'pending'}>{operationLabels[item.status]}</WalletBadge></td><td className="cg-w-transaction-amount"><strong>{incoming ? '+' : '−'}{valueText(item.amount)} <small>eZAR</small></strong>{item.fee > 0 && <small>Fee {valueText(item.fee)} eZAR</small>}</td></tr>;
            })}</tbody></table></div> : !history.error && <div className="cg-w-empty"><History size={28} /><div className="cg-heading-copy"><h3>Your story starts here</h3><p>Your wallet transactions will appear here as you send and receive eZAR.</p></div></div>}
            <Pager page={historyPage} size={10} count={transactions?.totalCount} busy={history.busy} setPage={setHistoryPage} /></div>}
      </section>
    </>}
    <WalletConnectReturn client={client} environment={environment} onConnected={refresh} />
    {modal === 'receive' && linked && <ReceiveWallet wallet={wallet} onClose={close} />}
    {modal === 'send' && linked && <SendWallet client={client} environment={environment} wallet={wallet} session={session} setSession={setSession} draft={draft} setDraft={setDraft} onChanged={refresh} onClose={close} />}
    {payInvoiceId && linked && <PayInvoice client={client} environment={environment} wallet={wallet} session={session} setSession={setSession} paymentId={payInvoiceId} onChanged={refresh}
      onClose={() => { setPayInvoiceId(null); const url = new URL(window.location.href); url.searchParams.delete('pay'); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash); }} />}
    {modal === 'topup' && linked && <TopupWallet client={client} environment={environment} wallet={wallet} draft={topup} setDraft={setTopup} onChanged={refresh} onClose={close} />}
    {modal === 'disconnect' && linked && <DisconnectWallet client={client} environment={environment} wallet={wallet} onClose={() => setModal(null)} onDisconnected={() => {
      setSession(null); setDraft(null); setTopup(null); onDisconnected();
    }} />}
  </div>;
}
