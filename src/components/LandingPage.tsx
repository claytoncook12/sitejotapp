import { useEffect } from "react";

function reveal() {
  const els = document.querySelectorAll(".landing-reveal");
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add("landing-visible"), i * 80);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  els.forEach((el) => obs.observe(el));
  return () => obs.disconnect();
}

export function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(reveal, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="landing-nav">
        <a className="landing-logo" href="/">
          <div className="landing-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f5f2eb" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          </div>
          SiteJot
        </a>
        <ul className="landing-nav-links">
          <li><a href="#problem">The Problem</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How It Works</a></li>
          <li>
            <button
              onClick={(e) => { e.preventDefault(); onNavigate("/signin"); }}
              className="landing-nav-cta"
            >
              Get Started
            </button>
          </li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <span className="landing-hero-badge">Built for field engineers</span>
        <h1 className="landing-hero-h1">
          Site visits.<br /><em>Documented.</em>
        </h1>
        <p className="landing-hero-sub">
          Engineers spend hours on-site but observations get lost in notebooks, buried in emails, or stuck in unfinished reports. SiteJot changes that — fast capture, effortless sharing, professional documentation.
        </p>
        <div className="landing-hero-actions">
          <button
            onClick={() => onNavigate("/signup")}
            className="landing-btn-primary"
          >
            Start for Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
          <a href="#how" className="landing-btn-secondary">
            See how it works
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </a>
        </div>
      </section>

      {/* STATS */}
      <div className="landing-stats-strip">
        <div className="landing-stat">
          <span className="landing-stat-num">10×</span>
          <span className="landing-stat-label">Faster documentation</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-num">100%</span>
          <span className="landing-stat-label">Field-ready on any device</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-num">0</span>
          <span className="landing-stat-label">Lost observations</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-num">1-click</span>
          <span className="landing-stat-label">Report sharing</span>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="landing-section" id="problem">
        <span className="landing-section-tag">The problem</span>
        <h2 className="landing-section-title">Your field data<br />deserves better.</h2>
        <p className="landing-section-body">Engineers do critical work on-site. But the tools for capturing that work haven't kept up. The result? Valuable observations disappear.</p>
        <div className="landing-problems-grid">
          <div className="landing-problem-card landing-reveal" data-num="01">
            <div className="landing-problem-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <h3>Observations get lost</h3>
            <p>Field notes written in notebooks or on scraps of paper disappear, get damaged, or are simply never transcribed into anything useful.</p>
          </div>
          <div className="landing-problem-card landing-reveal" data-num="02">
            <div className="landing-problem-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            </div>
            <h3>Hard to share</h3>
            <p>Photos are on one phone, notes are in another app, and the report is a half-finished Word doc. Getting everything to your team or client is painful.</p>
          </div>
          <div className="landing-problem-card landing-reveal" data-num="03">
            <div className="landing-problem-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h3>Reports take forever</h3>
            <p>Turning raw site notes into a professional report takes hours of reformatting, chasing down photos, and trying to remember what you actually saw.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section" id="features">
        <span className="landing-section-tag">Features</span>
        <h2 className="landing-section-title">Everything you need.<br />Nothing you don't.</h2>
        <div className="landing-features-layout">
          <div className="landing-feature-list landing-reveal">
            {[
              { num: "01", title: "Fast Capture", desc: "Log observations in seconds. Designed to work in the field — even with gloves on, in the sun, or in a rush." },
              { num: "02", title: "Photos & Video", desc: "Attach images and videos directly to any observation. Everything stays organized, tagged, and findable." },
              { num: "03", title: "One-Click Reports", desc: "Generate a clean, professional report with a single tap. Share via link or export to PDF instantly." },
              { num: "04", title: "Easy to Learn", desc: "No training required. If you've used a notes app, you already know how to use SiteJot." },
              { num: "05", title: "Team Sharing", desc: "Instantly share visits with colleagues or clients. Everyone sees the same information in real time." },
            ].map((f) => (
              <div className="landing-feature-item" key={f.num}>
                <span className="landing-feature-num">{f.num}</span>
                <div className="landing-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MOCKUP */}
          <div className="landing-mockup-panel landing-reveal">
            <div className="landing-mockup-bar">
              <div className="landing-mockup-dot" style={{ background: "#ff5f57" }} />
              <div className="landing-mockup-dot" style={{ background: "#febc2e" }} />
              <div className="landing-mockup-dot" style={{ background: "#28c840" }} />
              <span className="landing-mockup-title">site-visit / my-visits</span>
            </div>

            <div className="landing-mockup-visit">
              <div className="landing-visit-header">
                <span className="landing-visit-name">Riverside Bridge Inspection</span>
                <span className="landing-visit-tag landing-tag-active">Active</span>
              </div>
              <div className="landing-visit-meta">Mar 04, 2026 · Unit 7, South span</div>
              <div className="landing-visit-obs">
                <p className="landing-obs-text">Visible crack in west abutment, approx 4mm wide. No evidence of recent movement. Monitor next quarter.</p>
              </div>
              <div className="landing-visit-photos">
                <div className="landing-photo-thumb" style={{ background: "rgba(232,160,32,0.15)" }}>📷</div>
                <div className="landing-photo-thumb" style={{ background: "rgba(100,200,180,0.12)" }}>📷</div>
                <div className="landing-photo-thumb" style={{ background: "rgba(180,120,255,0.12)" }}>📷</div>
              </div>
            </div>

            <div className="landing-mockup-visit">
              <div className="landing-visit-header">
                <span className="landing-visit-name">Warehouse Roof Survey</span>
                <span className="landing-visit-tag landing-tag-done">Done</span>
              </div>
              <div className="landing-visit-meta">Feb 28, 2026 · Building C</div>
              <div className="landing-visit-obs">
                <p className="landing-obs-text">Ponding observed on NW corner. Drainage outlet partially blocked. Membrane intact.</p>
              </div>
            </div>

            <div className="landing-mockup-visit">
              <div className="landing-visit-header">
                <span className="landing-visit-name">Highway Expansion Joint</span>
                <span className="landing-visit-tag landing-tag-review">Review</span>
              </div>
              <div className="landing-visit-meta">Feb 22, 2026 · Segment D–F</div>
            </div>

            <div className="landing-mockup-add">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="landing-add-label">New site visit...</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="landing-how-section" id="how">
        <div className="landing-how-inner">
          <span className="landing-section-tag" style={{ color: "#e8a020" }}>How it works</span>
          <h2 className="landing-section-title" style={{ color: "#f5f2eb" }}>On-site in 4 steps.</h2>
          <div className="landing-steps-row">
            {[
              { num: "01", title: "Open a Visit", desc: "Create a new site visit in seconds. Name it, tag the location, and you're ready to document." },
              { num: "02", title: "Log Observations", desc: "Type or voice-record observations as you walk. Attach photos and videos on the spot." },
              { num: "03", title: "Review & Annotate", desc: "Add notes, mark priorities, and organize your findings before you leave the site." },
              { num: "04", title: "Share the Report", desc: "Generate a professional report instantly. Send a link or export a PDF — done before you're in the car." },
            ].map((s) => (
              <div className="landing-step landing-reveal" key={s.num}>
                <div className="landing-step-num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="landing-cta-section" id="get-started">
        <div className="landing-cta-box landing-reveal">
          <span className="landing-cta-eyebrow">Ready to get started?</span>
          <h2>Your next site visit,<br />fully documented.</h2>
          <p>Join engineers who've replaced lost notebooks and endless report-writing with something that actually works.</p>
          <button
            onClick={() => onNavigate("/signup")}
            className="landing-btn-primary"
            style={{ display: "inline-flex" }}
          >
            Start Using SiteJot
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <span className="landing-footer-copy">© 2026 SiteJot. All rights reserved.</span>
        <div className="landing-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
