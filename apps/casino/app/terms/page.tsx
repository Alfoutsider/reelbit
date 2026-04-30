import Link from "next/link";

export const metadata = { title: "Terms of Service — ReelBit Casino" };

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">LEGAL</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Terms of Service</h1>
          <p className="text-white/40 text-sm font-rajdhani">Last updated: April 30, 2026 · ReelBit.casino</p>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>1. Acceptance & Eligibility</h2>
            <p>By accessing ReelBit Casino ("the Casino"), you agree to be bound by these Terms. You must:</p>
            <ul>
              <li>Be at least <strong>18 years of age</strong> (or the legal gambling age in your jurisdiction, whichever is higher).</li>
              <li>Not be a resident of a Restricted Jurisdiction (see Section 3).</li>
              <li>Not be classified as a problem gambler or be under a self-exclusion order.</li>
              <li>Be playing with funds you legally own and can afford to lose.</li>
            </ul>
          </section>

          <section>
            <h2>2. Nature of the Service</h2>
            <p>
              ReelBit Casino offers cryptocurrency-based provably fair slot machine games on the Solana blockchain. All game outcomes are determined server-side using verifiable random functions (VRF) and can be independently verified using the server seed hash and client seed disclosed after each session.
            </p>
            <p>
              The Casino operates using USDC (deposited by converting SOL at the current market rate). The house edge is 4% applied uniformly across all games. RTP (Return to Player) ranges from 96% to 98% depending on the slot model.
            </p>
          </section>

          <section>
            <h2>3. Restricted Jurisdictions</h2>
            <p>The Casino is NOT available to residents or citizens of:</p>
            <ul>
              <li>United States of America (including territories)</li>
              <li>United Kingdom</li>
              <li>Australia</li>
              <li>France and French territories</li>
              <li>Netherlands and Dutch territories</li>
              <li>North Korea, Iran, Cuba, Syria, Sudan</li>
              <li>Any other jurisdiction where online gambling is prohibited by law</li>
            </ul>
            <p>By using the Casino, you represent that you are not located in any Restricted Jurisdiction. Use of VPNs to circumvent geo-restrictions is a violation of these Terms and grounds for immediate account termination and forfeiture of funds.</p>
          </section>

          <section>
            <h2>4. Welcome Bonus Terms</h2>
            <p>The Welcome Bonus (100% match up to $200 USDC) is subject to the following conditions:</p>
            <ul>
              <li><strong>Wagering requirement:</strong> 45× the bonus amount must be wagered before withdrawal.</li>
              <li><strong>Maximum bet:</strong> $10 USDC per spin while the bonus is active. Exceeding this forfeits the bonus immediately.</li>
              <li><strong>Expiry:</strong> 7 days from grant. Uncompleted bonuses expire and are forfeited.</li>
              <li><strong>Withdrawal restriction:</strong> No withdrawal of funds (including your deposit) is permitted while the bonus is active. You may forfeit the bonus at any time to unlock withdrawals.</li>
              <li><strong>One per player:</strong> The bonus is granted once per wallet address. Multiple accounts to claim multiple bonuses will result in permanent ban and forfeiture.</li>
              <li>We reserve the right to modify or withdraw promotional offers at any time.</li>
            </ul>
          </section>

          <section>
            <h2>5. Deposits & Withdrawals</h2>
            <ul>
              <li>All deposits are made in SOL, converted to USDC at the prevailing market rate via Jupiter aggregator.</li>
              <li>A 0.30% deposit fee covers conversion gas costs.</li>
              <li>A flat $0.10 USDC withdrawal fee covers on-chain transaction costs.</li>
              <li>Minimum withdrawal: $1.00 USDC. Maximum: $100,000 USDC per transaction.</li>
              <li>Withdrawals are processed to the same wallet address that made the deposit.</li>
              <li>All transactions on the Solana blockchain are irreversible.</li>
            </ul>
          </section>

          <section>
            <h2>6. Responsible Gambling</h2>
            <p>We are committed to responsible gambling. The following tools are available:</p>
            <ul>
              <li><strong>Self-exclusion:</strong> Contact support to permanently exclude your account.</li>
              <li><strong>Bonus forfeit:</strong> Use the "Forfeit Bonus" option in the wallet to remove wagering restrictions at any time.</li>
              <li><strong>Auto-spin limits:</strong> Set a maximum number of auto-spins.</li>
              <li><strong>Stop on win:</strong> Use the stop button during auto-spin when a win occurs.</li>
            </ul>
            <p>If gambling is negatively affecting your life, seek help at <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">BeGambleAware.org</a> or <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">GamCare.org.uk</a>.</p>
          </section>

          <section>
            <h2>7. Prohibited Activities</h2>
            <ul>
              <li>Creating multiple accounts ("multi-accounting") to claim multiple bonuses.</li>
              <li>Using software, bots, or automated tools to gain an unfair advantage.</li>
              <li>Money laundering — playing with proceeds of crime or using the Casino to layer funds.</li>
              <li>Colluding with other players or with casino staff.</li>
              <li>Exploiting software bugs without reporting them (exploit reporting: bugs@reelbit.casino).</li>
            </ul>
            <p>Violations result in account termination, forfeiture of balance, and may be reported to relevant authorities.</p>
          </section>

          <section>
            <h2>8. Fairness & Provably Fair Verification</h2>
            <p>
              Every spin produces a server seed hash (disclosed before the spin) and a client seed (chosen by the player). After the session, the unhashed server seed is revealed. Players can independently verify any outcome using the formula disclosed on the Provably Fair section of each slot page.
            </p>
          </section>

          <section>
            <h2>9. Errors & Malfunctions</h2>
            <p>
              In the event of a software malfunction, all affected game rounds are void. Bets will be refunded. We are not liable for outcomes resulting from technical errors. Winnings obtained as a result of a software or configuration error are not valid and will not be paid.
            </p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REELBIT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE CASINO, INCLUDING GAMBLING LOSSES. YOU ACCEPT ALL RISK ASSOCIATED WITH GAMBLING.
            </p>
          </section>

          <section>
            <h2>11. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Casino after changes constitutes acceptance. Material changes will be announced via the Casino interface.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              Support: <a href="mailto:support@reelbit.casino" className="text-white/60 hover:text-white underline">support@reelbit.casino</a><br />
              Legal: <a href="mailto:legal@reelbit.casino" className="text-white/60 hover:text-white underline">legal@reelbit.casino</a><br />
              Responsible Gambling: <a href="mailto:safety@reelbit.casino" className="text-white/60 hover:text-white underline">safety@reelbit.casino</a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/30 font-orbitron">
          <Link href="/privacy"              className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/responsible-gambling" className="hover:text-white/60 transition-colors">Responsible Gambling</Link>
          <Link href="/aml"                  className="hover:text-white/60 transition-colors">AML Policy</Link>
          <Link href="/"                     className="hover:text-white/60 transition-colors ml-auto">← Back to Casino</Link>
        </div>
      </div>
    </div>
  );
}
