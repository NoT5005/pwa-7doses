'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, History, Layers, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide nav on login or onboarding pages
  if (pathname === '/login' || pathname === '/onboarding') {
    return null;
  }

  const navItems = [
    {
      label: 'หน้าหลัก',
      href: '/dashboard',
      icon: Home,
      isActive: pathname === '/dashboard' || pathname === '/',
    },
    {
      label: 'ขั้นตอน',
      href: '/steps',
      icon: Layers,
      isActive: pathname.startsWith('/steps'),
    },
    {
      label: 'ปฏิบัติ',
      href: '/practice',
      icon: Play,
      isCenter: true,
      isActive: pathname.startsWith('/practice'),
    },
    {
      label: 'ประวัติ',
      href: '/history',
      icon: History,
      isActive: pathname.startsWith('/history'),
    },
    {
      label: 'ตั้งค่า',
      href: '/settings',
      icon: Settings,
      isActive: pathname.startsWith('/settings'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg">
      <div className="max-w-md mx-auto px-4 flex items-center justify-between h-18 pb-[env(safe-area-inset-bottom,8px)] pt-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <div key={item.href} className="relative -top-5 flex flex-col items-center">
                <Link
                  href={item.href}
                  className={`w-15 h-15 rounded-full flex items-center justify-center shadow-elevated transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                    item.isActive
                      ? 'bg-primary-700 text-white ring-4 ring-primary-100'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                  aria-label="เริ่มปฏิบัติธรรม"
                >
                  <Icon className="w-7 h-7 fill-white translate-x-0.5" />
                </Link>
                <span className="text-xs font-bold text-primary-800 mt-1">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] rounded-xl transition-colors focus:outline-none ${
                item.isActive
                  ? 'text-primary-700 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-transform ${
                  item.isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-[11px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
