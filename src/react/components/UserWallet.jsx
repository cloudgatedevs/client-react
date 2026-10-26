import { WalletConnectButton, WalletConnectReturn } from './WalletConnect.jsx';
import { AboutEzarLink } from './AboutEzarLink.jsx';
import { EzarLogo } from './EzarLogo.jsx';
import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { useId, useState } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { Copy, RefreshCw } from 'lucide-react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { Field, Notice } from './forms.jsx';
import { useUserWallet, walletMoney, walletNumber } from './useUserWallet.js';

export function Digits({ label, value, onChange, secret = false, disabled, autoFocus = false }) {
  const id = useId();
  return <Field label={label} id={id} hint={secret ? '6 digits' : undefined}><OTPInput id={id} aria-label={label} value={value} onChange={onChange} maxLength={6}
    pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" type={secret ? 'password' : 'text'} autoComplete={secret ? 'off' : 'one-time-code'} disabled={disabled} autoFocus={autoFocus}
    containerClassName="flex w-full gap-2" render={({ slots }) => slots.map((slot, index) =>
      <span key={index} aria-hidden="true" className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg border text-lg font-semibold ${slot.isActive ? 'border-accent ring-2 ring-accent/20' : 'border-mist/20'}`}>
        {slot.char ? secret ? '\u2022' : slot.char : slot.hasFakeCaret ? '|' : ''}
      </span>)} /></Field>;
}

/** Embed inside the SDK providers anywhere in a signed-in app. All balance amounts are eZAR units. */
export function UserWallet({ environment }) {
  const available = useWalletAvailability(environment);
  const visible = useWalletAvailability(environment, true);
  const { client, identity } = useCloudgate();
  const { headerUser } = useAuthContext();
  const user = headerUser?.user;
  const env = environment ?? identity?.environment ?? client.config.environment;
  if (!user?.id || !visible) return null;
  if (!available) return <section className="card cg-heading-copy p-5"><h3 className="font-semibold">eZAR wallet · Coming soon</h3><p className="text-sm text-mist-muted">Production wallets are not available yet. You can try your wallet in Sandbox.</p></section>;
  return <WalletCard key={`${client.config.apiUrl}:${client.auth.tenancyName}:${user.id}:${env}`} client={client} environment={env} />;
}

function WalletCard({ client, environment }) {
  const { wallet, balance, error, balanceError, loading, refreshing, setError, refresh } = useUserWallet(client, environment);
  const [copied, setCopied] = useState(false);
  const number = walletNumber(wallet?.accountNumber), money = walletMoney;
  return <section className="card cg-wallet-card flex flex-col gap-4 p-6" aria-label="Your eZAR wallet">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><EzarLogo size={28} decorative />Your eZAR wallet</h2>
      <span className="badge">{/^prod/i.test(environment) ? 'Production' : 'Sandbox'}</span></div>
    {loading ? <div role="status" className="animate-pulse rounded-xl bg-mist/10 p-5">Loading wallet...</div> : error ? <Notice error>{error}</Notice> :
      wallet?.linked ? <>
        <div><p className="text-xs text-mist-muted">Voucher wallet account number</p><div className="mt-1 flex items-center gap-2"><span className="font-medium tabular-nums">{number}</span>
          <button type="button" className="btn-ghost" aria-label="Copy voucher wallet account number" onClick={async () => {
            try { await navigator.clipboard.writeText(wallet.accountNumber); setCopied(true); }
            catch { setError('Could not copy. Select the account number to copy it manually.'); }
          }}><Copy size={15} /></button>{copied && <span role="status" className="text-xs text-mist-muted">Copied</span>}</div></div>
        <p className="text-sm text-mist-muted">{wallet.phoneNumber} &middot; XCAP Voucher</p>
        {balanceError ? <Notice error>{balanceError}</Notice> : <div aria-live="polite"><p className="text-xs text-mist-muted">Available balance</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{balance ? `${money(balance.available)} eZAR` : 'Loading balance...'}</p>
          {balance?.reserved > 0 && <p className="mt-1 text-xs text-mist-muted">{money(balance.reserved)} eZAR reserved for pending transactions</p>}
          {balance?.pending > 0 && <p className="mt-1 text-xs text-mist-muted">{money(balance.pending)} eZAR awaiting confirmation</p>}
          {balance?.restricted > 0 && <p className="mt-1 text-xs text-mist-muted">{money(balance.restricted)} eZAR currently restricted</p>}
        </div>}
      </> : <><p className="text-sm text-mist-muted">Connect your eZAR wallet with your mobile number and PIN to see your balance.</p>
        <div className="flex flex-wrap items-center gap-2"><WalletConnectButton client={client} environment={environment} onConnected={refresh} /><AboutEzarLink /></div></>}
    {(wallet?.linked || error) && <button type="button" className="btn-ghost btn-sm w-fit" disabled={loading || refreshing} onClick={refresh}><RefreshCw size={15} />Refresh wallet</button>}
    {wallet?.linked && <a className="btn-ghost btn-sm w-fit" href="/account/wallet">Open wallet</a>}
    {wallet?.linked && <AboutEzarLink />}
    <WalletConnectReturn client={client} environment={environment} onConnected={refresh} />
  </section>;
}

