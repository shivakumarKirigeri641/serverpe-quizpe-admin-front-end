/**
 * VisitorGroups — visitor activity rolled up into time buckets
 * (today / yesterday / earlier this week / earlier this month / older), each
 * with a count and a breakdown by device, state/UT, place and country.
 *
 * Shared by Visitors, Inbox → Visitors and Conversations, all fed by the same
 * /visitors/grouped endpoint (kind = 'all' or 'wa_click').
 */
import { motion } from 'framer-motion';

function MiniList({ title, items, max = 4 }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1">{title}</p>
      <ul className="space-y-0.5">
        {items.slice(0, max).map((it) => (
          <li key={it.name} className="flex items-center justify-between text-xs gap-2">
            <span className="truncate text-ink">{it.name}</span>
            <span className="font-semibold text-brand shrink-0">{it.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BucketCard({ b, showWa, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.05, 0.3) }}
      className={`card p-4 ${b.total === 0 ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-brand text-sm">{b.label}</h3>
        <span className="text-2xl font-black text-ink">{b.total}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
        <span className="pill bg-line/50 text-ink">{b.uniques} unique</span>
        {showWa && <span className="pill bg-emerald-50 text-emerald-700">{b.wa_clicks} WhatsApp</span>}
        <span className="pill bg-line/50 text-ink">{b.unique_ips} IP{b.unique_ips === 1 ? '' : 's'}</span>
      </div>
      {b.total === 0 ? (
        <p className="text-xs text-muted">No visits.</p>
      ) : (
        <div className="space-y-2.5">
          <MiniList title="Device" items={b.devices} />
          <MiniList title="State / UT" items={b.states} />
          <MiniList title="Place" items={b.places} />
          <MiniList title="Country" items={b.countries} />
        </div>
      )}
    </motion.div>
  );
}

export default function VisitorGroups({ grouped, showWa = true }) {
  if (!grouped?.buckets) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {grouped.buckets.map((b, i) => <BucketCard key={b.key} b={b} showWa={showWa} i={i} />)}
    </div>
  );
}
