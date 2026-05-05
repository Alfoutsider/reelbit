import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { GraduationPill } from "@/components/layout/GraduationPill";

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
        <div className="orb w-[600px] h-[600px] top-[-200px] right-[-150px]" style={{ background: "rgba(212,160,23,0.06)", animationDelay: "0s" }} />
        <div className="orb w-[400px] h-[400px] bottom-[15%] left-[-100px]" style={{ background: "rgba(160,120,16,0.04)", animationDelay: "5s" }} />
        <div id="google_translate_element" className="hidden" />

        <Providers>
          <ThemeProvider>
            <Navbar />
            <GraduationPill />
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
                // Auto-detect browser language on first visit
                try {
                  if (!localStorage.getItem('rb_gt_init')) {
                    localStorage.setItem('rb_gt_init', '1');
                    var lang = (navigator.language || 'en').split('-')[0].toLowerCase();
                    var supported = ['es','pt','zh','ja','ko','ru','ar','fr','de','tr','vi'];
                    if (lang !== 'en' && supported.indexOf(lang) !== -1) {
                      setTimeout(function() {
                        var code = lang === 'zh' ? 'zh-CN' : lang;
                        var sel = document.querySelector('.goog-te-combo');
                        if (sel) { sel.value = code; sel.dispatchEvent(new Event('change')); }
                      }, 1500);
                    }
                  }
                } catch(e) {}
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
