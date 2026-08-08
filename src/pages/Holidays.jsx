/**
 * Holidays — reserve dates on which the quiz opens ALL DAY (like a weekend).
 *
 * On any reserved date the quiz window opens 6 AM–11:45 PM instead of the
 * evening, and the scheduler automatically sends the "open all day" nudge to
 * active families that morning, greeting "holiday". Weekends are automatic and
 * need no entry here. You only ever reserve FUTURE dates.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/Toaster.jsx';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pretty = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export default function Holidays() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError('');
    api.holidays().then((r) => setList(r.holidays)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const add = async () => {
    if (!date) return toast('Pick a date first.', 'error');
    if (date < todayISO()) return toast('Only future dates can be reserved.', 'error');
    setBusy(true);
    try {
      await api.holidayAdd(date, label.trim() || null);
      toast(`${pretty(date)} reserved as a holiday.`, 'success');
      setDate(''); setLabel('');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (iso) => {
    if (!confirm(`Unreserve ${pretty(iso)}? The quiz goes back to evening-only that day.`)) return;
    try {
      await api.holidayRemove(iso);
      toast(`${pretty(iso)} unreserved.`, 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!list) return <Loading label="Loading holidays…" />;

  return (
    <Page title="Holidays" subtitle="Reserve dates when the quiz opens all day — the nudge is sent automatically that morning">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Reserve */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-brand">Reserve a holiday</h2>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Date (future only)</label>
            <input type="date" min={todayISO()} className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Label (optional)</label>
            <input type="text" className="input" placeholder="e.g. Independence Day" maxLength={80}
                   value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <button className="btn-pri w-full" disabled={busy || !date} onClick={add}>
            {busy ? 'Reserving…' : '📅 Reserve this date'}
          </button>
          <p className="text-[11px] text-muted">
            On a reserved date the quiz opens <b>6 AM–11:45 PM</b> and the “open all day” nudge goes out that morning,
            automatically. Weekends are already all-day — no need to add them here.
          </p>
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <h2 className="font-bold text-brand mb-3">Upcoming reserved dates</h2>
          {list.filter((h) => h.is_active).length === 0 ? (
            <p className="text-sm text-muted">None reserved yet. Add an upcoming holiday on the left.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {list.filter((h) => h.is_active).map((h) => (
                <div key={h.date} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-semibold text-ink">{pretty(h.date)}</div>
                    {h.label && <div className="text-xs text-muted">{h.label}</div>}
                  </div>
                  <button onClick={() => remove(h.date)}
                          className="text-xs font-semibold text-red-600 hover:underline">Unreserve</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
