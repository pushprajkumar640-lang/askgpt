import { checkProfanity } from "./profanityFilter";

/**
 * Intelligent conversation title generator for AskGPT.
 * Extracts the core subject/topic from the initial user prompt,
 * producing concise, clean, 2-6 word titles in Title Case.
 */

// Well-known technical abbreviations and acronyms to keep preserved in uppercase
const ACRONYMS = new Set([
  "AI",
  "API",
  "APIS",
  "OOP",
  "C++",
  "C#",
  ".NET",
  "SQL",
  "NOSQL",
  "HTML",
  "CSS",
  "JS",
  "TS",
  "UI",
  "UX",
  "PDF",
  "URL",
  "HTTP",
  "HTTPS",
  "REST",
  "TCP",
  "UDP",
  "IP",
  "JSON",
  "XML",
  "JWT",
  "AWS",
  "GCP",
  "LLM",
  "LLMS",
  "NLP",
  "ML",
  "DL",
  "GPU",
  "CPU",
  "RAM",
  "OS",
  "ROM",
  "SDK",
  "CLI",
  "DOM",
  "SVG",
  "REGEX",
  "SEO",
  "CI/CD",
]);

// Minor words that remain lowercase in Title Case unless they are the first word
const MINOR_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "in",
  "on",
  "at",
  "to",
  "by",
  "of",
  "up",
  "as",
  "via",
  "vs",
]);

/**
 * Converts a string to clean Title Case, honoring technical acronyms and minor words.
 */
function toTitleCase(str: string): string {
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  return words
    .map((word, index) => {
      // Check for acronyms like OOP, C++, API
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) {
        // Special case for C++ / C#
        if (upper === "C++") return "C++";
        if (upper === "C#") return "C#";
        return upper;
      }

      // Check lowercase for minor words (except the first word)
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower)) {
        return lower;
      }

      // Capitalize first letter, keep rest lowercase unless all uppercase acronym
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Cleans punctuation and markdown from prompt
 */
