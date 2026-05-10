import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { LanguagePrompt } from "@/components/layout/LanguagePrompt";
import { SupportChat } from "@/components/layout/SupportChat";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ReelBit — Launch Slot Tokens on Solana",
  description: "Launch your slot machine token for free. Graduate to the casino at $100k mcap.",
  openGraph: { title: "ReelBit.fun", description: "Pump.fun meets Vegas. On Solana." },
  manifest: "/manifest.json",
  themeColor: "#c41e1e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReelBit",
  },
  icons: {
    icon:    "/logo-icon.png",
    apple:   "/logo-icon.png",
    shortcut: "/logo-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('rb_theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      <body className="casino-bg min-h-screen antialiased flex flex-col">
        <div className="orb w-[600px] h-[600px] top-[-200px] left-[-200px]" style={{ background: "rgba(196,30,30,0.07)", animationDelay: "0s" }} />
        <div className="orb w-[400px] h-[400px] bottom-[10%] right-[-100px]" style={{ background: "rgba(139,0,0,0.05)", animationDelay: "4s" }} />
        <div className="orb w-[300px] h-[300px] top-[40%] left-[60%]" style={{ background: "rgba(196,30,30,0.03)", animationDelay: "8s" }} />

        {/* Google Translate element (hidden — driven by LanguageSelector) */}
        <div id="google_translate_element" className="hidden" />

        <Providers>
          <ThemeProvider>
            <Navbar />
            <main className="relative z-10 flex-1">{children}</main>
            <Footer />
            <LanguagePrompt />
            <SupportChat />
            <Toaster
              position="bottom-right"
              theme="dark"
              richColors
              toastOptions={{ className: "font-rajdhani" }}
            />
          </ThemeProvider>
        </Providers>

        {/* Google Translate scripts */}
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
