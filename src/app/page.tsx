'use client'

import { useEffect } from 'react'
import { Fish } from 'lucide-react'

export default function LandingPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in')
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const detections = [
    { label: 'Fish 94%',         conf: 'success', sel: true,  bbox: { left: '18%', top: '24%', width: '54%', height: '50%' } },
    { label: 'Hard Coral 81%',   conf: 'warning', sel: false, bbox: { left: '22%', top: '26%', width: '48%', height: '44%' } },
    { label: 'Shark 89%',        conf: 'success', sel: false, bbox: { left: '16%', top: '20%', width: '60%', height: '56%' } },
    { label: 'Soft Coral 72%',   conf: 'warning', sel: false, bbox: { left: '25%', top: '24%', width: '44%', height: '46%' } },
    { label: 'Turtle 91%',       conf: 'success', sel: false, bbox: { left: '20%', top: '22%', width: '52%', height: '50%' } },
  ]

  const marqueeSpecies = [
    'Fish', 'Hard Coral', 'Shark', 'Soft Coral', 'Turtle',
    'Starfish', 'Jellyfish', 'Rayfish', 'Sea Anemone', 'Sea Mammals',
    'Cephalopod', 'Crustacea', 'Echinoderms', 'Bivalve',
    // duplicate for seamless loop
    'Fish', 'Hard Coral', 'Shark', 'Soft Coral', 'Turtle',
    'Starfish', 'Jellyfish', 'Rayfish', 'Sea Anemone', 'Sea Mammals',
    'Cephalopod', 'Crustacea', 'Echinoderms', 'Bivalve',
  ]

  return (
    <>
      {/* No depth rail */}

      <nav className="landing-nav">
        <a href="#" className="brand">
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Fish size={16} color="#fff" />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text1)' }}>OMarine</span>
        </a>
        <div className="nav-right">
          <div className="nav-meta"><span className="live-dot"></span>ANNOTATING · LIVE</div>
          <a href="/login" className="btn-pri">Get started</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-dots"></div>
        <div className="hero-glow"></div>
        <svg className="sonar" viewBox="-260 -260 520 520">
          <circle cx="0" cy="0" r="60"/>
          <circle cx="0" cy="0" r="60"/>
          <circle cx="0" cy="0" r="60"/>
        </svg>

        <div className="badge">
          <div className="badge-dot"></div>
          Built for marine ecologists
        </div>

        <h1 className="hero-h1">
          Less time reviewing.<br/>
          <em className="scribble">
            More time deciding.
            <svg viewBox="0 0 400 14" preserveAspectRatio="none">
              <path d="M2 9 C 60 2, 140 13, 220 6 S 360 11, 398 5" stroke="#4a6fc4" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".6"/>
            </svg>
          </em>
        </h1>

        <p className="hero-sub">
          Towed imaging devices collect up to 50 km of transect data per day. Reviewing it all manually is impossible. OMarine uses AI to detect, group, and surface marine species so researchers can focus on decisions — not pixel-scanning.
        </p>

        <div className="hero-cta">
          <a href="/login" className="btn-hero">
            Get started
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>

        <div className="stats">
          <div className="stat-item">
            <div className="stat-tag">Globally</div>
            <div className="stat-num" style={{fontFamily:"'DM Mono',monospace",fontStyle:"normal",fontWeight:500}}>300k+</div>
            <div className="stat-lbl">Hours of footage collected</div>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <div className="stat-tag">Annotated</div>
            <div className="stat-num" style={{fontFamily:"'DM Mono',monospace",fontStyle:"normal",fontWeight:500}}>&lt;15%</div>
            <div className="stat-lbl">By domain experts</div>
          </div>
          <div className="stat-sep"></div>
          <div className="stat-item">
            <div className="stat-tag">Per device · day</div>
            <div className="stat-num" style={{fontFamily:"'DM Mono',monospace",fontStyle:"normal",fontWeight:500}}>50km</div>
            <div className="stat-lbl">Of transect data</div>
          </div>
        </div>

        <div className="scroll-hint">
          SCROLL TO DESCEND
          <div className="line"></div>
        </div>
      </section>

      {/* App Preview */}
      <div className="preview-wrap">
        <div className="preview-corner tl">FIG. 01 — interface</div>
        <div className="preview-corner tr">1,284 detections · 42% reviewed</div>
        <div className="app-card">
          <div className="app-chrome">
            <div className="dot dot-r"></div>
            <div className="dot dot-y"></div>
            <div className="dot dot-g"></div>
            <div className="app-url">omarine.app / projects / [id]</div>
          </div>
          <div className="app-body">
            {/* Sidebar */}
            <div className="app-sidebar">
              <div className="app-sidebar-header">
                <div className="app-logo-wrap">
                  <div className="app-logo-mark">
                    <Fish size={12} color="#fff" />
                  </div>
                  <span className="app-brand-name">OMarine</span>
                </div>
              </div>
              <div className="app-proj-meta">
                <div className="apm-lbl">Current Project</div>
                <div className="apm-name">FFT Transect 2024</div>
                <div className="apm-type">
                  <div className="apm-dot" style={{ background: 'var(--success)' }}></div>
                  active
                </div>
              </div>
              <div className="app-nav">
                <div className="app-nav-item active">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  Detections
                </div>
                <div className="app-nav-item">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Annotate
                  <span style={{ marginLeft: 'auto', background: 'var(--warning)', color: '#1a1a2e', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px' }}>38</span>
                </div>
                <div className="app-nav-item">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Model Performance
                </div>
                <div className="app-nav-item">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <ellipse cx="12" cy="12" rx="10" ry="4"/>
                    <path d="M2 12c0 4.4 4.5 8 10 8s10-3.6 10-8M12 2v20"/>
                  </svg>
                  Datasets
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="app-main">
              {/* Topbar */}
              <div className="app-topbar">
                <div>
                  <div className="app-topbar-title">FFT Towed Transect — Batch 14</div>
                  <div className="app-topbar-sub">1,284 detections · 42% reviewed</div>
                </div>
                <div style={{ padding: '5px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--primary)', background: 'var(--primary)', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Upload media
                </div>
              </div>

              {/* Stats + search strip */}
              <div className="app-strip">
                <div className="chip" style={{ borderColor: 'transparent', background: 'transparent' }}>
                  <div className="chip-dot" style={{ background: 'var(--text3)' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)' }}>744</span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Needs review</span>
                </div>
                <div className="chip" style={{ borderColor: 'var(--success)', background: 'rgba(29,158,117,.08)' }}>
                  <div className="chip-dot" style={{ background: 'var(--success)' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)' }}>540</span>
                  <span style={{ fontSize: '11px', color: 'var(--success)' }}>Reviewed</span>
                </div>
                {/* Search field */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: '7px', padding: '0 10px', height: '26px' }}>
                    <svg width="11" height="11" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>
                    <span style={{ fontSize: '10px', color: 'var(--text3)' }}>Search frames…</span>
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: '6px', border: '1.5px solid var(--primary)', background: 'var(--primary)', fontSize: '10px', fontWeight: 600, color: '#fff' }}>AI Search</div>
                  <div style={{ padding: '3px 8px', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '10px', color: 'var(--text2)' }}>Sort by confidence</div>
                </div>
              </div>

              {/* Detection grid */}
              <div className="app-grid">
                {detections.map((det, i) => (
                  <div key={i} className={`det-thumb${det.sel ? ' sel' : ''}`}>
                    <div className="det-bg" />
                    {/* Simulated coral/fish texture dots */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(30,80,120,.6) 1px, transparent 1px)', backgroundSize: '8px 8px', opacity: 0.4, pointerEvents: 'none' }} />
                    <div className="det-bbox" style={det.bbox}>
                      <div className="det-lbl">{det.label}</div>
                    </div>
                    <div className="det-sdot" style={{ background: `var(--${det.conf})` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specimen marquee */}
      <div className="specimen-strip" aria-hidden="true">
        <div className="marquee">
          {marqueeSpecies.map((name, i) => (
            <div key={i} className="marquee-item">
              {name}
              <span className="sep"></span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="features">
        <div className="features-header reveal">
          <div className="sec-label">What it does</div>
          <h2 className="sec-title">Three things that change<br/>how you <em>process</em> transect data</h2>
        </div>
        <div className="feat-grid reveal">
          {[
            {
              num: 'i.',
              title: 'AI detects & groups',
              desc: 'Foundation vision models scan every frame, highlight organisms, and group repeated detections across adjacent frames — so you review each species once, not dozens of times.',
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            },
            {
              num: 'ii.',
              title: 'Search by description',
              desc: "Type what you're looking for in plain language. OMarine surfaces matching detections across thousands of unlabelled frames instantly — no manual browsing required.",
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>
            },
            {
              num: 'iii.',
              title: 'Experts stay in control',
              desc: 'Confirm, reject, or correct detections in an interactive canvas. The model gets better with every frame you approve — keeping scientific accountability at every step.',
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            },
          ].map((feat, i) => (
            <div key={i} className="feat-card">
              <span className="feat-num">{feat.num}</span>
              <div className="feat-rule"></div>
              <div className="feat-title">{feat.title}</div>
              <div className="feat-desc">{feat.desc}</div>
              <div className="feat-glyph">{feat.icon}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* Callout — shifted right, no wave */}
      <section className="callout-section" style={{ paddingTop: '110px' }}>
        <div className="callout reveal" >
          <div className="callout-stamp">FIELD NOTE · 003</div>
          <div className="callout-num">
            &lt;15%
            <small>of global footage</small>
          </div>
          <div>
            <div className="callout-text">
              Of the estimated <strong>300,000+ hours</strong> of underwater footage collected globally has been annotated. As collection rates grow with devices like FFT&apos;s towed imager — capturing <strong>50 km of transect data per day</strong> — the backlog compounds directly, slowing conservation decisions.
            </div>
            <div className="callout-cite">Bell et al. (2023) · Ma et al. (2024)</div>
          </div>
        </div>
      </section>

      {/* CTA — no wave SVG */}
      <section className="cta-section">
        <div className="cta-bg"></div>
        <div className="cta-inner reveal">
          <div className="sec-label" style={{ textAlign: 'center' }}>Ready?</div>
          <h2 className="cta-title">Ready to clear<br/><em>the backlog?</em></h2>
          <p className="cta-desc">OMarine is built for marine ecologists processing large volumes of underwater imagery. Get started today.</p>
          <a href="/login" className="btn-hero">
            Get started
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Fish size={13} color="#fff" />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', letterSpacing: '-0.01em' }}>OMarine</span>
          </div>
          <div className="footer-copy">AI rapid sorting of underwater ecological imagery</div>
        </div>
        <div className="footer-coord">— transect log · batch 14 · 1,284 detections —</div>
        <ul className="footer-links">
          <li><a href="#">Contact</a></li>
          <li><a href="#">Privacy</a></li>
        </ul>
      </footer>
    </>
  )
}