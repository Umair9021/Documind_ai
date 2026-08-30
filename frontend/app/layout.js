import "./globals.css";
import { ThemeProvider } from "../lib/theme";

export const metadata = {
  title: "DocuMind AI — Private Multi-Source Knowledge & RAG Platform",
  description: "Turn your knowledge into an AI you can ask anything. Upload documents, add YouTube videos, and ask questions using grounded Retrieval-Augmented Generation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
