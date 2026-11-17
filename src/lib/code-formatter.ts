import type { Plugin } from "prettier";
import { getExtension } from "./file-utils";

export type PrettierParserName =
  | "babel"
  | "typescript"
  | "json"
  | "json5"
  | "html"
  | "css"
  | "scss"
  | "less"
  | "markdown"
  | "yaml";

export interface CodeLanguageInfo {
  extension: string;
  languageLabel: string;
  parser: PrettierParserName | null;
  isCode: boolean;
}

const LANGUAGE_MAP: Record<string, { label: string; parser: PrettierParserName | null; isCode: boolean }> = {
  js: { label: "JavaScript", parser: "babel", isCode: true },
  jsx: { label: "JSX / React", parser: "babel", isCode: true },
  mjs: { label: "ES Module", parser: "babel", isCode: true },
  cjs: { label: "CommonJS", parser: "babel", isCode: true },
  ts: { label: "TypeScript", parser: "typescript", isCode: true },
  tsx: { label: "TSX / React", parser: "typescript", isCode: true },
  mts: { label: "TS Module", parser: "typescript", isCode: true },
  cts: { label: "TS CommonJS", parser: "typescript", isCode: true },
  json: { label: "JSON", parser: "json", isCode: true },
  json5: { label: "JSON5", parser: "json5", isCode: true },
  jsonc: { label: "JSONC", parser: "json5", isCode: true },
  html: { label: "HTML", parser: "html", isCode: true },
  htm: { label: "HTML", parser: "html", isCode: true },
  css: { label: "CSS", parser: "css", isCode: true },
  scss: { label: "SCSS", parser: "scss", isCode: true },
  less: { label: "Less", parser: "less", isCode: true },
  md: { label: "Markdown", parser: "markdown", isCode: false },
  markdown: { label: "Markdown", parser: "markdown", isCode: false },
  yaml: { label: "YAML", parser: "yaml", isCode: true },
  yml: { label: "YAML", parser: "yaml", isCode: true },
  py: { label: "Python", parser: null, isCode: true },
  sql: { label: "SQL", parser: null, isCode: true },
  java: { label: "Java", parser: null, isCode: true },
  c: { label: "C", parser: null, isCode: true },
  cpp: { label: "C++", parser: null, isCode: true },
  h: { label: "Header C/C++", parser: null, isCode: true },
  go: { label: "Go", parser: null, isCode: true },
  rs: { label: "Rust", parser: null, isCode: true },
  sh: { label: "Shell", parser: null, isCode: true },
  xml: { label: "XML", parser: null, isCode: true },
  csv: { label: "CSV", parser: null, isCode: false },
  txt: { label: "Texto", parser: null, isCode: false },
  log: { label: "Log", parser: null, isCode: false },
};

export function getCodeLanguageInfo(filename: string): CodeLanguageInfo {
  const extension = getExtension(filename);
  const entry = LANGUAGE_MAP[extension];
  if (entry) {
    return {
      extension,
      languageLabel: entry.label,
      parser: entry.parser,
      isCode: entry.isCode,
    };
  }
  return {
    extension,
    languageLabel: extension ? extension.toUpperCase() : "Texto",
    parser: null,
    isCode: false,
  };
}

export interface PrettierFormatResult {
  formatted: string;
  didFormat: boolean;
  error?: string;
}

/**
 * Formata código no navegador usando prettier/standalone e apenas os plugins
 * necessários para a extensão do arquivo.
 */
export async function formatCodeWithPrettier(
  source: string,
  filename: string
): Promise<PrettierFormatResult> {
  const info = getCodeLanguageInfo(filename);
  if (!info.parser) {
    return { formatted: source, didFormat: false };
  }

  try {
    const prettier = await import("prettier/standalone");
    const plugins: Plugin[] = [];

    switch (info.parser) {
      case "babel":
      case "json":
      case "json5": {
        const [babelPlugin, estreePlugin] = await Promise.all([
          import("prettier/plugins/babel"),
          import("prettier/plugins/estree"),
        ]);
        plugins.push(babelPlugin as unknown as Plugin, estreePlugin as unknown as Plugin);
        break;
      }
      case "typescript": {
        const [tsPlugin, estreePlugin] = await Promise.all([
          import("prettier/plugins/typescript"),
          import("prettier/plugins/estree"),
        ]);
        plugins.push(tsPlugin as unknown as Plugin, estreePlugin as unknown as Plugin);
        break;
      }
      case "html": {
        const htmlPlugin = await import("prettier/plugins/html");
        plugins.push(htmlPlugin as unknown as Plugin);
        break;
      }
      case "css":
      case "scss":
      case "less": {
        const postcssPlugin = await import("prettier/plugins/postcss");
        plugins.push(postcssPlugin as unknown as Plugin);
        break;
      }
      case "markdown": {
        const mdPlugin = await import("prettier/plugins/markdown");
        plugins.push(mdPlugin as unknown as Plugin);
        break;
      }
      case "yaml": {
        const yamlPlugin = await import("prettier/plugins/yaml");
        plugins.push(yamlPlugin as unknown as Plugin);
        break;
      }
    }

    const formatted = await prettier.format(source, {
      parser: info.parser,
      plugins,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      trailingComma: "es5",
      bracketSpacing: true,
    });

    return {
      formatted: formatted.replace(/\n$/, ""),
      didFormat: true,
    };
  } catch (err) {
    return {
      formatted: source,
      didFormat: false,
      error: err instanceof Error ? err.message : "Erro ao formatar código.",
    };
  }
}

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "property"
  | "function"
  | "tag"
  | "punctuation";

export interface CodeToken {
  type: TokenType;
  text: string;
}

