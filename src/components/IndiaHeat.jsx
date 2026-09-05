/**
 * IndiaHeat — where visitors and enrolled families are, by state / UT.
 *
 * A heat-shaded leaderboard: each state's tile is coloured by its share of the
 * column's maximum, so the busiest states glow darkest. Two columns — website
 * visitors (geo-IP) and enrolled families (their chosen state).
 */
// Every column gets this exact list height, so the four cards line up however
// many states each one happens to hold. ~6 rows before it scrolls.
const LIST_H = 240;

const shade = (n, max) => {
  const a = max > 0 ? 0.12 + 0.78 * (n / max) : 0.12;      // 0.12 → 0.90 alpha
  return { background: `rgba(15,118,110,${a.toFixed(3)})`, color: a > 0.5 ? '#fff' : '#12233b' };
};

/**
 * One column. The list scrolls inside a fixed-height box rather than growing
 * with its row count: "visitors by state" carries every state we have ever seen
 * and used to tower over the shorter columns beside it, leaving the row
 * ragged. A capped, scrolling body keeps all four the same height.
 */
function HeatColumn({ title, rows, note }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-brand">{title}</h3>
        <span className="text-xs text-muted whitespace-nowrap ml-2">
          {total} total{note ? ` · ${note}` : ''}
        </span>
      </div>
      {!rows.length ? (
        <p className="text-sm text-muted py-6 text-center">No data yet.</p>
      ) : (
        <div className="grid gap-1.5 overflow-y-auto pr-1" style={{ height: LIST_H }}>
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm shrink-0"
              style={shade(r.n, max)}
            >
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
      <HeatColumn title="Active families by state · trial & paid" rows={geo.families_active || []} note="live subscriptions" />
    </div>
  );
}
