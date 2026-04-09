import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import BacktestingClient from './BacktestingClient'

export const metadata = {
  title: 'Backtesting | TRABITS',
  }

  export default async function BacktestingPage() {
    const session = await getServerSession(authOptions)
      if (!session) redirect('/login')
        return <BacktestingClient />
        }
