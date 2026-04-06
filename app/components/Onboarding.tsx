'use client'
import { useState, useEffect } from 'react'
import { BarChart2, CheckCircle2, BookOpen } from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

type ProfileData = {
  name: string
  age: number | ''
  location: string
  whyTrading: string
  lifeOutsideTrading: string
  motivation: string
  instruments: string[]
  experience: string
  currentLevel: string
  tradingSchedule: string[]
  daysPerWeek: string
  biggestChallenge: string
  lossResponse: string
  disciplineRating: number
  wakeUpTime: string
}

const CYAN = '#00f2ff'
const BG = '#060608'
const PILL_DEFAULT = { background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }
const PILL_SELECTED = { background: 'rgba(0,242,255,0.1)', border: '1px solid #00f2ff', color: CYAN }
const PILL_HOVER = { background: 'rgba(0,242,255,0.05)' }

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...(selected ? PILL_SELECTED : { ...PILL_DEFAULT, ...(hover ? PILL_HOVER : {}) }),
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        outline: 'none',
      }}
    >
      {label}
    </button>
  )
}

function RatingButton({ value, current, label, onClick }: { value: number; current: number; label?: string; onClick: () => void }) {
  const selected = current === value
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <button
        onClick={onClick}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          background: selected ? 'rgba(0,242,255,0.15)' : '#0a0a0f',
          border: selected ? '1px solid #00f2ff' : '1px solid rgba(255,255,255,0.1)',
          color: selected ? CYAN : '#ffffff',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {value}
      </button>
      {label && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', maxWidth: '60px', lineHeight: 1.3 }}>
          {label}
        </span>
      )}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, maxLength, type = 'text' }: {
  value: string | number | ''
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
}) {
  return (
    <input
      type={type}
      value={value as string}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%',
        background: '#0a0a0f',
        border: '1px solid rgba(0,242,255,0.3)',
        borderRadius: '6px',
        color: '#ffffff',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        padding: '10px 14px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.2s',
      }}
      onFocus={e => { e.target.style.boxShadow = '0 0 0 2px rgba(0,242,255,0.25)' }}
      onBlur={e => { e.target.style.boxShadow = 'none' }}
    />
  )
}

