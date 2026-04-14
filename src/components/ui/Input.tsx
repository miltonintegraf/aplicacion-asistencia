"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full px-4 py-3 rounded-lg border
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          text-gray-900 placeholder-gray-400
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          transition
          ${error ? "border-red-300 bg-red-50 focus:ring-red-400" : "border-gray-200 bg-white"}
          ${className}
        `}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-400">{helperText}</p>
      )}
    </div>
  );
}
