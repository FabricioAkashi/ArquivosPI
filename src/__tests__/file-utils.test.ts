import { describe, expect, it } from "vitest";
import {
  formatBytes,
  getExtension,
  getFileCategory,
  getMimeFromExtension,
  slugify,
} from "@/lib/file-utils";

describe("file-utils", () => {
  describe("getExtension", () => {
    it("deve extrair extensão em minúsculas", () => {
      expect(getExtension("relatorio.pdf")).toBe("pdf");
      expect(getExtension("SLIDES.PPTX")).toBe("pptx");
      expect(getExtension("foto.backup.final.PNG")).toBe("png");
    });

    it("deve retornar vazio quando arquivo não possui extensão", () => {
      expect(getExtension("semextensao")).toBe("");
      expect(getExtension("")).toBe("");
    });
  });

  describe("getFileCategory", () => {
    it("deve categorizar PDFs", () => {
      expect(getFileCategory("artigo.pdf")).toBe("pdf");
      expect(getFileCategory("arquivo", "application/pdf")).toBe("pdf");
    });

    it("deve categorizar imagens", () => {
      expect(getFileCategory("foto.png")).toBe("image");
      expect(getFileCategory("diagrama.jpg")).toBe("image");
      expect(getFileCategory("banner.jpeg")).toBe("image");
      expect(getFileCategory("icone.svg")).toBe("image");
      expect(getFileCategory("mockup.webp")).toBe("image");
    });

    it("deve categorizar documentos Word (.docx)", () => {
      expect(getFileCategory("documento.docx")).toBe("docx");
      expect(
        getFileCategory(
          "trabalho",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("docx");
    });

    it("deve categorizar apresentações PowerPoint (.pptx)", () => {
      expect(getFileCategory("apresentacao.pptx")).toBe("pptx");
      expect(
        getFileCategory(
          "slides",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
      ).toBe("pptx");
    });

    it("deve categorizar mídias de vídeo e áudio", () => {
      expect(getFileCategory("pitch.mp4")).toBe("video");
      expect(getFileCategory("demo.mov")).toBe("video");
      expect(getFileCategory("podcast.mp3")).toBe("audio");
      expect(getFileCategory("gravacao.wav")).toBe("audio");
    });

    it("deve categorizar arquivos de código e texto", () => {
      expect(getFileCategory("readme.md")).toBe("text");
      expect(getFileCategory("script.py")).toBe("text");
      expect(getFileCategory("dados.json")).toBe("text");
      expect(getFileCategory("planilha.csv")).toBe("text");
    });

    it("deve retornar 'other' para tipos não mapeados", () => {
      expect(getFileCategory("pacote.zip")).toBe("other");
      expect(getFileCategory("executavel.exe")).toBe("other");
    });
  });

  describe("formatBytes", () => {
    it("deve formatar 0 B e valores negativos", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(-100)).toBe("0 B");
    });

    it("deve formatar bytes em KB, MB e GB", () => {
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1048576)).toBe("1.0 MB");
      expect(formatBytes(15728640)).toBe("15 MB");
      expect(formatBytes(1073741824)).toBe("1.0 GB");
    });
  });

  describe("slugify", () => {
    it("deve normalizar texto com acentos e caracteres especiais", () => {
      expect(slugify("2026.2")).toBe("2026-2");
      expect(slugify("5º Semestre - Projeto Integrador")).toBe("5-semestre-projeto-integrador");
      expect(slugify("Engenharia de Software & IA")).toBe("engenharia-de-software-ia");
    });
  });

  describe("getMimeFromExtension", () => {
    it("deve retornar o MIME type correto para cada extensão", () => {
      expect(getMimeFromExtension("pdf")).toBe("application/pdf");
      expect(getMimeFromExtension("png")).toBe("image/png");
      expect(getMimeFromExtension("docx")).toContain("wordprocessingml");
      expect(getMimeFromExtension("pptx")).toContain("presentationml");
      expect(getMimeFromExtension("txt")).toContain("text/plain");
    });
  });
});
