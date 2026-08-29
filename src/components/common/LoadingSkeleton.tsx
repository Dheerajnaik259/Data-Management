import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full bg-white rounded-lg border border-[#E5E0DA] overflow-hidden p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-[#F5F5F4] rounded-md w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2 border-b border-[#F5F5F4]">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-[#F5F5F4] rounded-sm"
                style={{ width: `${Math.floor(100 / cols)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white rounded-lg border border-[#E5E0DA] space-y-3 animate-pulse"
        >
          <div className="h-3 bg-[#F5F5F4] rounded-sm w-1/2" />
          <div className="h-8 bg-[#F5F5F4] rounded-sm w-3/4" />
          <div className="h-3 bg-[#F5F5F4] rounded-sm w-1/3" />
        </div>
      ))}
    </div>
  );
};
