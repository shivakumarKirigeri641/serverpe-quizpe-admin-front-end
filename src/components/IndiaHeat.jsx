/**
 * IndiaHeat — where visitors and enrolled families are, by state / UT.
 *
 * A heat-shaded leaderboard: each state's tile is coloured by its share of the
 * column's maximum, so the busiest states glow darkest. Two columns — website
 * visitors (geo-IP) and enrolled families (their chosen state).
 */
const shade = (n, max) => {
  const a = max > 0 ? 0.12 + 0.78 * (n / max) : 0.12;      // 0.12 → 0.90 alpha
  return { background: `rgba(15,118,110,${a.toFixed(3)})`, color: a > 0.5 ? '#fff' : '#12233b' };
};

function HeatColumn({ title, rows, note }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-brand">{title}</h3>
        <span className="text-xs text-muted">{total} total{note ? ` · ${note}` : ''}</span>
      </div>
      {!rows.length ? (
        <p className="text-sm text-muted py-6 text-center">No data yet.</p>
      ) : (
        <div className="grid gap-1.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={shade(r.n, max)}>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
              <span className="font-black shrink-0">{r.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IndiaHeat({ geo }) {
  if (!geo) return <div className="card p-6 text-sm text-muted">Loading map…</div>;
  const otherNote = geo.visitors_other ? `${geo.visitors_other} outside India` : '';
  const todayNote = geo.visitors_today_other ? `${geo.visitors_today_other} outside India` : '';
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <HeatColumn title="Website visitors by state" rows={geo.visitors} note={otherNote} />
      <HeatColumn title="Website visitors by state · today" rows={geo.visitors_today || []} note={todayNote} />
      <HeatColumn title="Enrolled families by state" rows={geo.families} />
    </div>
  );
}
