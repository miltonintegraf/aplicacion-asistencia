import React from "react";

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  title,
  action,
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
