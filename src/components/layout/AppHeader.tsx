'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import { User, Sparkles } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { profile } = useStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Brand & Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group focus:outline-none">
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
              <span className="text-xl font-bold tracking-tight text-primary-700 font-sans">7Doses</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200/60">
                ยา 7 เม็ด
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">บันทึกการปฏิบัติธรรม</p>
          </div>
        </Link>

        {/* User Profile Shortcut */}
        <Link
          href="/settings/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200 text-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          title="โปรไฟล์ผู้ปฏิบัติ"
        >
          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold max-w-[100px] truncate">
            {profile?.practitioner_name || 'ผู้ปฏิบัติธรรม'}
          </span>
        </Link>
      </div>
    </header>
  );
};
