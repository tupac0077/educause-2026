import { type ReactNode } from "react";

/**
 * Tiny, dependency-free markdown renderer for chat answers (Genie / agent).
 * Supports: headings, **bold**, *italic*, `code`, [links](url), unordered &
 * ordered lists, and simple pipe tables. Renders to React nodes (no
 * dangerouslySetInnerHTML). Not a full CommonMark implementation — just the
 * subset our agents emit.
 */

let keySeq = 0;
const k = () => `md-${keySeq++}`;

// --- inline: **bold**, *italic*, _italic_, `code`, [text](url) ---
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\n]+)\*)|(_([^_\n]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={k()}>{m[2]}</strong>);
    else if (m[4] !== undefined)
      nodes.push(
        <code key={k()} className="ns-mono text-[0.85em] px-1 py-0.5 rounded" style={{ background: "var(--ns-surface)", border: "1px solid var(--ns-line)" }}>
          {m[4]}
        </code>,
      );
    else if (m[6] !== undefined)
      nodes.push(
        <a key={k()} href={m[7]} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ns-navy, #094074)" }}>
          {m[6]}
        </a>,
      );
    else if (m[9] !== undefined) nodes.push(<em key={k()}>{m[9]}</em>);
    else if (m[11] !== undefined) nodes.push(<em key={k()}>{m[11]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Table({ rows }: { rows: string[] }) {
  const cells = (line: string) =>
    line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells); // rows[1] is the --- separator
  return (
    <div className="overflow-x-auto my-2">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr>
            {header.map((h) => (
              <th key={k()} className="text-left font-semibold px-2 py-1" style={{ borderBottom: "2px solid var(--ns-line)" }}>
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r) => (
            <tr key={k()}>
              {r.map((c) => (
                <td key={k()} className="px-2 py-1 align-top" style={{ borderBottom: "1px solid var(--ns-line)" }}>
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  const text = children ?? "";
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  const isTableSep = (s: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(s) && s.includes("-");

  while (i < lines.length) {
    const line = lines[i];

    // blank line
    if (!line.trim()) { i++; continue; }

    // pipe table: current line has |, next line is a separator row
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("|") && isTableSep(lines[i + 1])) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].includes("|")) { tbl.push(lines[i]); i++; }
      blocks.push(<Table key={k()} rows={tbl} />);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl <= 1 ? "text-lg font-bold mt-2 mb-1" : lvl === 2 ? "text-base font-bold mt-2 mb-1" : "text-sm font-semibold mt-1.5 mb-0.5";
      blocks.push(<div key={k()} className={cls}>{renderInline(h[2])}</div>);
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(<li key={k()}>{renderInline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ul key={k()} className="list-disc pl-5 space-y-0.5 my-1">{items}</ul>);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={k()}>{renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ol key={k()} className="list-decimal pl-5 space-y-0.5 my-1">{items}</ol>);
      continue;
    }

    // paragraph: gather consecutive plain lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={k()} className="my-1 leading-relaxed">
        {para.map((pl, idx) => (
          <span key={k()}>
            {renderInline(pl)}
            {idx < para.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="text-sm">{blocks}</div>;
}

export default Markdown;
