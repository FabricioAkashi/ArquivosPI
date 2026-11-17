import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acervo PI — Visualizador de Projetos Acadêmicos",
  description:
    "Portal minimalista para visualização e apresentação de arquivos de Projeto Integrador por semestre.",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('pi-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
        {children}
      </body>
    </html>
  );
}
