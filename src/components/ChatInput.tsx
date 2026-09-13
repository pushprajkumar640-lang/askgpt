import React, { useRef, useEffect, useState } from "react";
import { Paperclip, Mic, MicOff, Send, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Attachment } from "../types";
import { createSpeechRecognition, isSpeechRecognitionSupported } from "../lib/speech";

interface ChatInputProps {
  onSendMessage: (text: string, attachment?: Attachment) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if ((!inputText.trim() && !attachment) || isLoading) return;

    onSendMessage(inputText.trim(), attachment || undefined);
    setInputText("");
    setAttachment(null);

    // Stop listening if speech was ongoing
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Attachment upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (Vercel serverless limit is 4.5MB)
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
    if (file.size > MAX_FILE_SIZE) {
      alert(`The selected file (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 4MB limit for AskGPT processing. Please upload a smaller document.`);
      e.target.value = "";
      return;
    }

    // Supported formats
    const supportedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ];

    const isSupported =
      supportedTypes.includes(file.type.toLowerCase()) ||
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".md") ||
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".json");

    if (!isSupported) {
      alert("Unsupported file format. Please upload a PDF, image, or text/CSV document.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setAttachment({
        name: file.name,
        type: file.type,
        mimeType: file.type || "application/octet-stream",
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
    // Reset file input value so user can upload the same file again if desired
    e.target.value = "";
  };

  // Microphone Voice Input Handler
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported by your browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = createSpeechRecognition();
        if (!recognition) return;

        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-3 pb-4 dark:from-gray-950 dark:via-gray-950/90">
      <div className="mx-auto max-w-3xl px-3 sm:px-4">
        {/* Attachment preview banner */}
        {attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            {attachment.mimeType.startsWith("image/") ? (
              <img
                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                alt="attachment preview"
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                {attachment.name}
              </p>
              <p className="text-[10px] text-gray-400">Attached file ready to send</p>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              title="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div
          id="chat-input-container"
          className={`relative flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-md transition-all dark:bg-gray-900 ${
            isListening
              ? "border-red-500 ring-2 ring-red-500/20"
              : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-gray-800 dark:focus-within:border-indigo-500"
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,.pdf,.txt,.md"
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            id="btn-chat-attachment"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            title="Attach image or file"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Auto-Expanding Textarea */}
          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? "Listening to your voice..." : "Message AskGPT..."
            }
            className="max-h-44 w-full resize-none bg-transparent py-1.5 px-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden dark:text-gray-100 dark:placeholder-gray-500"
          />

          {/* Voice Microphone Input Button */}
          <button
            id="btn-chat-microphone"
            type="button"
            onClick={toggleListening}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            }`}
            title={isListening ? "Stop listening" : "Voice input"}
            aria-label="Microphone"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Send Button */}
          <button
            id="btn-chat-send"
            type="button"
            onClick={handleSend}
            disabled={(!inputText.trim() && !attachment) || isLoading}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              (inputText.trim() || attachment) && !isLoading
                ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
            }`}
            title="Send message"
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Minimal Footer Disclaimer */}
        <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500 select-none">
          AskGPT may produce inaccurate information. Developed by Pushpraj Kumar.
        </p>
      </div>
    </div>
  );
};
