import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/app/contexts/ThemeContext'

export const metadata: Metadata = {
    title: {
      default: 'TRABITS',
          template: '%s | TRABITS'
    },
    description: 'Your personal trading + habits OS. Built for serious traders.',
    icons: {
          icon: '/icon.svg'
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
          <html lang="en" className="dark" suppressHydrationWarning>
                <head>
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                        <link
                                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
                                    rel="stylesheet"
                                  />
                </head>
                <body className="bg-[var(--bg-obsidian)] text-[var(--text-primary)] min-h-screen">
                        <ThemeProvider>
                          {children}
                        </ThemeProvider>
                </body>
          </html>
        )
}</html>
