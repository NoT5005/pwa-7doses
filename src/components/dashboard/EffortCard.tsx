'use client';

import React from 'react';
import { EffortEvaluation } from '@/types';
import { Star, Sparkles, AlertCircle } from 'lucide-react';

interface EffortCardProps {
  evaluation: EffortEvaluation;
}

export const EffortCard: React.FC<EffortCardProps> = ({ evaluation }) => {
  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-1 text-amber-500">
        {[1, 2, 3, 4].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= count
                ? 'fill-amber-400 text-amber-500'
                : 'text-stone-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!evaluation.hasData) {
    return (
      <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-stone-800">การประเมินความเพียร</h3>
        </div>
        <div className="py-4 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-100">
          <p className="text-sm font-medium">ยังไม่มีข้อมูลสำหรับประเมิน</p>
          <p className="text-xs text-stone-400 mt-1">เริ่มบันทึกการปฏิบัติเพื่อดูผลประเมินความเพียร</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-white to-amber-50/40 rounded-3xl border border-amber-200/80 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-800">การประเมินความเพียร</h3>
            <p className="text-xs text-stone-500 font-medium">วัดผลจากความสม่ำเสมอและระยะเวลา</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs border border-amber-200 shadow-sm">
          {evaluation.overallLabel}
        </div>
      </div>

      {/* Overall Score Banner */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-amber-100 shadow-sm mb-3">
        <div className="flex items-center gap-2">
          {renderStars(evaluation.overallStars)}
          <span className="text-sm font-extrabold text-stone-800 ml-1">
            {evaluation.overallLabel}
          </span>
        </div>
        <span className="text-xs font-semibold text-stone-500">
          คะแนนรวม: {evaluation.overallScore.toFixed(2)} / 4.00
        </span>
      </div>

      {/* Sub-scores breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 flex flex-col justify-between">
          <span className="text-stone-500 font-medium mb-1">ความสม่ำเสมอ (วัน)</span>
          <div className="flex items-center justify-between mt-1">
            {renderStars(evaluation.dayStars)}
            <span className="font-bold text-stone-700">{evaluation.dayLabel}</span>
          </div>
        </div>

        <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 flex flex-col justify-between">
          <span className="text-stone-500 font-medium mb-1">ระยะเวลาเฉลี่ย</span>
          <div className="flex items-center justify-between mt-1">
            {renderStars(evaluation.durationStars)}
            <span className="font-bold text-stone-700">{evaluation.durationLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
