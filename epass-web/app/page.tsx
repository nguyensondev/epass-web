'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loading } from '@/components/ui/loading';

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => (state as any)._hasHydrated);

  useEffect(() => {
    // Only redirect after Zustand has hydrated from localStorage
    if (!hasHydrated) return;

    if (isAuthenticated && token) {
      router.replace('/dashboard');
    } else {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/verify-otp') {
        router.replace('/login');
      }
    }
  }, [hasHydrated, isAuthenticated, token, router]);

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  return null;
}
