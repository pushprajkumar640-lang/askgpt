import React, { useState, useEffect } from "react";
import {
  X,
  Server,
  Moon,
  Sun,
  Volume2,
  Trash2,
  Check,
  RefreshCw,
  Sliders,
  Info,
  Laptop,
  Mic,
  AlertCircle,
} from "lucide-react";
import { AppSettings } from "../types";
import { AskGPTEmblem } from "./AskGPTIcon";
import { checkServerHealth } from "../lib/api";
import { getBrowserVoices, isSpeechRecognitionSupported } from "../lib/speech";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearAllChats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllChats,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "server" | "audio" | "about">("general");
  const [speechInputSupported, setSpeechInputSupported] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setUrlError(null);
    setHealthStatus(null);
    setConfirmClearOpen(false);
  }, [settings, isOpen]);

  useEffect(() => {
    if (isOpen) {
      getBrowserVoices().then(setVoices);
      setSpeechInputSupported(isSpeechRecognitionSupported());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle theme selection with smooth transition
  const handleSelectTheme = (theme: "light" | "dark" | "system") => {
    document.documentElement.classList.add("theme-transition");
    setLocalSettings((prev) => ({ ...prev, theme }));
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 300);
  };

  // Test server connectivity
  const handleTestConnection = async () => {
    const trimmed = localSettings.apiUrl.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    setUrlError(null);
    setIsCheckingHealth(true);
    setHealthStatus(null);

    const res = await checkServerHealth(trimmed);
    setHealthStatus({
      ok: res.ok,
      message: res.ok
        ? "Connected successfully to backend service."
        : `Connection failed: ${res.message || "Unable to reach server"}`,
    });
    setIsCheckingHealth(false);
  };

  // Validate URL and save settings
  const handleSave = () => {
    const trimmed = localSettings.apiUrl.trim().replace(/\/+$/, ""); // remove trailing slashes
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setActiveTab("server");
      setUrlError("Please enter a valid URL starting with http:// or https:// (or leave empty).");
      return;
    }

    setUrlError(null);
    onSaveSettings({
      ...localSettings,
      apiUrl: trimmed,
    });
    onClose();
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-800 dark:bg-gray-900"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-gray-900 dark:text-white">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            title="Close settings"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-3 text-xs font-medium dark:border-gray-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>General & Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("server")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "server"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>Server / Backend API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "audio"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Voice & Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "about"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>About</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[70vh]">
          {/* TAB 1: General & Theme */}
          {activeTab === "general" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Light Theme Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme("light")}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all text-center ${
                      localSettings.theme === "light"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-gray-800 text-amber-500">
                      <Sun className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">Light</span>
                    {localSettings.theme === "light" && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>

                  {/* Dark Theme Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme("dark")}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all text-center ${
                      localSettings.theme === "dark"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-indigo-300 shadow-xs">
                      <Moon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">Dark</span>
                    {localSettings.theme === "dark" && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>

                  {/* System Theme Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme("system")}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all text-center ${
                      localSettings.theme === "system"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-xs">
                      <Laptop className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">System</span>
                    {localSettings.theme === "system" && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Select your preferred interface appearance. System matches your device settings.
                </p>
              </div>

              {/* Danger Zone: Clear Chat History */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                  Chat Data
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Permanently clear all saved chat conversations from your browser.
                </p>

                {!confirmClearOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All Conversations</span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 dark:border-red-900/80 dark:bg-red-950/40">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                      Are you sure? All chat history will be deleted.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllChats();
                          setConfirmClearOpen(false);
                          onClose();
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                      >
                        Yes, Delete All
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearOpen(false)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Backend API */}
          {activeTab === "server" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Backend API URL (Optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 leading-relaxed">
                  AskGPT uses the built-in same-domain Vercel serverless routes (/api/chat, /api/health). Leave empty for default.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://your-custom-domain.com (leave blank for default)"
                    value={localSettings.apiUrl}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, apiUrl: e.target.value });
                      setUrlError(null);
                    }}
                    className={`flex-1 rounded-xl border bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:bg-white focus:outline-hidden dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-850 ${
                      urlError
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 focus:border-indigo-500 dark:border-gray-750"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isCheckingHealth}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:border-gray-750 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} />
                    <span>Test Connection</span>
                  </button>
                </div>

                {urlError && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{urlError}</span>
                  </div>
                )}

                {healthStatus && (
                  <div
                    className={`mt-2.5 rounded-xl p-2.5 text-xs flex items-center gap-2 ${
                      healthStatus.ok
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                        : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        healthStatus.ok ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span>{healthStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Vercel Serverless Architecture
                </p>
                <p className="leading-relaxed">
                  When left blank, AskGPT directly uses the same-domain Vercel Serverless API (<code>/api/chat</code> and <code>/api/health</code>), communicating with the Gemini API server-side using your <code>GEMINI_API_KEY</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Voice & Audio */}
          {activeTab === "audio" && (
            <div className="space-y-4">
              {/* Voice Input (Microphone) Status */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Voice Input (Speech-to-Text)
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Speak directly into chat using the microphone button
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    speechInputSupported
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {speechInputSupported ? "Supported" : "Not supported"}
                </span>
              </div>

              {/* Auto-read responses toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Auto-read AI Responses
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically speak aloud every reply from AskGPT
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.autoSpeak}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, autoSpeak: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-indigo-600 dark:bg-gray-700 dark:peer-checked:bg-indigo-500 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              {/* TTS Voice Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Text-to-Speech Voice
                </label>
                <select
                  value={localSettings.voiceName}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, voiceName: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Default System Voice</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speech Rate Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  <span>Speech Rate (Speed)</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {localSettings.speechRate.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={localSettings.speechRate}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, speechRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  <span>0.75x (Slower)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.5x (Faster)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: About */}
          {activeTab === "about" && (
            <div className="space-y-4 select-none">
              {/* Main Branding Card */}
              <div className="flex items-center gap-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/30">
                <AskGPTEmblem size="lg" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    AskGPT
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    AI Assistant
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5">
                    Developed by Pushpraj Kumar
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    An intelligent conversational AI assistant built for fast, thoughtful problem-solving and creation.
                  </p>
                </div>
              </div>

              {/* Clean "Built with" Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-850/50 space-y-2.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                  Built with
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "React 19",
                    "Tailwind CSS",
                    "TypeScript",
                    "Vite",
                    "Google Gemini AI",
                    "Web Speech API",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-750 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                Version 1.0.0 • Developed by Pushpraj Kumar
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-950/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
