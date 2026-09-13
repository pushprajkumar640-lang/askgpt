import React from "react";
import { Menu } from "lucide-react";
import { AskGPTEmblem } from "./AskGPTIcon";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header
      id="askgpt-header"
      className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-gray-200 bg-white/90 px-3 backdrop-blur-md transition-colors dark:border-gray-850 dark:bg-gray-950/90 sm:px-4"
    >
      <div className="flex items-center gap-3">
        {/* Hamburger Menu button */}
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* AskGPT Branding */}
        <div className="flex items-center gap-2.5 select-none">
          <AskGPTEmblem size="md" />
          <span className="font-semibold tracking-tight text-gray-900 dark:text-white text-base sm:text-lg">
            AskGPT
          </span>
        </div>
      </div>
    </header>
  );
};


