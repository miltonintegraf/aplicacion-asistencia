import React from "react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
    value: "text-blue-700",
  },
  green: {
    bg: "bg-green-100",
    icon: "text-green-600",
    value: "text-green-700",
  },
  red: {
    bg: "bg-red-100",
    icon: "text-red-600",
    value: "text-red-700",
  },
  yellow: {
    bg: "bg-yellow-100",
    icon: "text-yellow-600",
    value: "text-yellow-700",
  },
  purple: {
    bg: "bg-purple-100",
    icon: "text-purple-600",
    value: "text-purple-700",
  },
  indigo: {
    bg: "bg-indigo-100",
    icon: "text-indigo-600",
    value: "text-indigo-700",
  },
};

export function StatsCard({
  label,
  value,
  icon,
  trend,
  color = "blue",
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${colors.value}`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className={`w-4 h-4 ${trend.positive ? "text-green-500" : "text-red-500"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {trend.positive ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                )}
              </svg>
              <span
                className={`text-sm font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}
              >
                {trend.value}%
              </span>
              <span className="text-sm text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <div className={`w-6 h-6 ${colors.icon}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
