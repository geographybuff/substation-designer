import { useMemo, useState } from 'preact/hooks';
import { formatCitation } from '../../data/bulletin/types';
import { ARTICLES, type Block, type GuideArticle } from '../../content';
import { go, store, useStore } from '../store';

function renderBlock(b: Block, i: number) {
  if ('p' in b) return <p key={i}>{b.p}</p>;
  if ('h' in b) return <h3 key={i}>{b.h}</h3>;
  if ('list' in b)
    return (
      <ul key={i}>
        {b.list.map((x, j) => (
          <li key={j}>{x}</li>
        ))}
      </ul>
    );
  if ('note' in b)
    return (
      <div key={i} class="card small" style={{ borderColor: '#4a5d70', margin: '.8em 0' }}>
        <b>Game note:</b> {b.note}
      </div>
    );
  return (
    <div key={i} style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {b.table.head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.table.rows.map((r, j) => (
            <tr key={j}>
              {r.map((c, k) => (
                <td key={k}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(b.table.caption || b.table.cite) && (
        <div class="muted small">
          {b.table.caption} {b.table.cite && <span>Source: {formatCitation(b.table.cite)}.</span>}
        </div>
      )}
    </div>
  );
}

function findForTopic(topic: string | null): GuideArticle | undefined {
  if (!topic) return undefined;
  if (topic.startsWith('cite:')) {
    const sec = topic.slice(5);
    if (!sec) return undefined;
    // Most specific match first.
    let best: { a: GuideArticle; len: number } | undefined;
    for (const a of ARTICLES) {
      for (const c of a.cites) {
        const s = c.section ?? '';
        if (s && (sec === s || sec.startsWith(s + '.') || s.startsWith(sec + '.'))) {
          const len = s.length;
          if (!best || len > best.len) best = { a, len };
        }
      }
    }
    return best?.a;
  }
  return ARTICLES.find((a) => a.id === topic);
}

export function FieldGuide() {
  const topic = useStore(store, (s) => s.guideTopic);
  const hasDesign = useStore(store, (s) => !!s.design);
  const [q, setQ] = useState('');
  const initial = findForTopic(topic) ?? ARTICLES[0]!;
  const [sel, setSel] = useState<string>(initial.id);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ARTICLES;
    return ARTICLES.filter((a) => a.title.toLowerCase().includes(t) || (a.tags ?? []).some((x) => x.includes(t)) || JSON.stringify(a.body).toLowerCase().includes(t));
  }, [q]);
  const art = ARTICLES.find((a) => a.id === sel) ?? initial;
  const cats = [...new Set(list.map((a) => a.category))];
  return (
    <div class="screen scroll menu-bg" data-testid="field-guide">
      <div class="page" style={{ maxWidth: 1200 }}>
        <div class="page-head">
          <button class="btn" onClick={() => go(hasDesign ? 'editor' : 'menu')}>
            ← Back
          </button>
          <h1>Field Guide</h1>
          <span class="muted small">Paraphrased from RUS Bulletin 1724E-300 with citations</span>
        </div>
        <div class="guide">
          <div>
            <input type="search" placeholder="Search…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
            <div class="guide-list" style={{ marginTop: '.6em' }}>
              {cats.map((c) => (
                <div key={c}>
                  <div class="muted small" style={{ margin: '.6em .6em .2em', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {c}
                  </div>
                  {list
                    .filter((a) => a.category === c)
                    .map((a) => (
                      <button key={a.id} class={a.id === art.id ? 'on' : ''} onClick={() => setSel(a.id)}>
                        {a.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
          <div class="card guide-article">
            <h2>{art.title}</h2>
            {art.cites.length > 0 && (
              <div class="muted small" style={{ marginBottom: '.6em' }}>
                {art.cites.map((c) => formatCitation(c)).join(' · ')}
              </div>
            )}
            {art.body.map(renderBlock)}
          </div>
        </div>
      </div>
    </div>
  );
}
