'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') {
      setChecking(false);
      setAuthed(true);
      return;
    }
    const token = sessionStorage.getItem('st_auth');
    if (token === 'authenticated') {
      setAuthed(true);
    } else {
      router.push('/login');
    }
    setChecking(false);
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return <>{children}</>;
}
