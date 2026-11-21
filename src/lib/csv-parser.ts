function detectDelimiter(sampleLine: string): "," | ";" | "\t" {
  const counts = {
    ",": (sampleLine.match(/,/g) || []).length,
    ";": (sampleLine.match(/;/g) || []).length,
    "\t": (sampleLine.match(/\t/g) || []).length,
  };
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  return ",";
}

/**
 * Converte conteúdo CSV/TSV (com suporte a campos entre aspas, aspas escapadas ""
 * e detecção automática de vírgula, ponto-e-vírgula ou tabulação) em matriz de strings.
 */
export function parseCsvRows(raw: string): string[][] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const firstNewline = normalized.indexOf("\n");
  const firstLine = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}
