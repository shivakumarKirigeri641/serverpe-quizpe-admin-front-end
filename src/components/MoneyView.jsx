/**
 * The founder's money view — "how much of this turnover is actually mine?"
 *
 * Turnover flatters. A month can take ₹50,000 and still owe most of it back:
 * GST is the government's, and marketing has to be paid for. This screen walks
 * the money down from what parents paid to what is genuinely safe to withdraw,
 * and says in plain words why each step is subtracted — because a founder
 * withdrawing GST or un-recouped marketing spend is the quickest way to a hole.
 *
 * The single most important number is "withdrawable this month". When it is
 * negative that is not failure — it means this month's growth was bought with
 * more than it earned, so the honest move is to leave it in.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { inr } from './ui.jsx';

/* One line in the walk-down from turnover to withdrawable. */
function Row({ label, value, hint, strong, sign }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? 'border-t-2 border-line mt-1 pt-3' : ''}`}>
      <div>
        <p className={strong ? 'font-extrabold text-brand' : 'text-sm text-ink'}>{label}</p>
        {hint && <p className="text-[11px] text-muted leading-snug max-w-xs">{hint}</p>}
      </div>
      <p className={`tabular-nums whitespace-nowrap ${strong ? 'text-xl font-black' : 'text-sm font-semibold'} ${
        sign === 'minus' ? 'text-rose-600' : strong ? 'text-brand' : 'text-ink'}`}>
        {sign === 'minus' ? '− ' : ''}{inr(Math.abs(value))}
      </p>
    </div>
  );
}

function PeriodCard({ title, d, accent }) {
  const neg = d.withdrawable < 0;
  return (
    <div className={`card p-4 ${accent ? 'border-2 border-brand-accent' : ''}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      <p className="text-2xl font-black text-brand mt-1">{inr(d.collected)}</p>
      <p className="text-[11px] text-muted">collected · {d.invoices} invoice{d.invoices === 1 ? '' : 's'}</p>
      <div className="mt-2 pt-2 border-t border-line text-xs space-y-0.5">
        <div className="flex justify-between"><span className="text-muted">GST set aside</span><span className="tabular-nums">{inr(d.output_gst)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Spent</span><span className="tabular-nums">{inr(d.spend_gross)}</span></div>
        <div className="flex justify-between font-bold">
          <span className={neg ? 'text-rose-600' : 'text-brand'}>Withdrawable</span>
          <span className={`tabular-nums ${neg ? 'text-rose-600' : 'text-brand'}`}>{inr(d.withdrawable)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MoneyView() {
  const [sum, setSum] = useState(null);
  const [months, setMonths] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ expense_date: '', category: 'marketing', description: '', vendor: '', amount: '', gst_amount: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setErr('');
    Promise.all([api.financeSummary(), api.financeMonthly(12), api.expenses(100)])
      .then(([s, m, e]) => { setSum(s); setMonths(m.rows); setExpenses(e.rows); setCats(e.categories); })
      .catch((x) => setErr(x.message));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true); setErr('');
    try {
      await api.addExpense({ ...form, amount: Number(form.amount), gst_amount: Number(form.gst_amount || 0) });
      setForm({ expense_date: '', category: 'marketing', description: '', vendor: '', amount: '', gst_amount: '' });
      load();
    } catch (x) { setErr(x.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this expense? Past months already reported will change.')) return;
    try { await api.removeExpense(id); load(); } catch (x) { setErr(x.message); }
  };

  if (err && !sum) return <div className="card p-5 text-sm text-red-600">{err}</div>;
  if (!sum) return <div className="card p-5 text-sm text-muted">Loading the money view…</div>;

  const m = sum.month;
  const neg = m.withdrawable < 0;

  return (
    <div className="space-y-5">
      {/* headline cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PeriodCard title="Today" d={sum.today} />
        <PeriodCard title="This month" d={sum.month} accent />
        <PeriodCard title="All time" d={sum.all_time} />
      </div>

      {/* the walk-down: turnover → withdrawable, this month */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-brand">Where this month's money goes</h2>
          <p className="text-xs text-muted mt-0.5 mb-2">
            Turnover is not profit. Here is the same money, walked down to what is really yours.
          </p>
          <Row label="Collected from parents" value={m.collected}
               hint="Everything received this month, GST included." />
          <Row label="GST set aside" value={m.output_gst} sign="minus"
               hint="The tax portion. Never yours — it is owed to the government." />
          <Row label="Your sales (ex-GST)" value={m.sales_ex_gst}
               hint="Actual business income once tax is removed." />
          <Row label="Expenses (ex-GST)" value={m.spend_ex_gst} sign="minus"
               hint="What running the business cost, with reclaimable GST stripped out." />
          <Row label="Withdrawable this month" value={m.withdrawable} strong
               sign={neg ? 'minus' : undefined} />

          <div className={`mt-3 rounded-xl p-3 text-xs leading-relaxed ${
            neg ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
            {neg
              ? <>You spent more on growth than the month earned. <b>Do not withdraw</b> — this is money invested in getting the next families in, and it should stay in the business.</>
              : <>This is what you can safely take out. Everything above it — GST and costs — is already accounted for.</>}
          </div>
        </div>

        {/* GST position */}
        <div className="card p-5">
          <h2 className="font-bold text-brand">GST position — this month</h2>
          <p className="text-xs text-muted mt-0.5 mb-2">
            What you owe the government is tax collected on sales minus tax you paid on expenses.
          </p>
          <Row label="GST collected on sales" value={m.output_gst}
               hint="Added on top of every plan and paid by parents." />
          <Row label="Input GST on expenses" value={m.input_gst} sign="minus"
               hint="Tax inside your bills — claimed back as credit." />
          <Row label={m.gst_to_pay >= 0 ? 'Net GST to pay' : 'GST credit carried forward'}
               value={m.gst_to_pay} strong sign={m.gst_to_pay < 0 ? undefined : undefined} />
          <div className="mt-3 rounded-xl bg-cream p-3 text-xs text-muted leading-relaxed">
            {m.gst_to_pay >= 0
              ? <>Keep <b>{inr(m.gst_to_pay)}</b> aside for your GST return — it is not part of your withdrawable profit.</>
              : <>Your expenses carried more GST than your sales this month, so there is nothing to pay and a small credit rolls forward.</>}
          </div>
        </div>
      </div>

      {/* expenses */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="font-bold text-brand">Expenses</h2>
            <p className="text-xs text-muted">Log what you spend so profit is real, not just turnover. Attach the GST amount from each bill to claim it back.</p>
          </div>
        </div>

        {/* add form */}
        <div className="grid gap-2 sm:grid-cols-6 items-end bg-cream rounded-xl p-3 mb-3">
          <label className="text-xs sm:col-span-1">
            <span className="text-muted">Date</span>
            <input type="date" className="input" value={form.expense_date}
                   onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </label>
          <label className="text-xs sm:col-span-1">
            <span className="text-muted">Category</span>
            <select className="input" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-muted">Description</span>
            <input className="input" placeholder="e.g. school-gate pamphlets" value={form.description}
                   onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="text-xs">
            <span className="text-muted">Amount ₹</span>
            <input type="number" className="input" placeholder="118" value={form.amount}
                   onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="text-xs">
            <span className="text-muted">of which GST ₹</span>
            <input type="number" className="input" placeholder="18" value={form.gst_amount}
                   onChange={(e) => setForm({ ...form, gst_amount: e.target.value })} />
          </label>
          <div className="sm:col-span-6 flex items-center gap-3">
            <button className="btn-pri" onClick={save} disabled={saving || !form.amount || !form.description}>
              {saving ? 'Saving…' : '+ Add expense'}
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </div>

        {/* list */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>{['Date', 'Category', 'Description', 'Amount', 'GST', ''].map((h) =>
              <th key={h} className="th text-left">{h}</th>)}</tr></thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-muted py-6">
                  No expenses logged yet. Add your first — marketing, hosting, WhatsApp costs.
                </td></tr>
              )}
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="td whitespace-nowrap text-xs">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                  <td className="td text-xs">{e.category}</td>
                  <td className="td">{e.description}{e.vendor && <span className="text-muted text-xs"> · {e.vendor}</span>}</td>
                  <td className="td tabular-nums">{inr(e.amount)}</td>
                  <td className="td tabular-nums text-muted">{inr(e.gst_amount)}</td>
                  <td className="td text-right">
                    <button className="text-xs text-rose-600 hover:underline" onClick={() => remove(e.id)}>remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* monthly history */}
      <div className="card p-5 overflow-hidden">
        <h2 className="font-bold text-brand mb-1">Month by month</h2>
        <p className="text-xs text-muted mb-3">
          Read down the withdrawable column — that is your true earning each month, after GST and costs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>{['Month', 'Collected', 'GST set aside', 'Spent', 'Withdrawable'].map((h) =>
              <th key={h} className="th text-left">{h}</th>)}</tr></thead>
            <tbody>
              {months.length === 0 && (
                <tr><td colSpan={5} className="td text-center text-muted py-6">No months with activity yet.</td></tr>
              )}
              {months.map((r) => (
                <tr key={r.month}>
                  <td className="td font-semibold">{r.month}</td>
                  <td className="td tabular-nums">{inr(r.collected)}</td>
                  <td className="td tabular-nums text-muted">{inr(r.output_gst)}</td>
                  <td className="td tabular-nums text-muted">{inr(r.spend_gross)}</td>
                  <td className={`td tabular-nums font-bold ${r.withdrawable < 0 ? 'text-rose-600' : 'text-brand'}`}>
                    {r.withdrawable < 0 ? '− ' : ''}{inr(Math.abs(r.withdrawable))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted mt-3">
          A red, negative month means you invested more in growth than it returned — expected early on, and a
          reason to keep marketing rather than to draw a salary.
        </p>
      </div>
    </div>
  );
}
