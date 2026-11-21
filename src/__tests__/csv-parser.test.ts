import { describe, expect, it } from "vitest";
import { parseCsvRows } from "@/lib/csv-parser";

describe("CsvTableViewer parseCsvRows", () => {
  it("faz parsing de CSV padrão separado por vírgula e campos com aspas", () => {
    const csv = 'Nome,Nota,Observacao\n"Ana, Maria",9.5,"Apresentou ""muito bem"""\nBruno,8.0,OK';
    const rows = parseCsvRows(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["Nome", "Nota", "Observacao"]);
    expect(rows[1]).toEqual(["Ana, Maria", "9.5", 'Apresentou "muito bem"']);
    expect(rows[2]).toEqual(["Bruno", "8.0", "OK"]);
  });

  it("detecta automaticamente separador ponto-e-vírgula (padrão Excel PT-BR)", () => {
    const csv = "Semestre;Grupo;Media\n2026.2;Smart Campus;9,2";
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      ["Semestre", "Grupo", "Media"],
      ["2026.2", "Smart Campus", "9,2"],
    ]);
  });
});
