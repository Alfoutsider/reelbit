import Link from "next/link";

export const metadata = { title: "Privacy Policy — ReelBit.fun" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.fun</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>1. Overview</h2>
            <p>
              ReelBit ("we", "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. By using ReelBit.fun, you agree to this policy.
            </p>
          </section>

          <section>
            <h2>2. Data We Collect</h2>
            <h3>Automatically collected</h3>
            <ul>
              <li><strong>Wallet address</strong> — your public Solana wallet address, used to identify your account and on-chain activity.</li>
              <li><strong>Transaction data</strong> — all trades, launches, and on-chain interactions. This data is public on the Solana blockchain by design.</li>
              <li><strong>Usage data</strong> — pages visited, features used, and session duration (via Vercel Analytics). This is anonymised aggregate data.</li>
              <li><strong>IP address</strong> — used for rate limiting and abuse prevention. Not stored permanently.</li>
            </ul>
            <h3>Data you provide</h3>
            <ul>
              <li><strong>Profile information</strong> — username and profile picture you choose during registration.</li>
              <li><strong>Email address</strong> — if you register via email (through Privy). Used only for authentication.</li>
              <li><strong>Token content</strong> — names, symbols, and images you upload when launching tokens.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>To operate the Platform and process your transactions.</li>
              <li>To display your profile, tokens, and portfolio.</li>
              <li>To calculate referral points and leaderboard rankings.</li>
              <li>To detect and prevent fraud, bots, and abuse.</li>
              <li>To communicate important Platform updates.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <p>We use the following third parties who may process your data:</p>
            <ul>
              <li><strong>Privy</strong> — authentication provider (wallet connection, email OTP). See <a href="https://www.privy.io/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Privy Privacy Policy</a>.</li>
              <li><strong>Helius</strong> — Solana RPC and blockchain data indexing.</li>
              <li><strong>Supabase</strong> — database hosting for profiles and off-chain data. Data is stored in the EU.</li>
              <li><strong>Vercel</strong> — hosting and CDN. May collect standard server access logs.</li>
              <li><strong>Jupiter</strong> — DEX aggregator used for token swaps (no personal data shared).</li>
            </ul>
          </section>

          <section>
            <h2>5. Blockchain Transparency</h2>
            <p>
              All on-chain activity (trades, token launches, wallet balances) is permanently and publicly visible on the Solana blockchain. We have no ability to delete or modify blockchain records. Do not conduct transactions you wish to keep private.
            </p>
          </section>

          <section>
            <h2>6. Cookies</h2>
            <p>
              We use cookies for authentication, referral tracking, and session management. See our <Link href="/cookies" className="text-white/60 hover:text-white underline">Cookie Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>
              Profile data is retained until you request deletion. Referral and points data is retained for 2 years after last activity. Blockchain data is permanent and cannot be deleted.
            </p>
          </section>

          <section>
            <h2>8. Your Rights (GDPR)</h2>
            <p>If you are located in the European Economic Area, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data (off-chain only — on-chain data is immutable).</li>
              <li>Object to or restrict processing of your data.</li>
              <li>Data portability.</li>
            </ul>
            <p>To exercise these rights, contact <a href="mailto:privacy@reelbit.fun" className="text-white/60 hover:text-white underline">privacy@reelbit.fun</a>.</p>
          </section>

          <section>
            <h2>9. Children's Privacy</h2>
            <p>
              The Platform is not intended for users under 18. We do not knowingly collect data from minors. If you believe we have collected data from a minor, contact us immediately.
            </p>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. Significant changes will be announced on the Platform. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              Privacy enquiries: <a href="mailto:privacy@reelbit.fun" className="text-white/60 hover:text-white underline">privacy@reelbit.fun</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex gap-4 text-xs text-white/30 font-orbitron">
          <Link href="/terms"   className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-white/60 transition-colors">Cookie Policy</Link>
          <Link href="/"        className="hover:text-white/60 transition-colors ml-auto">← Back to Platform</Link>
        </div>
      </div>
    </div>
  );
}
