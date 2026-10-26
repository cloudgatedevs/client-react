import { useEffect, useRef } from 'react';
import { SDK_PAYMENT_ROUTES } from '../routing.js';
import { useCloudgate } from '../context.jsx';
import { ExternalLink, RefreshCw, Wallet, CheckCircle2, CircleAlert } from 'lucide-react';

import { PageHead, useAsync, Spinner, ErrorNote } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';
import { BackofficeLink as Link } from '../components/BackofficeLink.jsx';
import { PaymentWalletDetails } from './PaymentDetails.jsx';
import { AboutEzarLink } from '../components/AboutEzarLink.jsx';

export function Payments() {
  const { client } = useCloudgate();
  const paymentsApi = client.payments;
  const wallet = useAsync(() => paymentsApi.status(), [client]);
  const base = client.config.idpBaseUrl;
  const status = wallet.data;
  const reloadWallet = useRef(wallet.reload);
  reloadWallet.current = wallet.reload;
  useEffect(() => {
    let timer;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      timer = setTimeout(() => reloadWallet.current(), 200);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return (
    <div className="space-y-6">
      <PageHead title="Payments" subtitle="Manage payment readiness through your tenant’s Cloudgate Wallet.">
        <Link className="btn-ghost" to={SDK_PAYMENT_ROUTES.history}>All payments</Link>
        <Link className="btn-ghost" to={SDK_PAYMENT_ROUTES.test}>Test payment</Link>
        <button className="btn-ghost" disabled={wallet.loading} onClick={wallet.reload}>
          <RefreshCw size={16} />
          Refresh
        </button>
        {base && (
          <a href={`${base}/wallet`} target="_blank" rel="noreferrer" className="btn-primary">
            <ExternalLink size={16} />
            Open Wallet
          </a>
        )}
      </PageHead>
      <ErrorNote error={wallet.error} />
      <PaymentWalletDetails status={status} />
      {wallet.loading ? (
        <Spinner />
      ) : (
        status && (
          <section className="card space-y-6 p-6">
            <div className="flex items-start gap-4">
              <span
                className={`rounded-xl p-3 ${status.ready ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}
              >
                {status.ready ? <CheckCircle2 size={25} /> : <CircleAlert size={25} />}
              </span>
              <div className="cg-heading-copy">
                <h2 className="text-lg font-semibold">
                  {status.ready ? 'Ready to accept payments' : status.comingSoon ? 'Coming soon' : 'Wallet setup required'}
                </h2>
                <p className="mt-1 text-sm text-mist-muted">
                  {status.reason ||
                    (status.ready
                      ? 'Your payment provider is connected.'
                      : 'Complete your wallet setup in Cloudgate to enable payments.')}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {[
                ['Environment', status.production ? 'Production' : 'Sandbox'],
                ['Provider', status.provider === 'None' ? 'Not connected' : status.provider],
                ['Onboarding', status.status],
                ['Charges', status.chargesEnabled ? 'Enabled' : 'Disabled'],
                ['Payouts', status.payoutsEnabled ? 'Enabled' : 'Disabled'],
                ['Currency', status.currency || 'Not configured'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="label">{label}</dt>
                  <dd className="mt-1 text-sm font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      )}
      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Wallet size={20} />
          Payment setup
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-mist-muted">
          <li>Choose Connect wallet in Cloudgate, then verify your mobile number and enter your wallet PIN.</li>
          <li>Receive payments using your account number or a payment invoice.</li>
          <li>Complete withdrawal setup in Cloudgate and follow the individual or business identity verification steps.</li>
        </ol>
        <p className="text-sm text-mist-muted">
          View transactions in All payments or try the sandbox in Test payment. Payment-provider credentials and payouts are managed in the Cloudgate hub.
        </p>
        <AboutEzarLink />
      </section>
      {status && <Notice>
        {status.production
          ? 'This installation uses the production wallet.'
          : 'This installation uses the sandbox wallet for testing.'}
      </Notice>}
    </div>
  );
}
