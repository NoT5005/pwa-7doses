'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { APP_VERSION } from '@/lib/version';
import { User, Cloud, RefreshCw } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, isDemoMode, isSyncing } = useStore();

  const isPublicAuthPage =
    pathname === '/login' || pathname === '/auth/callback' || pathname === '/';

  useEffect(() => {
    if (!isLoading && !user && !isPublicAuthPage) {
      router.replace('/login');
    }
  }, [isLoading, user, isPublicAuthPage, router]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm pt-safe">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Brand & Logo */}
        <Link
          href={user ? '/dashboard' : '/login'}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-amber-200 shadow-sm bg-amber-50/50 flex-shrink-0">
            <Image
              src="/logo.jpg"
              alt="7Doses Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-primary-700 font-sans">
                7Doses
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200/60">
                ยา 7 เม็ด
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              บันทึกการปฏิบัติธรรม · <span className="text-stone-400">v{APP_VERSION}</span>
            </p>
          </div>
        </Link>

        {/* User Profile Shortcut */}
        {user && pathname !== '/login' && pathname !== '/auth/callback' && (
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200 text-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="โปรไฟล์และการซิงค์ข้อมูล"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : !isDemoMode ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="text-sm font-semibold max-w-[105px] truncate">
              {profile?.practitioner_name || 'ผู้ปฏิบัติธรรม'}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
};