function cleanText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`([^`]+)`/g, "$1") // remove inline code
    .replace(/[*_~#>]/g, " ") // remove markdown characters
    .replace(/["'“”‘’]/g, "") // remove quotes
    .replace(/[^\w\s+#!.-]/g, " ") // keep alphanumeric and symbols like C++, C#, .NET
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intelligent topic extraction from the user's first message.
 */
export function generateConversationTitle(
  prompt: string,
  attachment?: { name: string; type?: string }
): string {
  // 1. If message is empty or whitespace-only but has an attachment
  if (!prompt || !prompt.trim()) {
    if (attachment && attachment.name) {
      const cleanFileName = attachment.name
        .replace(/\.[^/.]+$/, "") // Remove file extension
        .replace(/[-_]+/g, " ")
        .trim();
      const title = toTitleCase(cleanFileName);
      return title.length > 0 ? title.slice(0, 32) : "Attachment";
    }
    return "New Conversation";
  }

  let text = prompt.trim();

  // Strip greetings at the very beginning (e.g., "Hi,", "Hello!", "Hey there,")
  const greetingMatch = text.match(/^(?:hi|hello|hey|greetings|good\s+(?:morning|afternoon|evening))\b[,\s!]*(.*)$/i);
  if (greetingMatch) {
    const remainder = greetingMatch[1].trim();
    if (!remainder) {
      return "Hello";
    }
    text = remainder;
  }

  // Common conversational prefixes to strip
  const prefixPatterns: RegExp[] = [
    // "Can you (please) explain / tell me / help me with / provide / give me..."
    /^(?:can|could|would)\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:explain|tell\s+me|help\s+me\s+with|provide|give\s+me|show\s+me|teach\s+me|write|summarize|list|find)\s+(?:to\s+me\s+)?(?:about\s+|what\s+is\s+|what\s+are\s+)?/i,
    // "Please explain / tell me / give me / teach me..."
    /^(?:please\s+)?(?:kindly\s+)?(?:explain|tell\s+me|give\s+me|show\s+me|teach\s+me|describe|define|discuss|clarify|elaborate\s+on)\s+(?:to\s+me\s+)?(?:about\s+|what\s+is\s+|what\s+are\s+)?/i,
    // "What is / What are / What was / What were (the definition/concept/meaning of)..."
    /^(?:what|who|where|why)\s+(?:is|are|was|were)\s+(?:the\s+meaning\s+of\s+|the\s+definition\s+of\s+|the\s+concept\s+of\s+|the\s+difference\s+between\s+|an\s+|a\s+|the\s+)?/i,
    // "How do I / How to / How can I / How does..."
    /^(?:how\s+(?:do\s+i|can\s+i|does|do|to|should\s+i)\s+)/i,
    // "Give me some information / details / overview about..."
    /^(?:give\s+me\s+(?:some\s+)?(?:information|info|details|an\s+overview|a\s+summary|notes)\s+(?:about|on|regarding)\s+)/i,
    // "I want / need to know / learn about..."
    /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+know|information|info|help|to\s+learn)\s+(?:about|on|with)\s+)/i,
    // General action verbs: "Write (me) (some / a / few)...", "Create...", "Generate..."
    /^(?:write|create|generate|make|build|list|show|give\s+me|provide)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+|few\s+)?/i,
    // "Difference between..."
    /^(?:difference\s+between\s+)/i,
    // "Tell me about..."
    /^(?:tell\s+me\s+about\s+)/i,
  ];

  for (const pattern of prefixPatterns) {
    if (pattern.test(text)) {
      text = text.replace(pattern, "");
      break;
    }
  }

  // Strip leading determiners and filler words (e.g. "some", "a few", "a", "an", "the", "examples of", "concept of")
  text = text.replace(/^(?:some|a\s+few|few|several|the|a|an|examples?\s+of|concept\s+of|basics?\s+of|overview\s+of)\s+/i, "");

  // Handle "what [X] is in [Y]" or "[X] is in [Y]" pattern -> e.g. "inheritance is in OOP" => "Inheritance in OOP"
  const isPattern = text.match(/^(.+?)\s+(?:is|are|means)\s+(in\s+.+)$/i);
  if (isPattern) {
    text = `${isPattern[1]} ${isPattern[2]}`;
  }

  // Trailing suffixes to strip (e.g. "in detail with examples", "and how it works", "step by step", "with formula")
  const suffixPatterns: RegExp[] = [
    /\s+(?:in\s+detail(?:\s+with\s+examples)?|with\s+detail(?:\s+and\s+examples)?)\s*[.?!]*$/i,
    /\s+(?:with\s+examples?|with\s+code|with\s+explanation|with\s+solutions?|with\s+formulas?|with\s+diagrams?)\s*[.?!]*$/i,
    /\s+(?:and\s+how\s+does\s+it\s+work|and\s+how\s+it\s+works|and\s+why(?:\s+it\s+matters)?)\s*[.?!]*$/i,
    /\s+(?:step\s+by\s+step|for\s+beginners|from\s+scratch|easy\s+explanation)\s*[.?!]*$/i,
    /\s+(?:please|kindly|thanks|thank\s+you)\s*[.?!]*$/i,
  ];

  for (const suffix of suffixPatterns) {
    text = text.replace(suffix, "");
  }

  // Clean remaining punctuation and symbols
  text = cleanText(text);

  // If after cleaning we ended up empty, fallback to first few words of prompt
  if (!text) {
    text = cleanText(prompt);
  }

  // Break into words and limit to 2 - 5 words (or at most 6 words if meaningful)
  let words = text.split(/\s+/).filter(Boolean);

  // Filter out any abusive or vulgar words from words list
  words = words.filter((w) => !checkProfanity(w).isAbusive);

  let finalWords: string[];
  if (words.length <= 5) {
    finalWords = words;
  } else {
    // If more than 5 words, take first 4 or 5
    finalWords = words.slice(0, 5);
  }

  const rawTitle = finalWords.join(" ").trim();
  let formattedTitle = toTitleCase(rawTitle);

  // Final check: ensure no abusive word in formatted title
  if (checkProfanity(formattedTitle).isAbusive) {
    formattedTitle = "";
  }

  // If there is an attachment and title is very short, optionally append or format
  if (attachment && attachment.name && words.length <= 2 && !formattedTitle.toLowerCase().includes("pdf")) {
    if (attachment.name.toLowerCase().endsWith(".pdf")) {
      return formattedTitle ? `${formattedTitle} (PDF)` : "PDF Document";
    }
  }

  return formattedTitle || "Conversation";
}
