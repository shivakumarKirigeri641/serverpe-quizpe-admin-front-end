/** Searchable parent grid. Click a row for the nested detail view. */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill, Row, inr } from '../components/ui.jsx';

export default function Parents() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const LIMIT = 25;

  const load = () => {
    setError('');
    api.parents({ q, limit: LIMIT, offset })
      .then((d) => { setRows(d.rows); setTotal(d.total); })
      .catch((e) => setError(e.message));
  };

  // debounce so typing doesn't fire a query per keystroke
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, offset]);

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
                          <td className="td whitespace-nowrap text-xs">{p.plan_end_date || '—'}</td>
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