const KEYWORDS = new Set([
  // JS / TS
  "const", "let", "var", "function", "return", "import", "export", "from", "default",
  "as", "async", "await", "if", "else", "for", "while", "do", "switch", "case", "break",
  "continue", "try", "catch", "finally", "throw", "new", "class", "interface", "type",
  "enum", "extends", "implements", "typeof", "keyof", "in", "of", "instanceof", "void",
  "true", "false", "null", "undefined", "this", "super", "static", "readonly", "public",
  "private", "protected", "declare", "module",
  // Python / Go / Java / Rust
  "def", "elif", "lambda", "with", "yield", "pass", "raise", "except", "None", "True",
  "False", "self", "print", "package", "func", "struct", "fn", "mut", "pub", "impl",
  "match", "use", "final", "abstract",
  // SQL
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "CREATE", "TABLE", "DROP", "ALTER", "JOIN", "LEFT", "RIGHT", "INNER", "ON", "AND",
  "OR", "NOT", "ORDER", "BY", "GROUP", "LIMIT", "AS", "DISTINCT",
  "select", "from", "where", "insert", "into", "values", "update", "set", "delete",
  "create", "table", "drop", "alter", "join", "left", "right", "inner", "on", "and",
  "or", "not", "order", "by", "group", "limit", "distinct",
]);

const HASH_COMMENT_EXTS = new Set(["py", "yaml", "yml", "sh"]);
const SQL_COMMENT_EXTS = new Set(["sql"]);

/**
 * Tokenizador léxico leve e seguro (sem dangerouslySetInnerHTML) para destacar
 * sintaxe de código mantendo integridade de comentários multilinha e strings.
 */
export function tokenizeCodeLines(code: string, extension: string): CodeToken[][] {
  const ext = extension.toLowerCase();
  const useHashComment = HASH_COMMENT_EXTS.has(ext);
  const useSqlComment = SQL_COMMENT_EXTS.has(ext);

  const lines: CodeToken[][] = [[]];
  let currentLine = lines[0];

  const pushText = (type: TokenType, text: string) => {
    if (!text) return;
    const parts = text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        currentLine = [];
        lines.push(currentLine);
      }
      if (parts[i]) {
        currentLine.push({ type, text: parts[i] });
      }
    }
  };

  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];

    // Newline
    if (ch === "\n") {
      currentLine = [];
      lines.push(currentLine);
      i++;
      continue;
    }

    // HTML/XML comment <!-- ... -->
    if (ch === "<" && code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i + 4);
      const sliceEnd = end === -1 ? len : end + 3;
      pushText("comment", code.slice(i, sliceEnd));
      i = sliceEnd;
      continue;
    }

    // Block comment /* ... */
    if (ch === "/" && next === "*") {
      const end = code.indexOf("*/", i + 2);
      const sliceEnd = end === -1 ? len : end + 2;
      pushText("comment", code.slice(i, sliceEnd));
      i = sliceEnd;
      continue;
    }

    // Line comment // or # or --
    if (
      (ch === "/" && next === "/") ||
      (useHashComment && ch === "#") ||
      (useSqlComment && ch === "-" && next === "-")
    ) {
      const end = code.indexOf("\n", i);
      const sliceEnd = end === -1 ? len : end;
      pushText("comment", code.slice(i, sliceEnd));
      i = sliceEnd;
      continue;
    }

    // Strings ("...", '...', `...`)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < len) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j++;
          break;
        }
        if (quote !== "`" && code[j] === "\n") {
          break;
        }
        j++;
      }
      const literal = code.slice(i, j);
      // Detect JSON / object property string followed by :
      let k = j;
      while (k < len && (code[k] === " " || code[k] === "\t")) k++;
      const isPropertyKey = quote !== "`" && code[k] === ":";
      pushText(isPropertyKey ? "property" : "string", literal);
      i = j;
      continue;
    }

    // HTML / JSX Tag name like <div or </span
    if (ch === "<" && (/[A-Za-z/]/.test(next || ""))) {
      const match = code.slice(i).match(/^<\/?[A-Za-z][A-Za-z0-9._-]*/);
      if (match) {
        pushText("tag", match[0]);
        i += match[0].length;
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      const match = code.slice(i).match(/^(?:0x[0-9a-fA-F]+|[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)/);
      if (match) {
        pushText("number", match[0]);
        i += match[0].length;
        continue;
      }
    }

    // Identifiers / Keywords / Types / Properties / Functions
    if (/[A-Za-z_$@]/.test(ch)) {
      const match = code.slice(i).match(/^[A-Za-z_$@][A-Za-z0-9_$-]*/);
      if (match) {
        const word = match[0];
        const afterIdx = i + word.length;
        let k = afterIdx;
        while (k < len && (code[k] === " " || code[k] === "\t")) k++;

        if (KEYWORDS.has(word)) {
          pushText("keyword", word);
        } else if (code[k] === ":" && ext !== "py") {
          pushText("property", word);
        } else if (code[k] === "(") {
          pushText("function", word);
        } else if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) {
          pushText("type", word);
        } else {
          pushText("plain", word);
        }
        i += word.length;
        continue;
      }
    }

    // Punctuation / Operators
    if (/[{}()[\].,:;+\-*/%=<>!&|?~^]/.test(ch)) {
      pushText("punctuation", ch);
      i++;
      continue;
    }

    // Whitespace / other characters
    const wsMatch = code.slice(i).match(/^[ \t]+/);
    if (wsMatch) {
      pushText("plain", wsMatch[0]);
      i += wsMatch[0].length;
      continue;
    }

    pushText("plain", ch);
    i++;
  }

  return lines;
}
