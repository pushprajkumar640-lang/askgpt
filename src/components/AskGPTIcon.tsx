import React from "react";

interface AskGPTIconProps {
  className?: string;
  size?: number;
}

/**
 * AskGPT Official Brand Icon
 * A clean, modern speech bubble harmoniously combined with an intelligent AI spark star.
 * Minimalist, professional, high-contrast, and recognizable at both 16px and 80px+.
 */
export const AskGPTIcon: React.FC<AskGPTIconProps> = ({
  className = "h-5 w-5",
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Speech bubble silhouette with smooth rounded corners and clean conversation tail */}
      <path
        d="M12 2C6.477 2 2 6.029 2 11C2 13.385 3.064 15.547 4.83 17.106L3.545 20.82C3.376 21.309 3.842 21.758 4.318 21.564L8.71 19.774C9.756 20.05 10.858 20.2 12 20.2C17.523 20.2 22 16.171 22 11.2C22 6.029 17.523 2 12 2Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      
      {/* Central 4-point AI Intelligence Spark Star */}
      <path
        d="M11.5 5.8C11.5 7.8 12.8 9.2 15 9.2C12.8 9.2 11.5 10.6 11.5 12.6C11.5 10.6 10.2 9.2 8 9.2C10.2 9.2 11.5 7.8 11.5 5.8Z"
        fill="currentColor"
      />

      {/* Secondary accent spark indicating rapid thinking / neural connectivity */}
      <path
        d="M16.5 11.5C16.5 12.6 17.2 13.4 18.5 13.4C17.2 13.4 16.5 14.2 16.5 15.3C16.5 14.2 15.8 13.4 14.5 13.4C15.8 13.4 16.5 12.6 16.5 11.5Z"
        fill="currentColor"
      />

      {/* Subtle bottom-left neural particle */}
      <circle cx="7.5" cy="14.5" r="0.9" fill="currentColor" />
    </svg>
  );
};

/**
 * AskGPT Emblem / Badge Wrapper
 * Used consistently across Header, Sidebar, Chat Avatar, Settings About, and Welcome Screen.
 */
interface AskGPTEmblemProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const AskGPTEmblem: React.FC<AskGPTEmblemProps> = ({
  size = "md",
  className = "",
}) => {
  // Size presets
  const sizeMap = {
    sm: {
      box: "h-7 w-7 rounded-lg",
      icon: "h-4 w-4",
    },
    md: {
      box: "h-8 w-8 rounded-lg",
      icon: "h-4.5 w-4.5",
    },
    lg: {
      box: "h-12 w-12 rounded-xl",
      icon: "h-7 w-7",
    },
    xl: {
      box: "h-20 w-20 rounded-2xl",
      icon: "h-11 w-11",
    },
  };

  const current = sizeMap[size];

  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-sm shadow-indigo-500/25 shrink-0 ${current.box} ${className}`}
    >
      <AskGPTIcon className={`${current.icon} text-white drop-shadow-xs`} />
    </div>
  );
};
