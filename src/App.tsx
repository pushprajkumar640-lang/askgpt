import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { SettingsModal } from "./components/SettingsModal";
import { AskGPTEmblem } from "./components/AskGPTIcon";
import { Conversation, Message, AppSettings, Attachment } from "./types";
import { sendChatMessage } from "./lib/api";
import { speakText, stopSpeaking } from "./lib/speech";
import { generateConversationTitle } from "./lib/titleGenerator";
import { checkProfanity, RESPECTFUL_WARNING } from "./lib/profanityFilter";
import { Loader2, AlertCircle } from "lucide-react";

const DEFAULT_SETTINGS: AppSettings = {
  apiUrl: "",
  theme: "system",
  autoSpeak: false,
  voiceName: "",
  speechRate: 1.0,
};

export default function App() {
  // 1. Settings state & Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("infinity_settings");
      const parsed = saved ? JSON.parse(saved) : {};
      const envApiUrl = (import.meta as any).env?.VITE_API_URL;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // If VITE_API_URL is configured, it must take precedence over old localStorage settings
        apiUrl:
          envApiUrl && typeof envApiUrl === "string" && envApiUrl.trim() !== ""
            ? envApiUrl.trim()
            : (parsed.apiUrl || ""),
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // 2. Conversations state & Persistence
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem("infinity_conversations");
      if (!saved) return [];
      const parsed: Conversation[] = JSON.parse(saved);
      return parsed.map((c) => {
        // Automatically upgrade empty, generic or raw messages to clean titles
        if (
          (!c.title || c.title === "New Chat" || c.title.length > 35) &&
          c.messages &&
          c.messages.length > 0
        ) {
          const firstUserMsg = c.messages.find((m) => m.role === "user");
          if (firstUserMsg && firstUserMsg.content) {
            return {
              ...c,
              title: generateConversationTitle(firstUserMsg.content, firstUserMsg.attachment),
            };
          }
        }
        return c;
      });
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      const savedLastActive = localStorage.getItem("infinity_active_chat");
      return savedLastActive || null;
    } catch {
      return null;
    }
  });

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Global Keyboard Shortcuts (e.g. Cmd+N / Ctrl+N for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("infinity_settings", JSON.stringify(settings));
      const envApiUrl = (import.meta as any).env?.VITE_API_URL;
      if (!envApiUrl) {
        if (settings.apiUrl) {
          localStorage.setItem("infinity_api_url", settings.apiUrl);
        } else {
          localStorage.removeItem("infinity_api_url");
        }
      } else {
        localStorage.removeItem("infinity_api_url");
      }
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("infinity_conversations", JSON.stringify(conversations));
    } catch (e) {
      console.error(e);
    }
  }, [conversations]);

  // Sync activeConversationId to localStorage
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem("infinity_active_chat", activeConversationId);
    } else {
      localStorage.removeItem("infinity_active_chat");
    }
  }, [activeConversationId]);

  // Theme synchronization with html root class
  useEffect(() => {
    const root = document.documentElement;
    const applyDark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (applyDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const listener = (e: MediaQueryListEvent) => {
      if (settings.theme === "system") {
        if (e.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [settings.theme]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConversation
    ? warningMessage
      ? [...activeConversation.messages, warningMessage]
      : activeConversation.messages
    : warningMessage
    ? [warningMessage]
    : [];

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isLoading]);

  // Set Theme handler with smooth transition
  const handleSetTheme = (newTheme: "dark" | "light" | "system") => {
    document.documentElement.classList.add("theme-transition");
    setSettings((prev) => ({
      ...prev,
      theme: newTheme,
    }));
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 300);
  };

  // Start a New Chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setWarningMessage(null);
    setErrorMsg(null);
    handleStopSpeaking();
  };

  // Select existing conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setWarningMessage(null);
    setErrorMsg(null);
    handleStopSpeaking();
  };

  // Delete a conversation
  const handleDeleteConversation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    handleStopSpeaking();
  };

  // Rename a conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Clear all chats
  const handleClearAllChats = () => {
    setConversations([]);
    setActiveConversationId(null);
    setWarningMessage(null);
    handleStopSpeaking();
  };

  // Rate an AI response (Like / Dislike)
  const handleRateMessage = (messageId: string, rating: "like" | "dislike" | null) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, rating } : m
            ),
          };
        }
        return c;
      })
    );
  };

  // Regenerate an AI response
  const handleRegenerateMessage = async (messageId: string) => {
    if (isLoading || !activeConversationId) return;

    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (!currentConv) return;

    const targetIndex = currentConv.messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    // Find the user message directly preceding this AI message
    let precedingUserMsgIndex = -1;
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (currentConv.messages[i].role === "user") {
        precedingUserMsgIndex = i;
        break;
      }
    }

    if (precedingUserMsgIndex === -1) return;

    const userMessage = currentConv.messages[precedingUserMsgIndex];
    // Keep messages up to the user message
    const trimmedMessages = currentConv.messages.slice(0, precedingUserMsgIndex + 1);
    const historyToSend = currentConv.messages.slice(0, precedingUserMsgIndex);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: trimmedMessages, updatedAt: Date.now() }
          : c
      )
    );

    setIsLoading(true);
    setErrorMsg(null);
    handleStopSpeaking();

    try {
      const result = await sendChatMessage(
        userMessage.content,
        historyToSend,
        userMessage.attachment
      );

      const assistantMessage: Message = {
        id: "msg-" + Date.now() + "-assistant",
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [...trimmedMessages, assistantMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );

      if (settings.autoSpeak) {
        handleSpeak(result.text, assistantMessage.id);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorText =
        err?.message || "Failed to regenerate response. Please check your connection.";
      setErrorMsg(errorText);

      const errorMessage: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: `⚠️ **AskGPT Error**: ${errorText}`,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [...trimmedMessages, errorMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Speech / Audio controls
  const handleSpeak = (text: string, messageId: string) => {
    handleStopSpeaking();
    setSpeakingMessageId(messageId);
    speakText(text, {
      voiceName: settings.voiceName,
      rate: settings.speechRate,
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
  };

  // Sending message
  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    if ((!text.trim() && !attachment) || isLoading) return;

    setErrorMsg(null);

    // 1. Check for abusive, vulgar, or offensive language before sending to Gemini or storing
    const moderation = checkProfanity(text);
    if (moderation.isAbusive) {
      const warningText = moderation.warningText || RESPECTFUL_WARNING;
      const warningMsg: Message = {
        id: "msg-" + Date.now() + "-warning",
        role: "assistant",
        content: warningText,
        timestamp: Date.now(),
      };

      setWarningMessage(warningMsg);

      if (settings.autoSpeak) {
        handleSpeak(warningText, warningMsg.id);
      }
      return;
    }

    // Clean question: clear any previous transient warning
    setWarningMessage(null);

    const userMessage: Message = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      content: text,
      timestamp: Date.now(),
      attachment,
    };

    let targetConvId = activeConversationId;
    let updatedConversations = [...conversations];

    // If starting a fresh chat without existing ID
    if (!targetConvId) {
      targetConvId = "conv-" + Date.now();
      const generatedTitle = generateConversationTitle(text, attachment);
      const newConv: Conversation = {
        id: targetConvId,
        title: generatedTitle,
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updatedConversations = [newConv, ...conversations];
      setActiveConversationId(targetConvId);
      setConversations(updatedConversations);
    } else {
      // Append to current conversation
      updatedConversations = updatedConversations.map((c) => {
        if (c.id === targetConvId) {
          const isFirstUserMessage = c.messages.filter((m) => m.role === "user").length === 0;
          const shouldUpdateTitle = isFirstUserMessage || c.title === "New Chat" || c.title === "Untitled Chat" || !c.title;
          return {
            ...c,
            title: shouldUpdateTitle ? generateConversationTitle(text, attachment) : c.title,
            messages: [...c.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return c;
      });
      setConversations(updatedConversations);
    }

    setIsLoading(true);

    try {
      const activeConv = updatedConversations.find((c) => c.id === targetConvId);
      const historyToSend = activeConv ? activeConv.messages.slice(0, -1) : [];

      const result = await sendChatMessage(text, historyToSend, attachment);

      if (result.blocked) {
        const warningMsg: Message = {
          id: "msg-" + Date.now() + "-warning",
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
        };
        setWarningMessage(warningMsg);
        // Remove the user message from conversations so history remains unpolluted
        setConversations((prev) =>
          prev
            .map((c) => {
              if (c.id === targetConvId) {
                return {
                  ...c,
                  messages: c.messages.filter((m) => m.id !== userMessage.id),
                };
              }
              return c;
            })
            .filter((c) => c.messages.length > 0)
        );
        if (!conversations.some((c) => c.id === targetConvId)) {
          setActiveConversationId(null);
        }
        if (settings.autoSpeak) {
          handleSpeak(result.text, warningMsg.id);
        }
        return;
      }

      const assistantMessage: Message = {
        id: "msg-" + Date.now() + "-assistant",
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConvId) {
            return {
              ...c,
              messages: [...c.messages, assistantMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );

      // If auto-speak enabled in settings, speak response
      if (settings.autoSpeak) {
        handleSpeak(result.text, assistantMessage.id);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorText = err?.message || "Failed to reach AskGPT. Please check your connection.";
      setErrorMsg(errorText);

      const errorMessage: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: `⚠️ **AskGPT Error**: ${errorText}`,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConvId) {
            return {
              ...c,
              messages: [...c.messages, errorMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={settings.theme}
        onSelectTheme={handleSetTheme}
      />

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col h-full overflow-hidden">
        {/* Header Component (Clean: only Hamburger + AskGPT branding) */}
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Chat Messages or Welcome Screen */}
        <main className="flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6 md:px-8 py-6 space-y-6 sm:space-y-7">
              {currentMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isSpeaking={speakingMessageId === msg.id}
                  onSpeak={handleSpeak}
                  onStopSpeaking={handleStopSpeaking}
                  onRate={handleRateMessage}
                  onRegenerate={msg.id === warningMessage?.id ? undefined : handleRegenerateMessage}
                  isLoading={isLoading}
                />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-3 pt-1 text-xs text-gray-500 dark:text-gray-400">
                  <AskGPTEmblem size="md" />
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>AskGPT is thinking...</span>
                  </div>
                </div>
              )}

              {/* Error Toast / Alert Banner if request fails */}
              {errorMsg && (
                <div className="mx-auto max-w-3xl px-4 py-2">
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button
                      onClick={() => setErrorMsg(null)}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Chat Input Component */}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
        onClearAllChats={handleClearAllChats}
      />
    </div>
  );
}
