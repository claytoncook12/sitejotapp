export function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="70" height="80" rx="8" fill="#334155"/>
                <rect x="25" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="55" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="25" y="30" width="50" height="6" rx="2" fill="#fbbf24"/>
                <rect x="25" y="45" width="40" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="58" width="45" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="71" width="35" height="5" rx="2" fill="#94a3b8"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">SiteJot</span>
          </a>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#problem" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">The Problem</a>
            <a href="#features" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">How It Works</a>
            <button
              onClick={() => onNavigate("/signin")}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Login
            </button>
          </div>
          <button
            onClick={() => onNavigate("/signin")}
            className="sm:hidden bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-400/50 px-3 py-1.5 rounded mb-8">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          Built for field engineers
        </span>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
          Site visits.<br />
          <span className="text-amber-500">Documented.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          Engineers spend hours on-site but observations get lost in notebooks, buried in emails, or stuck in unfinished reports. SiteJot changes that — fast capture, effortless sharing, professional documentation.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-10">
          <button
            onClick={() => onNavigate("/signup")}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            Start for Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
          <a href="#how" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
            See how it works
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </a>
        </div>
      </section>

      {/* STATS */}
      <div className="bg-slate-800 dark:bg-slate-800 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap justify-center gap-12 sm:gap-20">
          {[
            { num: "10×", label: "Faster documentation" },
            { num: "100%", label: "Field-ready on any device" },
            { num: "0", label: "Lost observations" },
            { num: "1-click", label: "Report sharing" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span className="block text-2xl sm:text-3xl font-bold text-amber-400">{s.num}</span>
              <span className="block text-xs uppercase tracking-wider text-slate-400 mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28" id="problem">
        <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4 block">The problem</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Your field data<br />deserves better.
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
          Engineers do critical work on-site. But the tools for capturing that work haven't kept up. The result? Valuable observations disappear.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          {[
            {
              icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-0.01M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
              title: "Observations get lost",
              desc: "Field notes written in notebooks or on scraps of paper disappear, get damaged, or are simply never transcribed into anything useful.",
            },
            {
              icon: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></>,
              title: "Hard to share",
              desc: "Photos are on one phone, notes are in another app, and the report is a half-finished Word doc. Getting everything to your team or client is painful.",
            },
            {
              icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
              title: "Reports take forever",
              desc: "Turning raw site notes into a professional report takes hours of reformatting, chasing down photos, and trying to remember what you actually saw.",
            },
          ].map((card) => (
            <div key={card.title} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md dark:hover:border-slate-600 transition-all">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{card.icon}</svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28" id="features">
        <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4 block">Features</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Everything you need.<br />Nothing you don't.
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
          {/* Feature list */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
            {[
              { num: "01", title: "Fast Capture", desc: "Log observations in seconds. Designed to work in the field — even with gloves on, in the sun, or in a rush." },
              { num: "02", title: "Photos & Video", desc: "Attach images and videos directly to any observation. Everything stays organized, tagged, and findable." },
              { num: "03", title: "One-Click Reports", desc: "Generate a clean, professional report with a single tap. Share via link or export to PDF instantly." },
              { num: "04", title: "Easy to Learn", desc: "No training required. If you've used a notes app, you already know how to use SiteJot." },
              { num: "05", title: "Team Sharing", desc: "Instantly share visits with colleagues or clients. Everyone sees the same information in real time." },
            ].map((f) => (
              <div key={f.num} className="flex gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 pt-0.5 min-w-[28px]">{f.num}</span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mockup */}
          <div className="bg-slate-800 dark:bg-slate-800 rounded-lg p-5 border border-slate-700 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-xs text-slate-500 ml-2 tracking-wide">site-visit / my-visits</span>
            </div>

            {[
              { name: "Riverside Bridge Inspection", tag: "Active", tagColor: "bg-amber-400/20 text-amber-400", meta: "Mar 04, 2026 · Unit 7, South span", obs: "Visible crack in west abutment, approx 4mm wide. No evidence of recent movement. Monitor next quarter.", photos: true },
              { name: "Warehouse Roof Survey", tag: "Done", tagColor: "bg-green-400/20 text-green-400", meta: "Feb 28, 2026 · Building C", obs: "Ponding observed on NW corner. Drainage outlet partially blocked. Membrane intact.", photos: false },
              { name: "Highway Expansion Joint", tag: "Review", tagColor: "bg-blue-400/20 text-blue-400", meta: "Feb 22, 2026 · Segment D–F", obs: null, photos: false },
            ].map((v) => (
              <div key={v.name} className="bg-white/5 border border-white/10 rounded-md p-4 mb-2.5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-white">{v.name}</span>
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${v.tagColor}`}>{v.tag}</span>
                </div>
                <span className="text-xs text-slate-500">{v.meta}</span>
                {v.obs && (
                  <div className="mt-2.5 p-2.5 bg-white/5 border-l-2 border-amber-400 rounded-sm">
                    <p className="text-xs text-slate-400 leading-relaxed">{v.obs}</p>
                  </div>
                )}
                {v.photos && (
                  <div className="flex gap-1.5 mt-2.5">
                    <div className="w-12 h-9 rounded bg-amber-400/15 flex items-center justify-center text-sm">📷</div>
                    <div className="w-12 h-9 rounded bg-teal-400/10 flex items-center justify-center text-sm">📷</div>
                    <div className="w-12 h-9 rounded bg-purple-400/10 flex items-center justify-center text-sm">📷</div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-2.5 p-3 border border-dashed border-white/15 rounded mt-3 hover:border-amber-400/50 transition-colors cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="text-xs text-slate-500">New site visit...</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="bg-slate-800 dark:bg-slate-800 border-y border-slate-700" id="how">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <span className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-4 block">How it works</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-12">On-site in 4 steps.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: "01", title: "Open a Visit", desc: "Create a new site visit in seconds. Name it, tag the location, and you're ready to document." },
              { num: "02", title: "Log Observations", desc: "Type or voice-record observations as you walk. Attach photos and videos on the spot." },
              { num: "03", title: "Review & Annotate", desc: "Add notes, mark priorities, and organize your findings before you leave the site." },
              { num: "04", title: "Share the Report", desc: "Generate a professional report instantly. Send a link or export a PDF — done before you're in the car." },
            ].map((s) => (
              <div key={s.num} className="bg-slate-900/50 rounded-lg p-6 hover:bg-slate-900/80 transition-colors">
                <span className="block text-3xl font-bold text-amber-400/20 mb-4">{s.num}</span>
                <h4 className="text-sm font-semibold text-white mb-2">{s.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="bg-slate-800 dark:bg-slate-800 rounded-lg p-12 sm:p-16 text-center relative overflow-hidden border border-slate-700">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
          <span className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-6 block">Ready to get started?</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-5">
            Your next site visit,<br />fully documented.
          </h2>
          <p className="text-base text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
            Join engineers who've replaced lost notebooks and endless report-writing with something that actually works.
          </p>
          <button
            onClick={() => onNavigate("/signup")}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
          >
            Start Using SiteJot
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-slate-400">© 2026 SiteJot. All rights reserved.</span>
          <div className="flex gap-6 hidden">
            <a href="#" className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
