import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "ReelBit Casino — Provably Fair Slots on Solana",
  description: "Play provably fair slot machines on Solana. Up to 98% RTP. Deposit SOL and spin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('rb_theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      <body className="casino-bg antialiased flex flex-col min-h-screen">
        <div id="google_translate_element" className="hidden" />

        <Providers>
          <ThemeProvider>
            <Navbar />
            <main className="pt-14 flex-1">{children}</main>
            <Footer />
          </ThemeProvider>
        </Providers>

        <Script
          id="google-translate-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.googleTranslateElementInit = function() {
                new window.google.translate.TranslateElement({
                  pageLanguage: 'en',
                  includedLanguages: 'en,es,pt,zh-CN,ja,ko,ru,ar,fr,de,tr,vi',
                  autoDisplay: false
                }, 'google_translate_element');
              };
            `,
          }}
        />
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
