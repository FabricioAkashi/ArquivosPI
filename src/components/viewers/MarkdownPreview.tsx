"use client";

import React from "react";
import { tokenizeCodeLines, TokenType } from "@/lib/code-formatter";

interface MarkdownPreviewProps {
  content: string;
}

const CODE_TOKEN_CLASSES: Record<TokenType, string> = {
  plain: "text-[#1a1614] dark:text-[#fafbf7]",
  comment: "text-[#6d8352] dark:text-[#7f9564] italic",
  string: "text-emerald-700 dark:text-emerald-400",
  number: "text-purple-700 dark:text-purple-400",
  keyword: "text-[#c96726] dark:text-[#d77435] font-medium",
  type: "text-blue-700 dark:text-sky-400",
  property: "text-teal-700 dark:text-teal-300",
  function: "text-amber-700 dark:text-amber-300",
  tag: "text-rose-700 dark:text-rose-400 font-medium",
  punctuation: "text-[#736d67] dark:text-[#9c968f]",
};

function isSafeHref(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  );
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Matches `code`, **bold**, *italic*, [label](url)
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-[#1a1614]/8 px-1.5 py-0.5 font-mono text-[0.85em] text-[#c96726] dark:bg-white/10 dark:text-[#d77435]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[#1a1614] dark:text-[#fafbf7]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && isSafeHref(linkMatch[2])) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target={linkMatch[2].startsWith("http") ? "_blank" : undefined}
            rel={linkMatch[2].startsWith("http") ? "noopener noreferrer" : undefined}
            className="font-medium text-[#c96726] underline decoration-[#c96726]/40 underline-offset-2 hover:decoration-[#c96726] dark:text-[#d77435]"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block ```lang
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "txt";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      const tokenized = tokenizeCodeLines(codeLines.join("\n"), lang);
      blocks.push(
        <div
          key={blockKey++}
          className="my-4 overflow-hidden rounded-xl border border-[#1a1614]/12 bg-[#f5f6f1]/80 dark:border-white/10 dark:bg-[#161311]/90"
        >
          <div className="border-b border-dashed border-[#1a1614]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6d8352] dark:border-white/10 dark:text-[#7f9564]">
            {lang}
          </div>
          <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-6">
            {tokenized.map((toks, idx) => (
              <div key={idx}>
                {toks.length === 0 ? (
                  "\u00A0"
                ) : (
                  toks.map((t, tidx) => (
                    <span key={tidx} className={CODE_TOKEN_CLASSES[t.type]}>
                      {t.text}
                    </span>
                  ))
                )}
              </div>
            ))}
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(
        <hr
          key={blockKey++}
          className="my-6 border-0 border-t border-dashed border-[#1a1614]/20 dark:border-white/15"
        />
      );
      i++;
      continue;
    }

    // Headings (# to ######)
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const styles: Record<number, string> = {
        1: "mt-2 mb-4 border-b border-dashed border-[#1a1614]/15 pb-2 font-serif text-2xl sm:text-3xl font-normal text-[#1a1614] dark:border-white/10 dark:text-[#fafbf7]",
        2: "mt-6 mb-3 font-serif text-xl sm:text-2xl font-normal text-[#1a1614] dark:text-[#fafbf7]",
        3: "mt-5 mb-2 font-sans text-lg font-semibold text-[#1a1614] dark:text-[#fafbf7]",
        4: "mt-4 mb-2 font-sans text-base font-semibold text-[#1a1614] dark:text-[#fafbf7]",
        5: "mt-3 mb-1.5 font-mono text-sm font-semibold uppercase tracking-wide text-[#6d8352] dark:text-[#7f9564]",
        6: "mt-3 mb-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-[#736d67] dark:text-[#9c968f]",
      };
      blocks.push(
        <div key={blockKey++} className={styles[level]}>
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={blockKey++}
          className="my-4 border-l-2 border-[#c96726] bg-[#c96726]/[0.05] px-4 py-2.5 text-sm italic text-[#736d67] dark:border-[#d77435] dark:bg-[#d77435]/[0.08] dark:text-[#d5cfc9]"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Markdown Table
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s|:-]+\s*$/.test(lines[i + 1])
    ) {
      const splitRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());

      const headers = splitRow(line);
      i += 2; // Skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }

      blocks.push(
        <div
          key={blockKey++}
          className="my-4 overflow-x-auto rounded-xl border border-[#1a1614]/12 dark:border-white/10"
        >
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-[#f5f6f1] font-mono text-[11px] uppercase tracking-wider text-[#6d8352] dark:bg-[#201c19] dark:text-[#7f9564]">
              <tr>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="border-b border-[#1a1614]/10 px-3.5 py-2.5 font-semibold dark:border-white/10"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1614]/10 dark:divide-white/10">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#1a1614]/[0.02] dark:hover:bg-white/[0.02]">
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3.5 py-2 text-[#1a1614] dark:text-[#fafbf7]"
                    >
                      {renderInline(r[cIdx] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered / Ordered List
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const isOrdered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ""));
        i++;
      }
      const ListTag = isOrdered ? "ol" : "ul";
      blocks.push(
        <ListTag
          key={blockKey++}
          className={`my-3 space-y-1.5 pl-6 text-sm leading-relaxed text-[#1a1614] dark:text-[#e6e2dc] ${
            isOrdered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraph (collect contiguous lines until blank or special block)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>|```|[-*+]\s|\d+\.\s|(-{3,}|\*{3,}|_{3,})$)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={blockKey++}
        className="my-3 text-sm sm:text-[15px] leading-relaxed text-[#1a1614] dark:text-[#e6e2dc]"
      >
        {renderInline(paraLines.join(" "))}
      </p>
    );
  }

  return (
    <article className="mx-auto max-w-4xl rounded-2xl border border-[#1a1614]/12 bg-white/95 p-6 sm:p-10 shadow-xs backdrop-blur-xs dark:border-white/10 dark:bg-[#1b1815]/95">
      {blocks.length > 0 ? (
        blocks
      ) : (
        <p className="font-mono text-xs italic text-[#736d67] dark:text-[#9c968f]">
          Documento Markdown vazio.
        </p>
      )}
    </article>
  );
}
