import Link from "next/link";
export const metadata = { title: "AML Policy — ReelBit Casino" };
export default function AMLPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Anti-Money Laundering Policy</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.casino</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>1. Purpose</h2>
            <p>
              ReelBit Casino is committed to preventing money laundering, terrorist financing, and other financial crimes. This policy outlines our procedures to detect, prevent, and report suspicious activity.
            </p>
          </section>

          <section>
            <h2>2. Prohibited Activities</h2>
            <p>The Casino must not be used for:</p>
            <ul>
              <li>Depositing funds derived from criminal activity.</li>
              <li>Layering transactions to obscure the origin of funds.</li>
              <li>Structuring deposits to evade reporting thresholds.</li>
              <li>Transactions on behalf of sanctioned individuals or entities.</li>
              <li>Any activity that violates FATF recommendations or applicable national law.</li>
            </ul>
          </section>

          <section>
            <h2>3. Know Your Customer (KYC)</h2>
            <p>
              ReelBit Casino uses a risk-based approach to customer due diligence. At minimum, we verify wallet addresses against sanctions lists. Enhanced due diligence (including source of funds verification) may be required in the following cases:
            </p>
            <ul>
              <li>Cumulative deposits exceeding $10,000 USD equivalent within 30 days.</li>
              <li>Unusual transaction patterns inconsistent with stated purpose.</li>
              <li>Deposits from wallets flagged by on-chain analytics tools.</li>
              <li>Players identified as Politically Exposed Persons (PEPs).</li>
              <li>Any transaction that triggers suspicion for any reason.</li>
            </ul>
            <p>
              Players subject to enhanced due diligence will be contacted at the email address associated with their account. Failure to provide requested documentation within 14 days will result in account suspension.
            </p>
          </section>

          <section>
            <h2>4. On-Chain Analytics</h2>
            <p>
              All deposit wallet addresses are screened against blockchain analytics databases to identify wallets associated with:
            </p>
            <ul>
              <li>OFAC-sanctioned entities</li>
              <li>Known darknet markets or mixers</li>
              <li>Ransomware or hack proceeds</li>
              <li>High-risk exchanges or services</li>
            </ul>
            <p>Deposits from flagged addresses will be held pending investigation and may be returned or reported to relevant authorities.</p>
          </section>

          <section>
            <h2>5. Transaction Monitoring</h2>
            <p>Our systems automatically flag the following for manual review:</p>
            <ul>
              <li>Rapid deposit-and-withdrawal sequences with minimal gameplay.</li>
              <li>Multiple accounts depositing to the same destination wallet.</li>
              <li>Deposits significantly exceeding the player's established betting patterns.</li>
              <li>Any pattern consistent with "chip dumping" or collusion.</li>
            </ul>
          </section>

          <section>
            <h2>6. Suspicious Activity Reporting</h2>
            <p>
              Where we identify suspicious activity, we will file a Suspicious Activity Report (SAR) with the appropriate authority without notifying the customer ("tipping off"). We cooperate fully with law enforcement requests and court orders.
            </p>
          </section>

          <section>
            <h2>7. Record Keeping</h2>
            <p>
              We retain records of all customer due diligence, transactions, and SARs for a minimum of 7 years in compliance with FATF Recommendation 11 and applicable national laws.
            </p>
          </section>

          <section>
            <h2>8. Staff Training</h2>
            <p>
              All personnel with access to financial data undergo AML awareness training annually.
            </p>
          </section>

          <section>
            <h2>9. Sanctions Compliance</h2>
            <p>
              ReelBit does not conduct business with individuals or entities on the OFAC SDN list, UN Security Council sanctions lists, or EU consolidated sanctions list. Our platform is not available in embargoed countries.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              AML Compliance Officer: <a href="mailto:compliance@reelbit.casino" className="text-white/60 hover:text-white underline">compliance@reelbit.casino</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/30 font-orbitron">
          <Link href="/terms"                className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/privacy"              className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/responsible-gambling" className="hover:text-white/60 transition-colors">Responsible Gambling</Link>
          <Link href="/"                     className="hover:text-white/60 transition-colors ml-auto">← Back to Casino</Link>
        </div>
      </div>
    </div>
  );
}
