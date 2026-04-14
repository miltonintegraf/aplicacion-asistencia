"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 focus:ring-blue-500",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 focus:ring-gray-300",
  danger:
    "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300 focus:ring-red-500",
  ghost:
    "bg-transparent hover:bg-gray-100 text-gray-600 disabled:text-gray-300 focus:ring-gray-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
