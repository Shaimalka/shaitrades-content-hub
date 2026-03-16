import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthGate from '@/components/AuthGate'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shaitrades Content Hub',
  description: 'Your trading content command center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-gray-100 min-h-screen`}>
        <AuthGate>
          {children}
        </AuthGate>
      </body>
    </html>
  )
}
