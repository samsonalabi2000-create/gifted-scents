import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock3, Ban } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Button, Spinner } from '@/components/ui/index.jsx';
import { useCart } from '@/store/cartStore.js';
import { formatNaira } from '@/utils/money.js';
import { useSettings } from '@/hooks/useSettings.js';
import { waLink, WA } from '@/utils/whatsapp.js';
import { track } from '@/utils/analytics.js';

/** Paystack redirects here. We NEVER trust the URL: the server verifies the transaction with Paystack. */
export default function CheckoutCallback() {
  const [params] = useSearchParams(); const ref = params.get('reference') || params.get('trxref');
  const [state, setState] = useState({ phase: 'verifying' }); const tries = useRef(0); const { load } = useCart(); const { s } = useSettings();

  useEffect(() => {
    if (!ref) { setState({ phase: 'missing' }); return; }
    let stop = false;
    const run = async () => {
      try {
        const r = await api.verify(ref);
        if (stop) return;
        if (r.status === 'SUCCESS') { setState({ phase: 'success', order: r.order, token: r.publicToken }); load(); track('purchase', { transaction_id: r.order.orderNumber, value: r.order.totalKobo / 100, currency: 'NGN' }); }
        else if (r.status === 'FAILED') setState({ phase: 'failed', order: r.order });
        else if (r.status === 'ABANDONED') setState({ phase: 'cancelled', order: r.order });
        else if (tries.current++ < 6) { setState({ phase: 'pending', order: r.order }); setTimeout(run, 4000); }
        else setState({ phase: 'pending', order: r.order, final: true });
      } catch (e) { if (!stop) setState({ phase: 'error', message: e.message }); }
    };
    run(); return () => { stop = true; };
  }, [ref, load]);

  const { phase, order } = state; const wa = waLink(s['support.whatsapp'], WA.order(order?.orderNumber));
  const view = {
    verifying: [Clock3, 'Confirming your payment…', 'Please do not close this page.'],
    pending: [Clock3, 'Payment pending', state.final ? 'We have not received confirmation yet. If you were debited, your order will update automatically. You can also message us.' : 'Waiting for confirmation from your bank…'],
    success: [CheckCircle2, 'Thank you! Your order is confirmed', `Order ${order?.orderNumber} · ${order ? formatNaira(order.totalKobo) : ''}. A confirmation email is on its way.`],
    failed: [XCircle, 'Payment failed', 'Your payment was not completed and you have not been charged for this attempt.'],
    cancelled: [Ban, 'Payment cancelled', 'You cancelled the payment. Your cart is still saved.'],
    error: [XCircle, 'We could not confirm your payment', state.message],
    missing: [XCircle, 'Nothing to verify', 'This link is missing a payment reference.'],
  }[phase];
  const [Icon, title, text] = view;
  return (
    <div className="container-x grid min-h-[60dvh] place-items-center py-14">
      <Seo title="Order status | Gifted Scents" path="/checkout/callback" noindex />
      <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-8 text-center" role="status" aria-live="polite">
        {phase === 'verifying' ? <Spinner className="mx-auto size-8 text-accent" /> : <Icon className={`mx-auto size-12 ${phase === 'success' ? 'text-[var(--success)]' : phase === 'pending' ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`} aria-hidden />}
        <h1 className="mt-4 text-3xl">{title}</h1><p className="mt-2 text-muted">{text}</p>
        {phase === 'success' && order && (
          <ul className="mt-6 divide-y divide-line text-left text-sm">{order.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.productName} ({i.variantLabel}) × {i.quantity}</span><span className="tabular-nums">{formatNaira(i.lineTotalKobo)}</span></li>)}</ul>)}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {phase === 'success' && <Button as={Link} to="/shop">Keep exploring</Button>}
          {(phase === 'failed' || phase === 'cancelled') && <Button as={Link} to="/checkout">Try again</Button>}
          {(phase === 'pending' || phase === 'error' || phase === 'failed') && wa && <Button as="a" href={wa} target="_blank" rel="noopener noreferrer" variant="outline">Message us on WhatsApp</Button>}
        </div>
      </div>
    </div>
  );
}
