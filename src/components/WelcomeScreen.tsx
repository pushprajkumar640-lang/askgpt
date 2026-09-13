import React from "react";
import { AskGPTEmblem } from "./AskGPTIcon";

export const WelcomeScreen: React.FC = () => {
  return (
    <div
      id="askgpt-welcome-screen"
      className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center select-none"
    >
      {/* AskGPT Emblem */}
      <div className="mb-6">
        <AskGPTEmblem size="xl" />
      </div>

      {/* Main Heading */}
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        Welcome to AskGPT
      </h2>

      {/* Subtitle */}
      <p className="mt-2 text-base font-medium text-indigo-600 dark:text-indigo-400">
        Ask anything. Get intelligent answers.
      </p>

      {/* Minimal helper text */}
      <p className="mt-4 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Ask questions, analyze documents or images, generate code, and explore endless possibilities with intelligent AI assistance.
      </p>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Developed by Pushpraj Kumar
      </p>
    </div>
  );
};
