import React from "react";

function parseInline(text: string): React.ReactNode[] {
  // Parses **bold**, *italic*, `code`, and links
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      elements.push(
        <strong key={key++} className="font-semibold text-foreground">
          {parseInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(
        <code
          key={key++}
          className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-accent border border-border"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
    if (italicMatch) {
      elements.push(
        <em key={key++} className="italic text-foreground">
          {parseInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Next plain text chunk
    const nextSpecial = remaining.search(/(\*\*|__|\*|_|`)/);
    if (nextSpecial === -1) {
      elements.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // unmatched delimiter
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      elements.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements;
}

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule: --- or ***
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      nodes.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    // Headings: #, ##, ###, ####
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      if (level === 1) {
        nodes.push(
          <h1 key={key++} className="mt-5 mb-2.5 text-xl font-bold tracking-tight text-foreground border-b border-border pb-1.5">
            {parseInline(text)}
          </h1>
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={key++} className="mt-4 mb-2 text-lg font-bold tracking-tight text-foreground border-b border-border/80 pb-1">
            {parseInline(text)}
          </h2>
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={key++} className="mt-3.5 mb-1.5 text-[15.5px] font-semibold tracking-tight text-foreground">
            {parseInline(text)}
          </h3>
        );
      } else {
        nodes.push(
          <h4 key={key++} className="mt-3 mb-1 text-[14px] font-semibold text-foreground">
            {parseInline(text)}
          </h4>
        );
      }
      i++;
      continue;
    }

    // Blockquote: > ...
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith(">") || (lines[i].trim() && quoteLines.length > 0 && !lines[i].startsWith("#")))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
        if (i < lines.length && lines[i].trim() === "") break;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-3 rounded-r-xl border-l-4 border-accent bg-accent-soft/20 px-4 py-2.5 text-[13.5px] leading-relaxed text-muted italic shadow-xs"
        >
          {parseInline(quoteLines.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Markdown Table: | Col 1 | Col 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableRows.push(lines[i].trim());
        i++;
      }
      if (tableRows.length >= 2) {
        const headers = tableRows[0]
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        // Skip separator row (tableRows[1]) if it contains dashes
        const dataRows = tableRows.slice(1).filter((r) => !/^\|[\s\-\:]+\|$/.test(r));

        nodes.push(
          <div key={key++} className="my-3.5 overflow-x-auto rounded-xl border border-border bg-panel shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border bg-surface/80">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-3.5 py-2.5 font-semibold text-foreground">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dataRows.map((rowStr, rIdx) => {
                  const cells = rowStr
                    .split("|")
                    .map((s) => s.trim())
                    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                  return (
                    <tr key={rIdx} className="hover:bg-surface/40 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-muted leading-relaxed">
                          {parseInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Unordered List: - or * or •
    if (/^[\-\*•]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\-\*•]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\-\*•]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={key++} className="my-2.5 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-foreground">
          {listItems.map((item, idx) => (
            <li key={idx} className="pl-1">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List: 1. 2. etc.
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={key++} className="my-2.5 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-foreground">
          {listItems.map((item, idx) => (
            <li key={idx} className="pl-1">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={key++} className="my-2 text-[14.5px] leading-relaxed text-foreground">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 text-foreground leading-relaxed">{nodes}</div>;
}
