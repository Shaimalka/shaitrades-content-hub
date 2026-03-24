import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-cyan':    '#00f2ff',
        'neon-magenta': '#ff00e5',
        'neon-green':   '#00ff88',
        'neon-amber':   '#ffb400',
        'obsidian': {
          DEFAULT: '#0a0a0b',
          surface: '#0f0f11',
          panel:   '#13131a',
          card:    '#16161f',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'cyber':    '14px',
        'cyber-sm': '8px',
        'cyber-xs': '6px',
      },
      boxShadow: {
        'neon-cyan':    '0 0 16px rgba(0,242,255,0.35), 0 0 32px rgba(0,242,255,0.12)',
        'neon-magenta': '0 0 16px rgba(255,0,229,0.35), 0 0 32px rgba(255,0,229,0.12)',
        'neon-sm':      '0 0 8px rgba(0,242,255,0.2)',
        'glass':        '0 8px 32px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'cyber-grid':              'linear-gradient(rgba(0,242,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,255,0.025) 1px, transparent 1px)',
        'gradient-cyan-magenta':  'linear-gradient(135deg, #00f2ff, #ff00e5)',
        'gradient-card-cyan':     'linear-gradient(135deg, rgba(0,242,255,0.12), rgba(0,242,255,0.04))',
        'gradient-card-magenta':  'linear-gradient(135deg, rgba(255,0,229,0.12), rgba(255,0,229,0.04))',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1',   boxShadow: '0 0 6px rgba(0,242,255,0.4)' },
          '50%':       { opacity: '0.6', boxShadow: '0 0 14px rgba(0,242,255,0.7)' },
        },
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 8px rgba(0,242,255,0.4)' },
          '50%':       { textShadow: '0 0 20px rgba(0,242,255,0.8)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
