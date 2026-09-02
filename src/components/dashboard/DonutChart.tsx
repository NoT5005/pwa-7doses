'use client';

import React from 'react';

interface DonutChartProps {
  practicedDays: number;
  totalDays: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  practicedDays,
  totalDays,
}) => {
  const safeTotal = Math.max(1, totalDays);
  const safePracticed = Math.min(practicedDays, safeTotal);
  const unpracticedDays = Math.max(0, safeTotal - safePracticed);

  const radius = 64;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percentage = safePracticed / safeTotal;
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg
          height={radius * 2 + 16}
          width={radius * 2 + 16}
          className="transform -rotate-90"
        >
          {/* Background circle (unpracticed days) */}
          <circle
            stroke="#E2E8F0"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius + 8}
            cy={radius + 8}
          />
          {/* Practiced days circle progress */}
          <circle
            stroke="#2D7F6E"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.8s ease-in-out',
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius + 8}
            cy={radius + 8}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span className="text-2xl font-black text-stone-800 tracking-tight">
            {safePracticed} / {safeTotal}
          </span>
          <span className="text-xs font-bold text-primary-700 mt-0.5">
            วันที่มีการปฏิบัติ
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-primary-600 shadow-sm" />
          <span className="text-stone-700">ปฏิบัติ {safePracticed} วัน</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-300 shadow-sm" />
          <span className="text-stone-500">ยังไม่ได้ปฏิบัติ {unpracticedDays} วัน</span>
        </div>
      </div>
    </div>
  );
};
