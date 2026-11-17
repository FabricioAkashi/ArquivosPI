# Acervo PI — Visualizador de Projetos Acadêmicos

Website minimalista para organizar, visualizar e apresentar arquivos de Projeto Integrador (PI) divididos por semestres, com suporte a compartilhamento por **QR Code** e temas **claro/escuro**.

## Recursos

- **Visualização direta no navegador** (desktop e celular):
  - **PDF** (`pdfjs-dist` integrado para funcionar também no celular ao escanear o QR Code, além de opção para visualizador nativo)
  - **Imagens** (`PNG`, `JPG`, `JPEG`, `WEBP`, `GIF`, `SVG`) com zoom, rotação e fundo de contraste
  - **Word** (`.docx`) renderizado no navegador
  - **PowerPoint** (`.pptx`) com navegação de slides, teclado (`←` / `→`) e opção Office Online quando hospedado
  - **Texto / Código / Markdown** (`.txt`, `.md`, `.json`, `.csv`, `.py`, `.js`, etc.) e **Vídeos/Áudios** (`.mp4`, `.mp3`)
- **Divisão por Semestres**: crie e edite semestres (`2026.1`, `2026.2`, etc.) com título e descrição do projeto.
- **Drag-and-Drop**: arraste múltiplos arquivos diretamente para a página quando o modo de edição estiver desbloqueado.
- **Modo Apresentação**: tela cheia (`F`), navegação entre arquivos e cronômetro discreto integrado.
- **Gerador de QR Code integrado**: gere e baixe o QR Code em PNG apontando direto para o semestre ou para um arquivo específico.
- **Proteção por PIN**: visitantes que acessam via QR Code só visualizam os arquivos; uploads e exclusões exigem desbloqueio por PIN.

## Executando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Por padrão, o PIN de edição é **`1234`**. Os arquivos locais ficam salvos na pasta `./data/`.

## Configuração de ambiente (`.env.local`)

Crie um arquivo `.env.local` baseado no `.env.example`:

```env
ADMIN_PIN=seu_pin_seguro
AUTH_SECRET=uma_chave_secreta_aleatoria
```

## Como hospedar na Vercel (gratuito)

1. Suba este repositório para o GitHub e importe na [Vercel](https://vercel.com).
2. No painel do projeto na Vercel, vá em **Storage → Create Database → Blob** e conecte um **Vercel Blob** (a variável `BLOB_READ_WRITE_TOKEN` será adicionada automaticamente).
3. Em **Settings → Environment Variables**, adicione `ADMIN_PIN` e `AUTH_SECRET`.
4. Faça o deploy. O sistema detecta automaticamente o `BLOB_READ_WRITE_TOKEN` e passa a armazenar todos os arquivos na nuvem!

> **Alternativa (Render / Railway / VPS):** se preferir hospedar em um servidor Node com disco persistente, basta montar um volume na pasta `/app/data` e rodar `npm run build && npm start` (sem precisar configurar o Vercel Blob).
