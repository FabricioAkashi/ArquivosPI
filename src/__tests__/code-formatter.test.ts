import { describe, expect, it } from "vitest";
import {
  formatCodeWithPrettier,
  getCodeLanguageInfo,
  tokenizeCodeLines,
} from "@/lib/code-formatter";

describe("code-formatter", () => {
  it("identifies languages and prettier parsers correctly", () => {
    expect(getCodeLanguageInfo("app.tsx")).toMatchObject({
      extension: "tsx",
      languageLabel: "TSX / React",
      parser: "typescript",
      isCode: true,
    });
    expect(getCodeLanguageInfo("data.json")).toMatchObject({
      extension: "json",
      languageLabel: "JSON",
      parser: "json",
      isCode: true,
    });
    expect(getCodeLanguageInfo("script.py")).toMatchObject({
      extension: "py",
      languageLabel: "Python",
      parser: null,
      isCode: true,
    });
  });

  it("formats messy JavaScript and JSON cleanly with Prettier", async () => {
    const messyJs = `const   greet=(name)=>{return   'hello '+name}`;
    const jsRes = await formatCodeWithPrettier(messyJs, "index.js");
    expect(jsRes.didFormat).toBe(true);
    expect(jsRes.formatted).toContain("const greet = (name) => {");
    expect(jsRes.formatted).toContain('return "hello " + name;');

    const messyJson = `{"project":"Acervo Projeto Integrador Engenharia da Computacao","items":[1,2,3,4,5,6],"active":true}`;
    const jsonRes = await formatCodeWithPrettier(messyJson, "config.json");
    expect(jsonRes.didFormat).toBe(true);
    expect(jsonRes.formatted).toContain('\n  "project": "Acervo Projeto Integrador Engenharia da Computacao",');
  });

  it("falls back gracefully on syntax errors or unsupported parsers", async () => {
    const brokenJs = `const x = (`;
    const brokenRes = await formatCodeWithPrettier(brokenJs, "broken.js");
    expect(brokenRes.didFormat).toBe(false);
    expect(brokenRes.formatted).toBe(brokenJs);

    const pyCode = `def hello():\n  print("hi")`;
    const pyRes = await formatCodeWithPrettier(pyCode, "main.py");
    expect(pyRes.didFormat).toBe(false);
    expect(pyRes.formatted).toBe(pyCode);
  });

  it("tokenizes code into lines with syntax tokens", () => {
    const code = `// comentario\nconst total = 42;`;
    const lines = tokenizeCodeLines(code, "ts");
    expect(lines).toHaveLength(2);
    expect(lines[0][0]).toEqual({ type: "comment", text: "// comentario" });
    expect(lines[1].some((t) => t.type === "keyword" && t.text === "const")).toBe(true);
    expect(lines[1].some((t) => t.type === "number" && t.text === "42")).toBe(true);
  });
});
