import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function SummaryCard({ title, value, icon, trend }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#64748B] mb-1">{title}</p>
          <h3 className="text-3xl font-semibold text-[#1F2937]">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-[#F1F5F9] rounded-lg flex items-center justify-center text-[#4F46E5]">
          {icon}
        </div>
      </div>
    </div>
  );
}
