'use client';

import React from 'react';

const STEP_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300', label: 'เม็ดที่ 1 (ฟ้า)' },
  2: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'เม็ดที่ 2 (ม่วง)' },
  3: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300', label: 'เม็ดที่ 3 (ชมพู)' },
  4: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', label: 'เม็ดที่ 4 (ทอง)' },
  5: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', label: 'เม็ดที่ 5 (เขียวมิ้นท์)' },
  6: { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-300', label: 'เม็ดที่ 6 (เขียวมะกอก)' },
  7: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'เม็ดที่ 7 (ส้ม)' },
};

interface PillBadgeProps {
  stepOrder: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PillBadge: React.FC<PillBadgeProps> = ({
  stepOrder,
  size = 'md',
  showLabel = false,
}) => {
  const color = STEP_COLORS[stepOrder] || {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    label: `ขั้นที่ ${stepOrder}`,
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs font-semibold',
    md: 'w-8 h-8 text-sm font-bold',
    lg: 'w-10 h-10 text-base font-bold',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center rounded-full border shadow-sm ${color.bg} ${color.text} ${color.border} ${sizeClasses[size]}`}
      >
        {stepOrder}
      </span>
      {showLabel && (
        <span className={`font-medium ${color.text} text-sm`}>
          ขั้นที่ {stepOrder}
        </span>
      )}
    </div>
  );
};
