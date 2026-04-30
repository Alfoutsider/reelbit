import Link from "next/link";
export const metadata = { title: "Responsible Gambling — ReelBit Casino" };
export default function ResponsibleGamblingPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="font-orbitron text-[10px] text-white/30 tracking-widest mb-2">PLAYER SAFETY</p>
          <h1 className="font-orbitron text-3xl font-black text-white mb-3">Responsible Gambling</h1>
          <p className="text-white/40 text-sm font-rajdhani">ReelBit Casino is committed to promoting safe and responsible gambling.</p>
        </div>

        {/* Crisis banner */}
        <div className="mb-8 rounded-2xl border border-red-500/20 p-5" style={{ background: "rgba(239,68,68,0.06)" }}>
          <p className="font-orbitron text-sm font-bold text-red-400 mb-2">Need Help Now?</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "BeGambleAware",     href: "https://www.begambleaware.org",  phone: "0808 8020 133" },
              { name: "GamCare",           href: "https://www.gamcare.org.uk",     phone: "0808 8020 133" },
              { name: "Gambling Therapy",  href: "https://www.gamblingtherapy.org", phone: "Online only" },
            ].map(({ name, href, phone }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                className="block rounded-xl p-3 border border-red-500/15 hover:border-red-500/30 transition-all">
                <p className="font-orbitron text-[11px] font-bold text-white/70">{name}</p>
                <p className="text-red-400/70 text-xs font-rajdhani mt-0.5">{phone}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="prose-legal space-y-8 text-white/70 font-rajdhani text-[15px] leading-relaxed">

          <section>
            <h2>Gambling Should Be Entertainment</h2>
            <p>
              Gambling is a form of entertainment. For most people it is enjoyable and harmless when done in moderation. However, for some it can become problematic. We take our responsibility to protect players seriously.
            </p>
          </section>

          <section>
            <h2>Signs of Problem Gambling</h2>
            <p>You may have a gambling problem if you:</p>
            <ul>
              <li>Spend more than you can afford to lose.</li>
              <li>Chase losses by continuing to play after losing.</li>
              <li>Gamble to escape stress, anxiety, or depression.</li>
              <li>Lie to friends or family about the amount you gamble.</li>
              <li>Neglect work, study, or family because of gambling.</li>
              <li>Feel anxious, irritable, or restless when not gambling.</li>
              <li>Borrow money or sell possessions to fund gambling.</li>
            </ul>
          </section>

          <section>
            <h2>Tools Available to You</h2>
            <h3>Self-Exclusion</h3>
            <p>
              You can permanently exclude yourself from ReelBit Casino by emailing <a href="mailto:safety@reelbit.casino" className="text-white/60 hover:text-white underline">safety@reelbit.casino</a> with the subject "SELF-EXCLUSION REQUEST". We will close your account within 24 hours and you will not be able to reopen it.
            </p>
            <h3>Bonus Forfeit</h3>
            <p>
              If you wish to withdraw funds but have an active welcome bonus, you can forfeit the bonus at any time via the wallet panel → "Forfeit Bonus". This immediately unlocks your deposited funds for withdrawal.
            </p>
            <h3>Auto-Spin Limits</h3>
            <p>
              Set a fixed number of auto-spins (10, 25, 50, or 100) rather than using infinite mode. Press STOP at any time to cancel.
            </p>
            <h3>Take a Break</h3>
            <p>
              Simply log out. Your balance is safe and will be waiting when you return — there is no time pressure.
            </p>
          </section>

          <section>
            <h2>Our Commitments</h2>
            <ul>
              <li>We do not allow users under 18 on the platform.</li>
              <li>We do not send promotional material to self-excluded players.</li>
              <li>We do not use deceptive design to encourage excessive play.</li>
              <li>We publish our RTP rates and house edge transparently.</li>
              <li>Every spin outcome is provably fair and independently verifiable.</li>
              <li>We will cooperate with legitimate requests from third-party responsible gambling organisations.</li>
            </ul>
          </section>

          <section>
            <h2>External Resources</h2>
            <ul>
              <li><a href="https://www.begambleaware.org"   target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">BeGambleAware.org</a> — UK & international support</li>
              <li><a href="https://www.gamcare.org.uk"      target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">GamCare.org.uk</a> — free support service</li>
              <li><a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">GamblingTherapy.org</a> — online support in multiple languages</li>
              <li><a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">GamblersAnonymous.org</a> — peer support meetings</li>
              <li><a href="https://www.ncpgambling.org"     target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline">NCPG</a> — National Council on Problem Gambling (US)</li>
            </ul>
          </section>

          <section>
            <h2>Contact</h2>
            <p>Responsible gambling team: <a href="mailto:safety@reelbit.casino" className="text-white/60 hover:text-white underline">safety@reelbit.casino</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/30 font-orbitron">
          <Link href="/terms"   className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/aml"     className="hover:text-white/60 transition-colors">AML Policy</Link>
          <Link href="/"        className="hover:text-white/60 transition-colors ml-auto">← Back to Casino</Link>
        </div>
      </div>
    </div>
  );
}
