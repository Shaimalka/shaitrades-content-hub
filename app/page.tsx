'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    { icon: '📊', title: 'Trade Journal', desc: 'Log every trade with entry, exit, screenshots, and notes. See patterns you never knew existed.', color: '#2563eb' },
    { icon: '🧠', title: 'AI Trade Analysis', desc: "Your AI co-pilot reviews every trade and tells you where you're leaking money.", color: '#00f2ff' },
    { icon: '✅', title: 'Daily Habit Tracker', desc: 'Winning in markets starts before the open. Track sleep, mindset, prep — all of it.', color: '#7c3aed' },
    { icon: '💰', title: 'P&L Dashboard', desc: 'Real-time performance metrics. Net P&L, win rate, profit factor, drawdown — crystal clear.', color: '#059669' },
    { icon: '📋', title: 'Trading Playbook', desc: 'Document your setups, rules, and strategies. Build a system that scales with you.', color: '#dc2626' },
    { icon: '🎯', title: 'Goals & Milestones', desc: 'Set monthly targets, track streaks, and celebrate wins. Progress you can actually see.', color: '#d97706' },
  ]

  const testimonials = [
    { name: 'Marcus T.', role: 'Funded Futures Trader — TopStep', text: 'I went from blowing 3 accounts to passing my evaluation in 30 days. TRABITS made me accountable to my own rules.', avatar: 'M', color: '#2563eb' },
    { name: 'Jaylen R.', role: 'Prop Firm Trader — FTMO', text: 'The AI feedback alone is worth it. It caught a revenge trading pattern I had been ignoring for months.', avatar: 'J', color: '#00f2ff' },
    { name: 'Sofia M.', role: 'NQ Futures Day Trader', text: 'Finally a tool built for serious traders. Not some crypto bro app. Clean, focused, elite.', avatar: 'S', color: '#7c3aed' },
  ]

  const faqs = [
    { q: 'Who is TRABITS built for?', a: 'TRABITS is built for serious traders — futures traders, prop firm traders, and anyone committed to treating trading as a professional discipline, not gambling.' },
    { q: 'Does it connect to my broker automatically?', a: 'You can log trades manually or import via CSV. Broker API integrations are coming soon for NinjaTrader, Tradovate, and more.' },
    { q: 'What makes TRABITS different?', a: 'Most journals just store data. TRABITS combines trade logging with habit tracking, AI analysis, and a full life OS — because your trading performance reflects your daily habits.' },
    { q: 'Is my data private?', a: 'Absolutely. Your data is encrypted and never shared. You own your data, always.' },
    { q: 'Can I try it for free?', a: "Yes — start free with no credit card required. Upgrade when you're ready to unlock AI analysis and advanced features." },
  ]

  const plans = [
    { name: 'Free', price: '$0', period: 'forever', desc: 'Start building your edge', features: ['Trade journal (50 trades/mo)', 'Basic P&L dashboard', 'Habit tracker', 'Daily journal'], cta: 'Start Free', hi: false },
    { name: 'Pro', price: '$19', period: 'per month', desc: 'For serious, consistent traders', features: ['Unlimited trade logging', 'AI trade analysis & feedback', 'Advanced analytics', 'Trading playbook', 'Goals & milestones', 'CSV import / export', 'Priority support'], cta: 'Get Started', hi: true },
    { name: 'Elite', price: '$49', period: 'per month', desc: 'Built for funded traders', features: ['Everything in Pro', 'Multi-account tracking', 'Prop firm rule alerts', 'Weekly AI report', 'Custom playbook templates', 'Early access'], cta: 'Go Elite', hi: false },
  ]

  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: '#0a0f1a', color: '#e2e8f0', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } * { box-sizing: border-box; margin: 0; padding: 0; } html { scroll-behavior: smooth; }' }} />

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '0 2rem', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,15,26,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            TRA<span style={{ color: '#00f2ff' }}>BITS</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Sign In</Link>
          <Link href="/signup" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#00f2ff', color: '#0a0f1a', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)' }} />
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(37,99,235,0.2) 0%, rgba(0,242,255,0.07) 40%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', borderRadius: '999px', border: '1px solid rgba(0,242,255,0.35)', background: 'rgba(0,242,255,0.05)', marginBottom: '2rem', fontSize: '0.78rem', fontWeight: 700, color: '#00f2ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f2ff', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Now in Beta — Limited Access
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5.25rem)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: '1.5rem', color: '#fff' }}>
            The Personal OS for<br /><span style={{ background: 'linear-gradient(130deg, #2563eb 30%, #00f2ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Serious Traders</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#94a3b8', maxWidth: '580px', margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Most traders fail not because they lack skill — but because they lack a system.
            TRABITS is your edge. Track every trade, every habit, every dollar — powered by AI.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <Link href="/signup" style={{ padding: '0.9rem 2rem', borderRadius: '10px', background: '#00f2ff', color: '#0a0f1a', textDecoration: 'none', fontSize: '1rem', fontWeight: 800, boxShadow: '0 0 40px rgba(0,242,255,0.28)' }}>Start Free Today →</Link>
            <Link href="/signup" style={{ padding: '0.9rem 2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', textDecoration: 'none', fontSize: '1rem', fontWeight: 500, background: 'rgba(255,255,255,0.03)' }}>See How It Works</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', padding: '1.5rem 2rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: 'rgba(255,255,255,0.025)' }}>
            {[{ value: '2,400+', label: 'Active Traders' }, { value: '$1.2M+', label: 'P&L Tracked' }, { value: '98%', label: 'Satisfaction' }, { value: '4.9★', label: 'Rating' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section style={{ padding: '5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.09), rgba(0,242,255,0.03))', border: '1px solid rgba(37,99,235,0.22)', borderRadius: '24px', padding: '3.5rem 3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>The Hard Truth</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.2 }}>You have 1 life.<br />Stop trading like it doesn't matter.</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.8, maxWidth: '600px', margin: '0 auto' }}>90% of traders lose because they operate on emotion, not data. They repeat the same mistakes, ignore their psychology, and have no real feedback loop. TRABITS closes that loop.</p>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2ff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Features</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Everything you need.<br />Nothing you don't.</h2>
          <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>Built for the edge. Designed for focus. Every feature earns its place.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.75rem', cursor: 'default' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1.25rem', border: '1px solid ' + f.color + '30' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>How It Works</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Simple. Consistent. Elite.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { num: '01', title: 'Log every trade', desc: 'Entry, exit, time, setup, screenshots, emotions. In 30 seconds. No friction.' },
            { num: '02', title: 'Track your habits daily', desc: 'Sleep, exercise, pre-market prep, mindset check-in. Build the routine that elite traders live by.' },
            { num: '03', title: 'Get AI feedback', desc: 'Your AI co-pilot reviews your data and gives you blunt, specific feedback. No fluff.' },
            { num: '04', title: 'See the patterns. Fix the leaks.', desc: 'Watch your win rate climb as you eliminate your biggest trading mistakes, one by one.' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', padding: '1.75rem', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb', opacity: 0.7, minWidth: '48px', lineHeight: 1 }}>{step.num}</span>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2ff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Traders Love It</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Real results. Real traders.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.color + '25', border: '2px solid ' + t.color + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: t.color }}>{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.role}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, fontStyle: 'italic' }}>"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Invest in your edge.</h2>
          <p style={{ fontSize: '1rem', color: '#64748b' }}>No credit card required to start. Cancel anytime.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {plans.map((plan, i) => (
            <div key={i} style={{ background: plan.hi ? 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(0,242,255,0.06))' : 'rgba(255,255,255,0.025)', border: plan.hi ? '1px solid rgba(0,242,255,0.4)' : '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '2.25rem', position: 'relative', marginTop: plan.hi ? '0' : '1rem' }}>
              {plan.hi && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', padding: '0.3rem 1rem', borderRadius: '999px', background: '#00f2ff', color: '#0a0f1a', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Most Popular</div>}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>/{plan.period}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{plan.desc}</p>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                {plan.features.map((feat, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    <span style={{ color: '#00f2ff', fontSize: '0.875rem', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{feat}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', padding: '0.875rem', borderRadius: '10px', background: plan.hi ? '#00f2ff' : 'rgba(255,255,255,0.06)', color: plan.hi ? '#0a0f1a' : '#e2e8f0', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', border: plan.hi ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>{plan.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2ff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>FAQ</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Questions? We got you.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: openFaq === i ? '1px solid rgba(0,242,255,0.28)' : '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', gap: '1rem' }}>
                {faq.q}
                <span style={{ color: '#00f2ff', fontSize: '1.25rem', flexShrink: 0, lineHeight: 1 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7 }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: '4rem 2rem 8rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ padding: '4rem 3rem', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(0,242,255,0.08) 100%)', border: '1px solid rgba(0,242,255,0.22)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translate(-50%, 0)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.25rem' }}>Your competition is<br />already tracking theirs.</h2>
            <p style={{ fontSize: '1.125rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>Start building your edge today. Free. No credit card. No BS.</p>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', borderRadius: '12px', background: '#00f2ff', color: '#0a0f1a', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 800, boxShadow: '0 0 60px rgba(0,242,255,0.32)' }}>Start Free Today →</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem', maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>TRA<span style={{ color: '#00f2ff' }}>BITS</span></span>
          <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>Trading + Habits. The Personal OS for Serious Traders.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Link href="/privacy" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.875rem' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.875rem' }}>Terms</Link>
            <a href="mailto:shai@trabits.co" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.875rem' }}>Contact</a>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#334155' }}>© 2026 TRABITS. All rights reserved.</p>
      </footer>
    </div>
  )
}
