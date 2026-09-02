'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useStore();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard'); // Local/Demo mode enters dashboard directly
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
      <p className="text-base text-stone-600 font-medium">กำลังโหลด 7Doses (ยา 7 เม็ด)...</p>
    </div>
  );
}
