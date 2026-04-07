import Sidebar from '@/components/Sidebar'

export default function TikTokLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-black">
        {children}
      </main>
    </div>
  )
}
