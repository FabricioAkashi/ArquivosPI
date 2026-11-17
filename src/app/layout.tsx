import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acervo PI — Acervo Digital do Projeto Integrador",
  description:
    "Portal minimalista para visualização e apresentação de projetos acadêmicos e relatórios de Projeto Integrador por semestre.",
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
      <body className="font-sans antialiased selection:bg-[#c96726] selection:text-white dark:selection:bg-[#d77435] dark:selection:text-white">
        {children}
      </body>
    </html>
  );
}
