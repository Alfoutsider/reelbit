import Link from "next/link";

export const metadata = { title: "Cookie Policy — ReelBit.fun" };

export default function CookiesPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Cookie Policy</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.fun</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently and to provide information to the site operators.
            </p>
          </section>

          <section>
            <h2>Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white/50 font-orbitron text-[10px] tracking-wider">Name</th>
                    <th className="text-left py-2 pr-4 text-white/50 font-orbitron text-[10px] tracking-wider">Purpose</th>
                    <th className="text-left py-2 text-white/50 font-orbitron text-[10px] tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: "privy-token",    purpose: "Authentication session (Privy)",         duration: "7 days" },
                    { name: "rb_ref",         purpose: "Referral code tracking",                 duration: "30 days" },
                    { name: "rb_theme",       purpose: "Dark/light mode preference (localStorage)", duration: "Persistent" },
                    { name: "googtrans",      purpose: "Google Translate language preference",   duration: "Session" },
                    { name: "__vercel_*",     purpose: "Vercel routing and deployment (technical)", duration: "Session" },
                  ].map(({ name, purpose, duration }) => (
                    <tr key={name}>
                      <td className="py-2.5 pr-4 font-mono text-[12px] text-white/60">{name}</td>
                      <td className="py-2.5 pr-4 text-white/50">{purpose}</td>
                      <td className="py-2.5 text-white/40">{duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Cookie Categories</h2>
            <h3>Strictly Necessary</h3>
            <p>
              Authentication cookies (privy-token) are required for the Platform to function. You cannot opt out of these without losing access to your account.
            </p>
            <h3>Functional</h3>
            <p>
              Referral cookies (rb_ref) and preference cookies (rb_theme) improve your experience. You can delete these in your browser settings without losing core functionality.
            </p>
            <h3>Third-Party</h3>
            <p>
              Google Translate sets cookies to remember your language preference. These are only active if you use the language selector. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Google's Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2>Managing Cookies</h2>
            <p>
              You can control and delete cookies through your browser settings. Note that disabling cookies may impact Platform functionality. Instructions for major browsers:
            </p>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Safari</a></li>
            </ul>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about our cookie use: <a href="mailto:privacy@reelbit.fun" className="text-white/60 hover:text-white underline">privacy@reelbit.fun</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex gap-4 text-xs text-white/30 font-orbitron">
          <Link href="/terms"   className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/"        className="hover:text-white/60 transition-colors ml-auto">← Back to Platform</Link>
        </div>
      </div>
    </div>
  );
}
