import React, { useState, useEffect } from "react";
import {
  SquarePen,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Sun,
  Moon,
  Laptop,
  MoreVertical,
  Share2,
} from "lucide-react";
import { Conversation } from "../types";
import { AskGPTEmblem } from "./AskGPTIcon";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e?: React.MouseEvent) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  theme: "dark" | "light" | "system";
  onSelectTheme: (theme: "dark" | "light" | "system") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  theme,
  onSelectTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmConv, setDeleteConfirmConv] = useState<Conversation | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Close active dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveRename = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveRename(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  const handleShare = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);

    const formattedTranscript = conv.messages
      .map((m) => `${m.role === "user" ? "User" : "AskGPT"}:\n${m.content}`)
      .join("\n\n---\n\n");

    const shareData = {
      title: `${conv.title} - AskGPT`,
      text: formattedTranscript,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(formattedTranscript);
      setShareToast("Conversation copied to clipboard!");
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast("Failed to copy conversation.");
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  const requestDelete = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setDeleteConfirmConv(conv);
  };

  // Filter conversations by both title and message content
  const query = searchQuery.trim().toLowerCase();
  const filteredConversations = query
    ? conversations.filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(query)) ||
          (c.messages &&
            c.messages.some(
              (m) => m.content && m.content.toLowerCase().includes(query)
            ))
      )
    : conversations;

  // Sort conversations by latest activity (updatedAt or createdAt)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt;
    const timeB = b.updatedAt || b.createdAt;
    return timeB - timeA;
  });

  // Calendar-day based date grouping: TODAY, YESTERDAY, PREVIOUS 7 DAYS, OLDER
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const groups: { [key: string]: Conversation[] } = {
    TODAY: [],
    YESTERDAY: [],
    "PREVIOUS 7 DAYS": [],
    OLDER: [],
  };

  sortedConversations.forEach((c) => {
    const time = c.updatedAt || c.createdAt;
    const diffDays = Math.floor((todayStart - time) / oneDayMs) + (time >= todayStart ? 0 : 1);

    if (time >= todayStart) {
      groups["TODAY"].push(c);
    } else if (diffDays <= 1) {
      groups["YESTERDAY"].push(c);
    } else if (diffDays <= 7) {
      groups["PREVIOUS 7 DAYS"].push(c);
    } else {
      groups["OLDER"].push(c);
    }
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmConv && (
        <div
          id="modal-delete-chat-confirm"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setDeleteConfirmConv(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete conversation?
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This will permanently delete this conversation and its history.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800/80 dark:bg-gray-950/60">
              <p className="text-xs font-medium text-gray-800 truncate dark:text-gray-200">
                {deleteConfirmConv.title || "Untitled Conversation"}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmConv(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={() => {
                  onDeleteConversation(deleteConfirmConv.id);
                  setDeleteConfirmConv(null);
                }}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-red-700 active:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast Notification */}
      {shareToast && (
        <div
          id="toast-share-success"
          className="fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md dark:bg-white dark:text-gray-900"
        >
          {shareToast}
        </div>
      )}

      {/* Sidebar Container */}
      <aside
        id="askgpt-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950 lg:static lg:z-auto ${
          isOpen
            ? "w-72 translate-x-0 shadow-xl lg:shadow-none"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:overflow-hidden pointer-events-none lg:pointer-events-auto"
        }`}
        aria-label="AskGPT Navigation Drawer"
      >
        <div className="flex h-full w-72 flex-col overflow-hidden">
          {/* Top Header: Logo, Title, and Close (X) button */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800/80">
            <div className="flex items-center gap-2.5 select-none">
              <AskGPTEmblem size="md" />
              <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                AskGPT
              </span>
            </div>

            <button
              id="btn-close-sidebar"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Action Controls: Search Chats & New Chat */}
          <div className="shrink-0 space-y-2 p-3">
            {/* Search Chats */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                id="sidebar-search-input"
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-xs text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-950"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* New Chat Button */}
            <button
              id="btn-sidebar-new-chat"
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200/90 bg-gray-50/90 px-3.5 py-2.5 text-xs font-semibold text-gray-800 shadow-2xs transition-colors hover:bg-gray-100 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-gray-700"
            >
              <div className="flex items-center gap-2.5">
                <SquarePen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>New Chat</span>
              </div>
              <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">⌘N</span>
            </button>
          </div>

          {/* Recents Header */}
          <div className="shrink-0 px-3 pt-1 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              RECENTS
            </span>
            {sortedConversations.length > 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                {sortedConversations.length}
              </span>
            )}
          </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 select-none">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {searchQuery ? "No matching chats found." : "No chat history yet."}
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([groupTitle, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupTitle} className="mb-3">
                  <div className="px-2 pt-2.5 pb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                    {groupTitle}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((conv) => {
                      const isActive = conv.id === activeId;
                      const isEditing = conv.id === editingId;

                      return (
                        <div
                          key={conv.id}
                          id={`chat-item-${conv.id}`}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                            isActive
                              ? "bg-gray-200/75 font-medium text-gray-950 dark:bg-gray-800 dark:text-white"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900/70"
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden pr-1 w-full min-w-0">
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                              }`}
                            />

                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(conv.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded border border-indigo-500 bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-hidden dark:bg-gray-800 dark:text-gray-100"
                              />
                            ) : (
                              <span className="truncate font-medium">{conv.title || "Untitled Chat"}</span>
                            )}
                          </div>

                          {/* Options Control */}
                          <div className="relative shrink-0 pl-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => saveRename(conv.id, e)}
                                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                  title="Save title"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(null);
                                  }}
                                  className="rounded p-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`btn-chat-options-${conv.id}`}
                                  type="button"
                                  onClick={(e) => handleToggleMenu(conv.id, e)}
                                  className={`flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 transition-opacity ${
                                    isActive || activeMenuId === conv.id
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  }`}
                                  title="Chat options"
                                  aria-label="Chat options"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {/* 3-Dot Dropdown Menu */}
                                {activeMenuId === conv.id && (
                                  <div
                                    id={`chat-menu-${conv.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-7 z-50 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                                  >
                                    <button
                                      id={`btn-menu-rename-${conv.id}`}
                                      type="button"
                                      onClick={(e) => startRename(conv, e)}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                                      <span>Rename</span>
                                    </button>
                                    <button
                                      id={`btn-menu-share-${conv.id}`}
                                      type="button"
                                      onClick={(e) => handleShare(conv, e)}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                      <Share2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                                      <span>Share</span>
                                    </button>
                                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                    <button
                                      id={`btn-menu-delete-${conv.id}`}
                                      type="button"
                                      onClick={(e) => requestDelete(conv, e)}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Settings, Theme & User Profile (Fixed at bottom) */}
        <div className="shrink-0 space-y-2.5 border-t border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-950/80">
          {/* Settings Button */}
          <button
            id="btn-sidebar-settings"
            type="button"
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>Settings</span>
          </button>

          {/* Theme Selector (Light, Dark, System) */}
          <div className="rounded-xl border border-gray-200/80 bg-gray-200/50 p-1 dark:border-gray-800/80 dark:bg-gray-900/60">
            <div className="grid grid-cols-3 gap-1 text-[11px] font-medium">
              <button
                id="btn-theme-light"
                type="button"
                onClick={() => onSelectTheme("light")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
                  theme === "light"
                    ? "bg-white text-amber-600 font-semibold shadow-2xs ring-1 ring-black/5 dark:bg-gray-800 dark:text-amber-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                id="btn-theme-dark"
                type="button"
                onClick={() => onSelectTheme("dark")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
                  theme === "dark"
                    ? "bg-white text-indigo-600 font-semibold shadow-2xs ring-1 ring-black/5 dark:bg-gray-800 dark:text-indigo-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Dark</span>
              </button>

              <button
                id="btn-theme-system"
                type="button"
                onClick={() => onSelectTheme("system")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
                  theme === "system"
                    ? "bg-white text-gray-900 font-semibold shadow-2xs ring-1 ring-black/5 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                title="System Preference"
              >
                <Laptop className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* User / Profile Area */}
          <div
            id="sidebar-user-profile"
            className="flex items-center gap-2.5 rounded-xl border border-gray-200/80 bg-white/80 p-2 dark:border-gray-800/80 dark:bg-gray-900/70"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-xs font-bold tracking-wider text-white shadow-2xs">
              PK
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                Pushpraj Kumar
              </span>
              <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                Developed by Pushpraj Kumar
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
