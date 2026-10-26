import { useState } from 'react';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from '../auth/index.js';
import { useWalletAvailability } from '../settings/useWalletAvailability.js';
import { useUserWallet } from './useUserWallet.js';
import { WalletConnectButton } from './WalletConnect.jsx';
import { PayInvoice } from './PayInvoice.jsx';
import { EzarLogo } from './EzarLogo.jsx';
import { Modal, Notice } from './forms.jsx';

/** The app's trusted backend supplies an existing invoice paymentId for the user's order. */
export function PayWithEzarButton({ paymentId, environment, onPaid, onClose, disabled = false, className = 'btn-primary', children = 'Pay with eZAR' }) {
  const { client, identity } = useCloudgate(), { headerUser } = useAuthContext();
  const env = environment ?? identity?.environment ?? client.config.environment;
  const available = useWalletAvailability(env);
  const userId = headerUser?.user?.id;
  const scope = `${client.config.apiUrl}:${client.auth.tenancyName}:${userId}:${/^prod/i.test(env) ? 'prod' : 'sbx'}`;
  return <PaymentButton key={`${scope}:${paymentId}`} {...{ client, environment: env, scope, paymentId, onPaid, onClose, className, children }}
    disabled={disabled || !userId || !available || !Number.isSafeInteger(paymentId) || paymentId < 1}
    reason={!userId ? 'Sign in to pay with eZAR' : !available ? 'eZAR wallets are unavailable in this environment' : undefined} />;
}

function PaymentButton({ client, environment, scope, paymentId, onPaid, onClose, disabled, reason, className, children }) {
  const [open, setOpen] = useState(false), [session, setSession] = useState(null);
  const { wallet, error, loading, refresh, setWallet } = useUserWallet(client, environment, open && !disabled);
  const close = () => { setOpen(false); onClose?.(); };
  return <>
    <button type="button" className={className} disabled={disabled} title={reason} onClick={() => { setWallet(null); setOpen(true); }}><EzarLogo size={20} decorative />{children}</button>
    {open && !disabled && (wallet?.linked ? <PayInvoice client={client} environment={environment} wallet={wallet} session={session} setSession={setSession}
      paymentId={paymentId} recoveryKey={`cg-wallet-invoice:${scope}:${wallet.accountNumber}:${paymentId}`} onPaid={onPaid} onClose={close} /> :
      <Modal open title="Pay with eZAR" description="Connect your voucher wallet to pay for this order." onClose={close} footer={<button type="button" className="btn-ghost" onClick={close}>Close</button>}>
        <div className="cg-w-form">{loading ? <p role="status">Loading your wallet…</p> : error ? <><Notice error>{error}</Notice><button type="button" className="btn-ghost w-fit" onClick={refresh}>Try again</button></> :
          <><p className="cg-w-hint">Connect your wallet with your mobile number and six-digit PIN. Your order will be ready to pay here.</p><WalletConnectButton client={client} environment={environment} onConnected={refresh} /></>}
        </div>
      </Modal>)}
  </>;
}
