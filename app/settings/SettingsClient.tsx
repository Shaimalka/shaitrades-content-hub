'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'
import PageHeader from '@/app/components/PageHeader'
import { Settings, Plus, Gear, Trash2, X, ChevronDown } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Account = {
  id: string
  userId: string
  name: string
  firm: string
  type: 'prop_eval' | 'prop_funded' | 'live'
  startingBalance: number
  currentBalance?: number
  drawdownLimit?: number
  status: 'active' | 'passed' | 'failed' | 'closed'
  createdAt: string
  updatedAt: string
}

// ─── Presets (mirrors api/accounts/route.ts) ─────────────────────────────────

const FIRM_PRESETS = [
  'Apex Trader Funding',
  'Topstep',
  'Take Profit Trader',
  'Earn2Trade',
  'My Funded Futures',
  'Uprofit',
  'Bulenox',
  'FundedNext Futures',
  'IBKR',
  'Tradovate Direct',
  'NinjaTrader Brokerage',
  'Other',
]

const ACCOUNT_TYPES: { value: Account['type']; label: string }[] = [
  { value: 'prop_eval',   label: 'Prop Eval' },
  { value: 'prop_funded', label: 'Prop Funded' },
  { value: 'live',        label: 'Live' },
]

const STATUSES: { value: Account['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'closed', label: 'Closed' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: Account['status']): { bg: string; color: string; label: string } {
  switch (status) {
    case 'active': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'ACTIVE' }
    case 'passed': return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', label: 'PASSED' }
    case 'failed': return { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'FAILED' }
    case 'closed': return { bg: 'rgba(150,150,150,0.15)', color: '#888888', label: 'CLOSED' }
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

type FormState = {
  name: string
  firm: string
  firmCustom: string
  type: Account['type']
  startingBalance: string
  drawdownLimit: string
  status: Account['status']
  currentBalance: string
}

const BLANK_FORM: FormState = {
  name: '',
  firm: FIRM_PRESETS[0],
  firmCustom: '',
  type: 'prop_eval',
  startingBalance: '',
  drawdownLimit: '',
  status: 'active',
  currentBalance: '',
}

// ─── AccountForm ─────────────────────────────────────────────────────────────

function AccountForm({
  initial,
  isEdit,
  onSave,
  onDelete,
  onCancel,
  saving,
  theme,
}: {
  initial: FormState
  isEdit: boolean
  onSave: (f: FormState) => void
  onDelete?: () => void
  onCancel: () => void
  saving: boolean
  theme: { text: string; muted: string; border: string; inputBg: string; cardBg: string; blue: string; isDark: boolean }
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { text, muted, border, inputBg, blue, isDark } = theme

  const isProp = form.type === 'prop_eval' || form.type === 'prop_funded'

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    color: muted, textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: inputBg, border: `1px solid ${border}`,
    borderRadius: 8, padding: '9px 12px', color: text, fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  }
  const segmentStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', border: `1px solid ${active ? blue : border}`,
    background: active ? `rgba(96,165,250,0.15)` : 'transparent',
    color: active ? blue : muted, fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Name + Firm */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>ACCOUNT NAME</label>
          <input
            style={inputStyle}
            maxLength={40}
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Apex 50k Eval"
          />
        </div>
        <div>
          <label style={labelStyle}>FIRM</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select
              style={inputStyle}
              value={form.firm}
              onChange={e => setForm(p => ({ ...p, firm: e.target.value }))}
            >
              {FIRM_PRESETS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {form.firm === 'Other' && (
              <input
                style={inputStyle}
                value={form.firmCustom}
                onChange={e => setForm(p => ({ ...p, firmCustom: e.target.value }))}
                placeholder="Enter firm name"
              />
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Type */}
      <div>
        <label style={labelStyle}>TYPE</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ACCOUNT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              style={segmentStyle(form.type === t.value)}
              onClick={() => setForm(p => ({ ...p, type: t.value }))}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Starting Balance + Drawdown (prop only) */}
      <div style={{ display: 'grid', gridTemplateColumns: isProp ? '1fr 1fr' : '1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>STARTING BALANCE</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 13 }}>$</span>
            <input
              style={{ ...inputStyle, paddingLeft: 24 }}
              type="number"
              min={0}
              value={form.startingBalance}
              onChange={e => setForm(p => ({ ...p, startingBalance: e.target.value }))}
              placeholder="50000"
            />
          </div>
        </div>
        {isProp && (
          <div>
            <label style={labelStyle}>DRAWDOWN LIMIT</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 13 }}>$</span>
              <input
                style={{ ...inputStyle, paddingLeft: 24 }}
                type="number"
                min={0}
                value={form.drawdownLimit}
                onChange={e => setForm(p => ({ ...p, drawdownLimit: e.target.value }))}
                placeholder="2500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit-only fields */}
      {isEdit && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>STATUS</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  style={segmentStyle(form.status === s.value)}
                  onClick={() => setForm(p => ({ ...p, status: s.value }))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>CURRENT BALANCE</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 13 }}>$</span>
              <input
                style={{ ...inputStyle, paddingLeft: 24 }}
                type="number"
                min={0}
                value={form.currentBalance}
                onChange={e => setForm(p => ({ ...p, currentBalance: e.target.value }))}
                placeholder="50000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(form)}
          style={{
            padding: '8px 20px', background: blue, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {isEdit && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '8px 20px', background: 'transparent',
              border: '1px solid #ef4444', borderRadius: 8, fontSize: 13,
              color: '#ef4444', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Delete
          </button>
        )}
        {isEdit && confirmDelete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#ef4444' }}>Delete this account? Trades won't be deleted.</span>
            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '6px 14px', background: '#ef4444', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '6px 14px', background: 'transparent',
                border: `1px solid ${border}`, borderRadius: 6, fontSize: 12,
                color: muted, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 20px', background: 'transparent',
            border: `1px solid ${border}`, borderRadius: 8, fontSize: 13,
            color: muted, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── SettingsClient ───────────────────────────────────────────────────────────

export default function SettingsClient() {
  const { isDark } = useTheme()

  const bg      = isDark ? '#0f1117' : '#f8f8f6'
  const card    = isDark ? '#1a1f2e' : '#ffffff'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : '#e8e8e2'
  const text    = isDark ? '#ffffff' : '#0f1117'
  const muted   = isDark ? '#aaaaaa' : '#666666'
  const inputBg = isDark ? '#12161f' : '#f7f8fa'
  const blue    = '#60a5fa'

  const theme = { text, muted, border, inputBg, cardBg: card, blue, isDark }

  // ── accounts state ──
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── fetch ──
  const fetchAccounts = useCallback(async () => {
    try {
      const res  = await fetch('/api/accounts')
      const data = await res.json()
      if (Array.isArray(data.accounts)) setAccounts(data.accounts)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // ── handlers ──
  async function handleAdd(form: FormState) {
    setSaving(true)
    try {
      const firmName = form.firm === 'Other' ? form.firmCustom.trim() : form.firm
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        firm: firmName,
        type: form.type,
        startingBalance: Number(form.startingBalance),
      }
      if ((form.type === 'prop_eval' || form.type === 'prop_funded') && form.drawdownLimit) {
        body.drawdownLimit = Number(form.drawdownLimit)
      }
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      await fetchAccounts()
      setShowAddForm(false)
      showToast('Account added')
    } catch {
      showToast('Failed to add account', false)
    }
    setSaving(false)
  }

  async function handleEdit(id: string, form: FormState) {
    setSaving(true)
    try {
      const firmName = form.firm === 'Other' ? form.firmCustom.trim() : form.firm
      const updates: Record<string, unknown> = {
        name: form.name.trim(),
        firm: firmName,
        type: form.type,
        startingBalance: Number(form.startingBalance),
        status: form.status,
      }
      if (form.currentBalance) updates.currentBalance = Number(form.currentBalance)
      if ((form.type === 'prop_eval' || form.type === 'prop_funded') && form.drawdownLimit) {
        updates.drawdownLimit = Number(form.drawdownLimit)
      }
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      })
      if (!res.ok) throw new Error()
      await fetchAccounts()
      setEditId(null)
      showToast('Account updated')
    } catch {
      showToast('Failed to update account', false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      await fetchAccounts()
      setEditId(null)
      showToast('Account deleted')
    } catch {
      showToast('Failed to delete account', false)
    }
    setSaving(false)
  }

  // ── form initial state for edit ──
  function accountToForm(acc: Account): FormState {
    const isPreset = FIRM_PRESETS.includes(acc.firm)
    return {
      name: acc.name,
      firm: isPreset ? acc.firm : 'Other',
      firmCustom: isPreset ? '' : acc.firm,
      type: acc.type,
      startingBalance: String(acc.startingBalance),
      drawdownLimit: acc.drawdownLimit != null ? String(acc.drawdownLimit) : '',
      status: acc.status,
      currentBalance: acc.currentBalance != null ? String(acc.currentBalance) : '',
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    color: muted, textTransform: 'uppercase', margin: 0,
  }
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: `1px solid ${border}`,
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg, padding: '40px 32px',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.ok ? '#10b981' : '#ef4444', color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 760 }}>
        <PageHeader title="Settings" />

        {/* ── Accounts Card ── */}
        <div style={{
          background: card, border: `1px solid ${border}`,
          borderRadius: 12, padding: 24,
        }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={sectionLabel}>ACCOUNTS</p>
              <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>
                Add your prop firms and live accounts
              </p>
            </div>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => { setShowAddForm(true); setEditId(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', background: blue, color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
                }}
              >
                <Plus size={14} /> Add Account
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <div style={{
              background: isDark ? '#0f1117' : '#f7f8fa',
              border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 20,
            }}>
              <p style={{ ...sectionLabel, marginBottom: 16 }}>NEW ACCOUNT</p>
              <AccountForm
                initial={BLANK_FORM}
                isEdit={false}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                saving={saving}
                theme={theme}
              />
            </div>
          )}

          {/* Account list */}
          {loading ? (
            <p style={{ fontSize: 13, color: muted, padding: '20px 0' }}>Loading…</p>
          ) : accounts.length === 0 && !showAddForm ? (
            <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '32px 0' }}>
              No accounts yet. Add your first account to track your trades.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {accounts.map((acc, idx) => {
                const badge   = statusBadge(acc.status)
                const isEditing = editId === acc.id
                const typeLabel = ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type

                return (
                  <div key={acc.id}>
                    {/* Row */}
                    <div style={{
                      ...rowStyle,
                      borderBottom: isEditing || idx === accounts.length - 1
                        ? 'none' : `1px solid ${border}`,
                    }}>
                      {/* Left: name + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 2 }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: 12, color: muted }}>
                          {acc.firm} · {typeLabel}
                        </div>
                      </div>

                      {/* Middle: balance + badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 24px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: text, fontFamily: 'JetBrains Mono, monospace' }}>
                          {fmt(acc.startingBalance)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          padding: '2px 8px', borderRadius: 99,
                          background: badge.bg, color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Right: gear */}
                      <button
                        type="button"
                        title="Edit account"
                        onClick={() => {
                          setEditId(isEditing ? null : acc.id)
                          setShowAddForm(false)
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isEditing ? blue : muted, padding: 6, borderRadius: 6,
                          display: 'flex', alignItems: 'center',
                          transition: 'color 150ms',
                        }}
                      >
                        <Settings size={15} />
                      </button>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div style={{
                        background: isDark ? '#0f1117' : '#f7f8fa',
                        border: `1px solid ${border}`, borderRadius: 10, padding: 20,
                        marginBottom: idx === accounts.length - 1 ? 0 : 12,
                        marginTop: 4,
                      }}>
                        <p style={{ ...sectionLabel, marginBottom: 16 }}>EDIT ACCOUNT</p>
                        <AccountForm
                          initial={accountToForm(acc)}
                          isEdit={true}
                          onSave={form => handleEdit(acc.id, form)}
                          onDelete={() => handleDelete(acc.id)}
                          onCancel={() => setEditId(null)}
                          saving={saving}
                          theme={theme}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
