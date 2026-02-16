'use client';

import { ReactNode } from 'react';
import { Navigation } from '@/components/navigation';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui/loading';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => (state as any)._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || !token) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, token, router]);

  if (!hasHydrated || !isAuthenticated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
