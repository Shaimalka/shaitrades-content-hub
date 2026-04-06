export const theme = {
    colors: {
          // Brand
      brand: '#2563eb',
          brandHover: '#1d4ed8',
          brandLight: 'rgba(37, 99, 235, 0.1)',
          brandBorder: 'rgba(37, 99, 235, 0.3)',

          // Dark mode
          dark: {
                  bg: '#0a0a0f',
                  surface: '#111118',
                  surfaceHover: '#1a1a24',
                  border: 'rgba(255,255,255,0.06)',
                  borderHover: 'rgba(255,255,255,0.12)',
                  text: '#ffffff',
                  textSecondary: 'rgba(255,255,255,0.5)',
                  textMuted: 'rgba(255,255,255,0.25)',
          },

          // Light mode
          light: {
                  bg: '#f8f9fc',
                  surface: '#ffffff',
                  surfaceHover: '#f1f4f9',
                  border: 'rgba(0,0,0,0.08)',
                  borderHover: 'rgba(0,0,0,0.15)',
                  text: '#0a0a0f',
                  textSecondary: 'rgba(0,0,0,0.5)',
                  textMuted: 'rgba(0,0,0,0.25)',
          },

          // Data colors (same in both modes)
          profit: '#00c48c',
          loss: '#ff4d6a',
          cyan: '#00f2ff',
          warning: '#f59e0b',
    },

    fonts: {
          ui: "'Inter', -apple-system, sans-serif",
          data: "'JetBrains Mono', monospace",
          display: "'Georgia', serif",
    },

    radius: {
          sm: '6px',
          md: '10px',
          lg: '16px',
          xl: '20px',
    },

    shadow: {
          sm: '0 1px 3px rgba(0,0,0,0.12)',
          md: '0 4px 16px rgba(0,0,0,0.16)',
          lg: '0 8px 32px rgba(0,0,0,0.24)',
          brand: '0 4px 16px rgba(37,99,235,0.25)',
    },
}
