import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Page, Loading, ErrorBox } from '../../components/ui.jsx';
import { Period, inr, num } from '../../components/hq/kit.jsx';

/*
 * PROFIT & LOSS (admin revamp, 2026-10-05) — the same statement GaadiPe's
 * Profitability page shows, in QuizPe's terms: what families paid, down
 * through GST, Razorpay and WhatsApp to what sales left, then ads, other
 * expenses and fixed costs, to the profit or loss. GST paid on costs is
 * claimed back as input credit, so it is left out.
 */
export default function Money() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [ads, setAds] = useState('');
  const [fixed, setFixed] = useState('');
  const load = useCallback(() => api.hq.pnl(days).then((x) => { setD(x); setAds(String(x.ads_daily)); setFixed(String(x.fixed_monthly)); setError(null); }).catch(setError), [days]);
  useEffect(() => { load(); }, [load]);
  const save = async () => { await api.hq.savePnl({ ads_daily: ads, fixed_monthly: fixed }); load(); };

  const Row = ({ label, v, note, minus, strong }) => (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-line pt-2 font-bold text-ink' : 'text-ink'}`}>
      <span className="text-sm">{label}{note && <span className="ml-1 text-[11px] font-normal text-muted">{note}</span>}</span>
      <span className="tabular-nums text-sm">{minus && v > 0 ? '− ' : ''}{inr(v, 2)}</span>
    </div>
  );
  return (
    <Page title="Profit & loss" subtitle="QuizPe as a business, for the period" actions={<Period value={days} onChange={setDays} options={[7, 30, 90]} />}>
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="card p-5">
            <Row label="Families paid" v={d.paid} note={`${num(d.invoices)} invoice(s)`} />
            <Row label="GST you pay the government" v={d.gst} minus />
            <Row label="Your revenue" v={d.revenue} strong />
            <Row label="Razorpay fee" v={d.gateway} minus note={d.gateway_estimated ? `${d.gateway_estimated} estimated at ${d.fee_percent}%` : ''} />
            <Row label="WhatsApp templates" v={d.whatsapp} minus note={`${num(d.templates.marketing)} marketing × ₹${d.templates.marketing_rate} + ${num(d.templates.utility)} utility × ₹${d.templates.utility_rate}`} />
            <Row label="Left from sales" v={d.from_sales} strong />
            <Row label="Meta ads — QuizPe" v={d.ads} minus note={d.ads_source === 'expenses' ? 'from Expenses' : `assumed ₹${d.ads_daily}/day`} />
            <Row label="Other expenses" v={d.other_expenses} minus note="Finance → Expenses" />
            <Row label="Fixed costs" v={d.fixed} minus note={`₹${d.fixed_monthly}/month`} />
            <div className={`mt-2 flex items-baseline justify-between rounded-xl px-3 py-2 ${d.profit < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <span className="font-bold text-ink">{d.profit < 0 ? 'Loss' : 'Profit'} for {d.days} days</span>
              <span className={`text-lg font-extrabold tabular-nums ${d.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{inr(d.profit, 2)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4"><div className="text-[11px] font-bold uppercase text-muted">Take-home per sale</div>
                <div className="text-2xl font-extrabold text-ink">{d.take_home_per_sale == null ? '—' : inr(d.take_home_per_sale, 2)}</div>
                <div className="text-[11px] text-muted">after GST, Razorpay, WhatsApp</div></div>
              <div className="card p-4"><div className="text-[11px] font-bold uppercase text-muted">Sales to break even</div>
                <div className="text-2xl font-extrabold text-ink">{d.sales_to_break_even == null ? '—' : num(d.sales_to_break_even)}</div>
                <div className="text-[11px] text-muted">in {d.days} days · you had {num(d.invoices)}</div></div>
            </div>
            <div className="card p-4">
              <div className="text-[11px] font-bold uppercase text-muted">Assumptions</div>
              <label className="mt-2 flex items-center justify-between gap-2 text-sm text-ink">QuizPe ads a day (when not in Expenses)
                <span className="flex items-center gap-1">₹<input className="input !w-24 !py-1.5" value={ads} onChange={(e) => setAds(e.target.value)} /></span></label>
              <label className="mt-2 flex items-center justify-between gap-2 text-sm text-ink">Fixed costs a month (server, domain…)
                <span className="flex items-center gap-1">₹<input className="input !w-24 !py-1.5" value={fixed} onChange={(e) => setFixed(e.target.value)} /></span></label>
              <button type="button" className="btn-pri mt-3 !py-2" onClick={save}>Save</button>
              <p className="mt-2 text-[11px] text-muted">Real ad spend entered on <Link className="text-brand-accent hover:underline" to="/finance">Finance → Expenses</Link> (category “ads”) replaces the daily assumption.</p>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
