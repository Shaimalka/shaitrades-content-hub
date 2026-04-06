import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/app/contexts/ThemeContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
      title: {
          default: 'TRABITS',
              template: '%s | TRABITS'
      },
      description: 'Your personal trading + habits OS. Built for serious traders.',
}

export default function RootLayout({
      children,
}: {
      children: React.ReactNode
}) {
      return (
              <html lang="en">
                    <body className={inter.className}>
                            <ThemeProvider>
                                {children}
                            </ThemeProvider>
                    </body>
              </html>
            )
}