function TextArea({ value, onChange, placeholder, maxLength }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        style={{
          width: '100%',
          background: '#0a0a0f',
          border: '1px solid rgba(0,242,255,0.3)',
          borderRadius: '6px',
          color: '#ffffff',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '13px',
          padding: '10px 14px',
          outline: 'none',
          resize: 'none',
          boxSizing: 'border-box',
          transition: 'box-shadow 0.2s',
        }}
        onFocus={e => { e.target.style.boxShadow = '0 0 0 2px rgba(0,242,255,0.25)' }}
        onBlur={e => { e.target.style.boxShadow = 'none' }}
      />
      {maxLength && (
        <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

function Q({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', letterSpacing: '0.5px' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function PillGroup({ options, selected, multi, onChange }: {
  options: string[]
  selected: string | string[]
  multi?: boolean
  onChange: (v: string | string[]) => void
}) {
  const isSelected = (opt: string) => multi ? (selected as string[]).includes(opt) : selected === opt
  const handleClick = (opt: string) => {
    if (multi) {
      const arr = selected as string[]
      onChange(isSelected(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
    } else {
      onChange(opt)
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => (
        <Pill key={opt} label={opt} selected={isSelected(opt)} onClick={() => handleClick(opt)} />
      ))}
    </div>
  )
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(false)
  const TOTAL = 7

  const [profile, setProfile] = useState<ProfileData>({
    name: '', age: '', location: '', whyTrading: '', lifeOutsideTrading: '', motivation: '',
    instruments: [], experience: '', currentLevel: '',
    tradingSchedule: [], daysPerWeek: '', biggestChallenge: '',
    lossResponse: '', disciplineRating: 0, wakeUpTime: '',
  })

  const [habit, setHabit] = useState('')
  const [goal, setGoal] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
  }, [])

  const set = (key: keyof ProfileData, value: any) => setProfile(p => ({ ...p, [key]: value }))

  const stepLabel = String(step).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0')
  const progress = ((step - 1) / (TOTAL - 1)) * 100

  const handleFinish = async () => {
    setSaving(true)
    try {
      await Promise.allSettled([
        fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }),
        ...(habit ? [fetch('/api/life/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry: { name: habit } }) })] : []),
        ...(goal ? [fetch('/api/life/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: goal, targetDate: goalDate }) })] : []),
      ])
      await fetch('/api/onboarding', { method: 'POST' })
    } catch (e) {}
    setSaving(false)
    onComplete()
  }

  const goNext = () => {
    if (step < TOTAL) setStep(s => s + 1)
    else handleFinish()
  }

  const motivationLine = profile.name && profile.motivation
    ? `Let's get you to ${profile.motivation.toLowerCase()}, ${profile.name}. One trade at a time.`
    : 'Let's build something real. One trade at a time.'

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(6,6,8,0.97)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
    opacity: visible ? 1 : 0,
    transition: 'opacity 300ms ease',
    overflowY: 'auto',
  }

  const cardStyle: React.CSSProperties = {
    background: BG,
    maxWidth: '580px',
    width: '100%',
    padding: '48px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    margin: 'auto',
  }

  const headlineStyle: React.CSSProperties = {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 700,
    color: CYAN,
    margin: '0 0 16px',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  }

  const subStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 8px',
    lineHeight: 1.6,
  }

  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(20px, 3.5vw, 28px)',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 28px',
    letterSpacing: '-0.01em',
  }

  const primaryBtn: React.CSSProperties = {
    background: CYAN,
    color: BG,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: '32px',
    letterSpacing: '1px',
    transition: 'opacity 0.2s',
  }

  const skipBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
    cursor: 'pointer',
    marginTop: '12px',
    display: 'block',
    width: '100%',
    textAlign: 'center',
    letterSpacing: '0.5px',
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Step indicator */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(0,242,255,0.5)', letterSpacing: '2px' }}>
              {stepLabel}
            </span>
          </div>
          <div style={{ height: '2px', background: 'rgba(0,242,255,0.15)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: progress + '%', background: CYAN, borderRadius: '1px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div>
            <h1 style={headlineStyle}>WELCOME TO TRABITS</h1>
            <p style={subStyle}>Your personal trading + habits OS. Built for serious traders.</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 40px', letterSpacing: '0.5px' }}>
              Let's get to know you. 7 quick steps.
            </p>
            <button style={primaryBtn} onClick={goNext}>LET'S GO →</button>
          </div>
        )}

        {/* Step 2 — Trading Profile */}
        {step === 2 && (
          <div>
            <h2 style={sectionHeadStyle}>YOUR TRADING PROFILE</h2>
            <Q label="What do you trade?">
              <PillGroup
                options={['Futures', 'Stocks', 'Forex', 'Crypto', 'Options']}
                selected={profile.instruments}
                multi
                onChange={v => set('instruments', v)}
              />
            </Q>
            <Q label="How long have you been trading?">
              <PillGroup
                options={['Less than 1 year', '1–3 years', '3–5 years', '5+ years']}
                selected={profile.experience}
                onChange={v => set('experience', v)}
              />
            </Q>
            <Q label="Where are you right now?">
              <PillGroup
                options={['Still learning', 'Breaking even', 'Inconsistently profitable', 'Consistently profitable']}
                selected={profile.currentLevel}
                onChange={v => set('currentLevel', v)}
              />
            </Q>
            <button style={primaryBtn} onClick={goNext}>NEXT →</button>
          </div>
        )}

        {/* Step 3 — Trading Routine */}
        {step === 3 && (
          <div>
            <h2 style={sectionHeadStyle}>YOUR TRADING ROUTINE</h2>
            <Q label="When do you usually trade?">
              <PillGroup
                options={['Pre-market', 'Market open', 'Midday', 'Market close', 'After-hours', 'Overnight']}
                selected={profile.tradingSchedule}
                multi
                onChange={v => set('tradingSchedule', v)}
              />
            </Q>
            <Q label="How many days a week do you trade?">
              <PillGroup
                options={['1–2 days', '3–4 days', 'Every day']}
                selected={profile.daysPerWeek}
                onChange={v => set('daysPerWeek', v)}
              />
            </Q>
            <Q label="What's your biggest challenge right now?">
              <PillGroup
                options={['Discipline & emotions', 'Finding good setups', 'Risk management', 'Consistency', 'Overtrading']}
                selected={profile.biggestChallenge}
                onChange={v => set('biggestChallenge', v)}
              />
            </Q>
            <button style={primaryBtn} onClick={goNext}>NEXT →</button>
          </div>
        )}

        {/* Step 4 — Personal */}
        {step === 4 && (
          <div>
            <h2 style={sectionHeadStyle}>LET'S GET PERSONAL</h2>
            <p style={{ ...subStyle, marginBottom: '24px' }}>Coach Shai uses this to give you advice that actually hits.</p>
            <Q label="What's your first name?">
              <TextInput value={profile.name} onChange={v => set('name', v)} placeholder="Your name" />
            </Q>
            <Q label="How old are you?">
              <TextInput value={profile.age} onChange={v => set('age', v)} type="number" placeholder="Age" />
            </Q>
            <Q label="Why did you start trading?">
              <TextArea
                value={profile.whyTrading}
                onChange={v => set('whyTrading', v)}
                placeholder="Be honest. This stays between you and Coach Shai."
                maxLength={120}
              />
            </Q>
            <Q label="What does your life look like outside trading?">
              <PillGroup
                options={['Student', '9-5 job', 'Full-time trader', 'Entrepreneur', 'Other']}
                selected={profile.lifeOutsideTrading}
                onChange={v => set('lifeOutsideTrading', v)}
              />
            </Q>
            <Q label="What's your biggest motivation?">
              <PillGroup
                options={['Financial freedom', 'Quit my job', 'Provide for my family', 'Prove people wrong', 'Build generational wealth']}
                selected={profile.motivation}
                onChange={v => set('motivation', v)}
              />
            </Q>
            <Q label="Where are you based?">
              <TextInput value={profile.location} onChange={v => set('location', v)} placeholder="City, Country" />
            </Q>
            <button style={primaryBtn} onClick={goNext}>NEXT →</button>
          </div>
        )}

        {/* Step 5 — Mindset */}
        {step === 5 && (
          <div>
            <h2 style={sectionHeadStyle}>YOUR MINDSET</h2>
            <Q label="How do you handle losing trades?">
              <PillGroup
                options={['I move on quickly', 'I get frustrated', 'I revenge trade', 'I shut down for the day', 'I journal and reflect']}
                selected={profile.lossResponse}
                onChange={v => set('lossResponse', v)}
              />
            </Q>
            <Q label="How disciplined are you RIGHT NOW — be honest?">
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <RatingButton value={1} current={profile.disciplineRating} label="No discipline" onClick={() => set('disciplineRating', 1)} />
                <RatingButton value={2} current={profile.disciplineRating} onClick={() => set('disciplineRating', 2)} />
                <RatingButton value={3} current={profile.disciplineRating} label="Working on it" onClick={() => set('disciplineRating', 3)} />
                <RatingButton value={4} current={profile.disciplineRating} onClick={() => set('disciplineRating', 4)} />
                <RatingButton value={5} current={profile.disciplineRating} label="Locked in" onClick={() => set('disciplineRating', 5)} />
              </div>
            </Q>
            <Q label="What time do you wake up?">
              <TextInput value={profile.wakeUpTime} onChange={v => set('wakeUpTime', v)} type="time" placeholder="e.g. 6:00 AM" />
            </Q>
            <button style={primaryBtn} onClick={goNext}>NEXT →</button>
          </div>
        )}

        {/* Step 6 — First Habit + Goal */}
        {step === 6 && (
          <div>
            <h2 style={sectionHeadStyle}>LET'S BUILD YOUR FOUNDATION</h2>
            <Q label="What's one daily habit you want to build?">
              <TextInput
                value={habit}
                onChange={setHabit}
                placeholder="e.g. Morning review, Exercise, No phone before market open"
              />
            </Q>
            <Q label="What's one goal you want to hit?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <TextInput value={goal} onChange={setGoal} placeholder="e.g. Grow account to $10k" />
                <input
                  type="date"
                  value={goalDate}
                  onChange={e => setGoalDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid rgba(0,242,255,0.3)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    padding: '10px 14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </Q>
            <button style={primaryBtn} onClick={goNext}>NEXT →</button>
            <button style={skipBtn} onClick={goNext}>SKIP FOR NOW</button>
          </div>
        )}

        {/* Step 7 — You're Ready */}
        {step === 7 && (
          <div>
            <h1 style={{ ...headlineStyle, fontSize: 'clamp(22px, 4vw, 36px)' }}>COACH SHAI KNOWS YOU NOW</h1>
            <p style={{ ...subStyle, marginBottom: '32px' }}>
              Every insight, every brief, every piece of feedback — it's built around YOU.
            </p>

            {/* Icon cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
              {[
                { icon: BarChart2, label: 'Trading Journal' },
                { icon: CheckCircle2, label: 'Habits' },
                { icon: BookOpen, label: 'Daily Journal' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(0,242,255,0.04)',
                    border: '1px solid rgba(0,242,255,0.15)',
                    borderRadius: '10px',
                    padding: '16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon size={22} color={CYAN} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', letterSpacing: '0.5px' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Personalized line */}
            <p style={{
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.7,
              marginBottom: '8px',
              fontStyle: 'italic',
            }}>
              "{motivationLine}"
            </p>

            <button
              style={{ ...primaryBtn, fontFamily: 'Georgia, serif', fontSize: '16px', letterSpacing: '1px' }}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? 'SAVING...' : 'ENTER TRABITS →'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .onboarding-card { padding: 24px 16px !important; }
        }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=time]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); }
        ::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  )
}
