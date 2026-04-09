import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { ThemeProvider } from '@app/contexts/ThemeContext'
import AuthProvider from '@components/AuthProvider'
import PageProgressBar from '@app/components/PageProgressBar'
import './globals.css'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        default: 'TRABITS',
        template: '%s | TRABITS',
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
                <AuthProvider>
                    <ThemeProvider>
                        <Suspense fallback={null}>
                            <PageProgressBar />
                        </Suspense>
                        {children}
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
