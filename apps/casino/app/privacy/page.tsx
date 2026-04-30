import Link from "next/link";

export const metadata = { title: "Privacy Policy — ReelBit Casino" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.casino</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>1. Data Controller</h2>
            <p>ReelBit operates ReelBit.casino. For privacy enquiries, contact <a href="mailto:privacy@reelbit.casino" className="text-white/60 hover:text-white underline">privacy@reelbit.casino</a>.</p>
          </section>

          <section>
            <h2>2. Data We Collect</h2>
            <h3>Identity & Account Data</h3>
            <ul>
              <li><strong>Wallet address</strong> — your public Solana address, used as your account identifier.</li>
              <li><strong>Email address</strong> — if you register with email via Privy, used only for authentication.</li>
              <li><strong>Username and avatar</strong> — profile data you voluntarily provide.</li>
            </ul>
            <h3>Gaming & Financial Data</h3>
            <ul>
              <li><strong>Deposit and withdrawal records</strong> — amounts, timestamps, transaction signatures.</li>
              <li><strong>Betting history</strong> — every spin amount, outcome, and payout. Required for provably fair verification and dispute resolution.</li>
              <li><strong>Balance records</strong> — playable balance, bonus balance, wagering progress.</li>
            </ul>
            <h3>Technical Data</h3>
            <ul>
              <li><strong>IP address</strong> — used for jurisdiction verification and fraud prevention. Hashed before storage.</li>
              <li><strong>Session data</strong> — login timestamps, session duration.</li>
              <li><strong>Device information</strong> — browser type, operating system (via standard server logs).</li>
            </ul>
          </section>

          <section>
            <h2>3. Legal Basis for Processing (GDPR)</h2>
            <ul>
              <li><strong>Contract performance</strong> — processing bets, deposits, withdrawals, and bonus calculations.</li>
              <li><strong>Legal obligation</strong> — AML checks, jurisdiction verification, record-keeping.</li>
              <li><strong>Legitimate interests</strong> — fraud prevention, security, abuse detection.</li>
              <li><strong>Consent</strong> — optional communications and analytics.</li>
            </ul>
          </section>

          <section>
            <h2>4. Anti-Money Laundering Requirements</h2>
            <p>
              As a gambling platform we are required to apply risk-based AML procedures. This may include verifying the source of funds for large deposits or unusual activity patterns. See our <Link href="/aml" className="text-white/60 hover:text-white underline">AML Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2>5. Third-Party Processors</h2>
            <ul>
              <li><strong>Privy</strong> — wallet connection and authentication. <a href="https://www.privy.io/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">Privy Privacy Policy</a>.</li>
              <li><strong>Supabase</strong> — secure database for account and gaming records. EU-hosted.</li>
              <li><strong>Helius</strong> — Solana blockchain data and RPC services.</li>
              <li><strong>Vercel</strong> — application hosting and CDN.</li>
              <li><strong>Jupiter</strong> — SOL/USDC swaps for deposits. No personal data transmitted.</li>
            </ul>
          </section>

          <section>
            <h2>6. Blockchain Transparency</h2>
            <p>
              All on-chain transactions (SOL deposits, USDC withdrawals) are permanently and publicly recorded on the Solana blockchain. This is inherent to blockchain technology and cannot be reversed or deleted. Game outcomes are also published on-chain for provably fair verification.
            </p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <ul>
              <li><strong>Account data</strong> — retained while account is active + 5 years after closure (legal requirement).</li>
              <li><strong>Gaming history</strong> — retained for 5 years for regulatory and dispute purposes.</li>
              <li><strong>Financial records</strong> — 7 years minimum (AML regulatory requirement).</li>
              <li><strong>Technical logs</strong> — 90 days, then anonymized.</li>
            </ul>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access a copy of the data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion (subject to AML and legal retention obligations).</li>
              <li>Object to marketing communications.</li>
              <li>Lodge a complaint with your national data protection authority.</li>
            </ul>
            <p>Submit requests to <a href="mailto:privacy@reelbit.casino" className="text-white/60 hover:text-white underline">privacy@reelbit.casino</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2>9. Security</h2>
            <p>
              We implement industry-standard security including encrypted databases, access controls, and regular security reviews. No online system is 100% secure. We will notify you of any data breach that materially affects your rights within 72 hours of discovery, as required by GDPR.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p><a href="mailto:privacy@reelbit.casino" className="text-white/60 hover:text-white underline">privacy@reelbit.casino</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/30 font-orbitron">
          <Link href="/terms"   className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-white/60 transition-colors">Cookie Policy</Link>
          <Link href="/aml"     className="hover:text-white/60 transition-colors">AML Policy</Link>
          <Link href="/"        className="hover:text-white/60 transition-colors ml-auto">← Back to Casino</Link>
        </div>
      </div>
    </div>
  );
}
