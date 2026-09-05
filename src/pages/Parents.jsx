/** Searchable parent grid. Click a row for the nested detail view. */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill, Row, inr } from '../components/ui.jsx';

/** Formatted expiry date + a colour-coded days-left / expired badge. */
function expiryInfo(dateStr) {
  if (!dateStr) return null;
  const end = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((end - today) / 86400000);
  const nice = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let tone = 'green', label = `${days} days left`;
  if (days < 0) { tone = 'red'; label = `expired ${-days}d ago`; }
  else if (days === 0) { tone = 'red'; label = 'expires today'; }
  else if (days === 1) { tone = 'red'; label = 'expires tomorrow'; }
  else if (days <= 3) { tone = 'red'; label = `${days} days left`; }
  else if (days <= 7) { tone = 'amber'; label = `${days} days left`; }
  return { nice, tone, label };
}

export default function Parents() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('all');
  // Expiry-first by default: this list is worked for renewals.
  const [sort, setSort] = useState('expiry_desc');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const LIMIT = 25;

  const load = () => {
    setError('');
    api.parents({ q, limit: LIMIT, offset, filter, sort })
      .then((d) => { setRows(d.rows); setTotal(d.total); })
      .catch((e) => setError(e.message));
  };

  // debounce so typing doesn't fire a query per keystroke
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, offset, filter, sort]);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expiring', label: 'Expiring ≤7d' },
    { key: 'lapsed', label: 'Lapsed (not renewed)' },
  ];

  // 'Expiring ≤7d' has its own fixed ordering (soonest first), so the sort
  // control is hidden there rather than silently ignored.
  const SORTS = [
    { key: 'expiry_desc', label: 'Expiry ↓ latest first' },
    { key: 'expiry_asc', label: 'Expiry ↑ soonest first' },
    { key: 'newest', label: 'Newest signup' },
  ];

  const head = ['Parent', 'Mobile', 'State', 'Children', 'Plan', 'Valid till', 'Status', 'Lifetime value'];

  return (
    <Page
      title="Parents & students"
      subtitle={rows ? `${total} parent${total === 1 ? '' : 's'}` : ''}
      actions={
        <input
          className="input max-w-xs" placeholder="Search name or mobile…"
          value={q} onChange={(e) => { setOffset(0); setQ(e.target.value); }}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button key={f.key}
                  onClick={() => { setOffset(0); setFilter(f.key); }}
                  className={`btn-sec text-sm ${filter === f.key ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>
            {f.label}
          </button>
        ))}
        {filter !== 'expiring' && (
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            Sort
            <select
              className="input py-1.5 text-sm"
              value={sort}
              onChange={(e) => { setOffset(0); setSort(e.target.value); }}
            >
              {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {error ? <ErrorBox error={error} onRetry={load} />
        : !rows ? <Loading label="Loading parents…" />
          : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((p, i) => (
                        <Row key={p.id} index={i} onClick={() => navigate(`/parents/${p.id}`)}>
                          <td className="td font-semibold">{p.parent_name || '—'}</td>
                          <td className="td">{p.parent_mobile_number}</td>
                          <td className="td">{p.state_code || '—'}</td>
                          <td className="td">{p.children}</td>
                          <td className="td">
                            {p.plan_name
                              ? <Pill tone={p.is_trial ? 'amber' : 'green'}>{p.plan_name}</Pill>
                              : <span className="text-muted text-xs">none</span>}
                          </td>
                          <td className="td whitespace-nowrap text-xs">
                            {(() => {
                              const e = expiryInfo(p.plan_end_date);
                              return e ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-medium">{e.nice}</span>
                                  <Pill tone={e.tone}>{e.label}</Pill>
                                </div>
                              ) : <span className="text-muted">—</span>;
                            })()}
                          </td>
                          <td className="td">
                            <Pill tone={p.subscribed ? 'green' : 'grey'}>
                              {p.subscribed ? 'active' : 'inactive'}
                            </Pill>
                          </td>
                          <td className="td font-semibold">{inr(p.lifetime_value)}</td>
                        </Row>
                      ))}
                      {!rows.length && (
                        <tr><td className="td text-center text-muted" colSpan={head.length}>
                          No parents match that search.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {total > LIMIT && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted">
                    {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-sec" disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Previous</button>
                    <button className="btn-sec" disabled={offset + LIMIT >= total}
                            onClick={() => setOffset(offset + LIMIT)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
    </Page>
  );
}
