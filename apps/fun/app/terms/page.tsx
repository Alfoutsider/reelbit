import Link from "next/link";

export const metadata = { title: "Terms of Service — ReelBit.fun" };

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Terms of Service</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.fun</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using ReelBit.fun ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Platform. These Terms constitute a legally binding agreement between you and ReelBit ("we", "us", or "our").
            </p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>You must be at least 18 years of age to use the Platform. By using ReelBit.fun, you represent and warrant that:</p>
            <ul>
              <li>You are at least 18 years old.</li>
              <li>You have the legal capacity to enter into binding contracts.</li>
              <li>You are not located in, or a citizen or resident of, any jurisdiction where use of this Platform is prohibited by law.</li>
              <li>You are not using the Platform on behalf of any sanctioned entity or person.</li>
            </ul>
            <p>
              The Platform is not available to residents of the United States, North Korea, Iran, Cuba, Syria, or any other jurisdiction where participation in token launches or cryptocurrency activities is restricted or prohibited.
            </p>
          </section>

          <section>
            <h2>3. Platform Description</h2>
            <p>
              ReelBit.fun is a decentralized token launch platform built on the Solana blockchain. The Platform enables users to create and trade SPL tokens with a slot machine aesthetic, progressing along a bonding curve. Tokens that reach the graduation threshold (85 SOL liquidity) are listed on the ReelBit Casino.
            </p>
            <p>
              The Platform is non-custodial — we do not hold your assets. All transactions are executed on-chain and are irreversible. We are not responsible for losses arising from your own transactions.
            </p>
          </section>

          <section>
            <h2>4. Risk Disclosures</h2>
            <p>Token trading involves substantial risk of loss. You acknowledge that:</p>
            <ul>
              <li>Token values can go to zero. Tokens launched on this Platform are speculative assets with no guaranteed value.</li>
              <li>Bonding curve markets can be highly volatile. Early participants may profit at the expense of later participants.</li>
              <li>Smart contract bugs, hacks, or exploits could result in total loss of funds.</li>
              <li>Regulatory changes could affect the legality and value of tokens.</li>
              <li>You should only invest funds you can afford to lose entirely.</li>
            </ul>
          </section>

          <section>
            <h2>5. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform to launder money or finance illegal activities.</li>
              <li>Create tokens that constitute securities offerings without appropriate registration.</li>
              <li>Engage in wash trading, pump-and-dump schemes, or market manipulation.</li>
              <li>Attempt to exploit, hack, or disrupt the Platform or its smart contracts.</li>
              <li>Create tokens with names, symbols, or images that infringe third-party intellectual property.</li>
              <li>Use bots or automated tools to gain an unfair advantage, except where explicitly permitted.</li>
            </ul>
          </section>

          <section>
            <h2>6. Fees</h2>
            <p>
              The Platform charges a transaction fee on trades (included in the bonding curve mechanics). Fees are transparently applied at the smart contract level. We reserve the right to adjust fee structures with reasonable notice.
            </p>
          </section>

          <section>
            <h2>7. Intellectual Property</h2>
            <p>
              The ReelBit brand, interface, and original content are owned by ReelBit. You retain ownership of any content you upload (images, names) but grant us a non-exclusive license to display it on the Platform. You represent that you have the right to use any content you upload and that it does not infringe third-party rights.
            </p>
          </section>

          <section>
            <h2>8. Referral Program</h2>
            <p>
              The referral program awards points for qualifying activity introduced by your referral link. Points are not transferable, have no cash value, and may be used for future Platform benefits at our discretion. We reserve the right to invalidate referrals obtained through fraud, bots, or manipulation.
            </p>
          </section>

          <section>
            <h2>9. Disclaimer of Warranties</h2>
            <p>
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. USE OF THE PLATFORM IS AT YOUR SOLE RISK.
            </p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REELBIT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM. OUR AGGREGATE LIABILITY SHALL NOT EXCEED $100 USD.
            </p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold ReelBit harmless from any claims, damages, or expenses (including attorneys' fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2>12. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which ReelBit is incorporated, without regard to conflict of law principles. Any disputes shall be resolved by binding arbitration on an individual basis. You waive any right to participate in class-action lawsuits.
            </p>
          </section>

          <section>
            <h2>13. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms. We will notify users of material changes via the Platform interface.
            </p>
          </section>

          <section>
            <h2>14. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@reelbit.fun" className="text-white/60 hover:text-white underline">legal@reelbit.fun</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex gap-4 text-xs text-white/30 font-orbitron">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-white/60 transition-colors">Cookie Policy</Link>
          <Link href="/"        className="hover:text-white/60 transition-colors ml-auto">← Back to Platform</Link>
        </div>
      </div>
    </div>
  );
}
