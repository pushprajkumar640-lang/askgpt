// Web Speech API Integration for Microphone and Audio controls

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

export function createSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionClass) return null;

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-IN";
  return recognition;
}

export function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return resolve([]);
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      return resolve(voices);
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };

    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

export function speakText(
  text: string,
  options?: {
    voiceName?: string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  // Clean Markdown and mathematical notation for natural speech
const cleanText = text
  // Remove code blocks completely
  .replace(/```[\s\S]*?```/g, " ")

  // Remove inline code formatting
  .replace(/`([^`]+)`/g, "$1")

  // Convert common math symbols to spoken English
  .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1 divided by $2")
  .replace(/\\sqrt\s*\{([^{}]*)\}/g, "square root of $1")
  .replace(/\\int/g, "integral")
  .replace(/\\sum/g, "sum")
  .replace(/\\infty/g, "infinity")
  .replace(/\\times/g, "times")
  .replace(/\\cdot/g, "times")
  .replace(/\\pm/g, "plus or minus")
  .replace(/\\leq/g, "less than or equal to")
  .replace(/\\geq/g, "greater than or equal to")
  .replace(/\\neq/g, "not equal to")

  // Remove LaTeX commands that may remain
  .replace(/\\[a-zA-Z]+/g, " ")

  // Remove LaTeX braces
  .replace(/[{}]/g, " ")

  // Remove dollar signs used for math delimiters
  .replace(/\$\$/g, " ")
  .replace(/\$/g, " ")

  // Remove Markdown formatting
  .replace(/[*_~#>-]/g, " ")

  // Convert Markdown links to their visible text
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

  // Clean extra spaces
  .replace(/\s+/g, " ")
  .trim();

  if (!cleanText) return null;

  const utterance = new SpeechSynthesisUtterance(cleanText);

// Indian English
utterance.lang = "en-IN";

// Natural and clear speaking speed
utterance.rate = options?.rate || 0.9;
utterance.pitch = 1.0;

 const voices = window.speechSynthesis.getVoices();

if (options?.voiceName) {
  const chosenVoice = voices.find(
    (v) => v.name === options.voiceName
  );

  if (chosenVoice) {
    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang;
  }
} else {
  const indianVoice = voices.find(
    (v) => v.lang.toLowerCase() === "en-in"
  );

  if (indianVoice) {
    utterance.voice = indianVoice;
    utterance.lang = "en-IN";
  }
}
  if (options?.onStart) utterance.onstart = options.onStart;
  if (options?.onEnd) utterance.onend = options.onEnd;
  if (options?.onError) utterance.onerror = options.onError;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
