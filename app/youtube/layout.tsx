'use client'
  import { useEffect } from 'react'
    import { useSession } from 'next-auth/react'
      import { useRouter } from 'next/navigation'
        import Sidebar from '@/components/Sidebar'
import { ADMIN_EMAIL } from '@/lib/isAdmin'

export default function YouTubeLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
          if (status === 'loading') return
          if (session && session.user?.email !== ADMIN_EMAIL) {
                  router.replace('/life')
          }
    }, [session, status])

    if (status === 'loading') return null
    if (session && session.user?.email !== ADMIN_EMAIL) return null

  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-black">
        {children}
      </main>
    </div>
  )
}
