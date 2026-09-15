import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { checkProfanity } from "../src/lib/profanityFilter";

// Maximum allowable attachment base64 length (~4MB raw payload for Vercel Serverless)
const MAX_BASE64_ATTACHMENT_SIZE = 5.5 * 1024 * 1024;

// Permitted MIME types for Gemini document & image understanding
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
];

function isMimeTypeSupported(mimeType?: string): boolean {
  if (!mimeType) return true;
  const lower = mimeType.toLowerCase();
  return (
    ALLOWED_MIME_TYPES.includes(lower) ||
    lower.startsWith("image/") ||
    lower.startsWith("text/")
  );
}

function formatGeminiError(error: any): { statusCode: number; userMessage: string } {
  const errStr = String(error?.message || error?.statusText || error || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);

  // 503 / High demand or model overloaded
  if (
    status === 503 ||
    errStr.includes("503") ||
    errStr.includes("unavailable") ||
    errStr.includes("high demand") ||
    errStr.includes("overloaded") ||
    errStr.includes("model is overloaded")
  ) {
    return {
      statusCode: 503,
      userMessage:
        "AskGPT is currently experiencing high demand. Please wait a few moments and try your message again.",
    };
  }

  // 429 / Rate limit exceeded
  if (
    status === 429 ||
    errStr.includes("429") ||
    errStr.includes("resource_exhausted") ||
    errStr.includes("rate limit") ||
    errStr.includes("quota")
  ) {
    return {
      statusCode: 429,
      userMessage:
        "You've reached the temporary request limit for AskGPT. Please pause for a moment before sending another message.",
    };
  }

  // 401 / 403 / Configuration or API key issues
  if (
    status === 401 ||
    status === 403 ||
    errStr.includes("api_key_invalid") ||
    errStr.includes("permission_denied") ||
    errStr.includes("gemini_api_key") ||
    errStr.includes("api key")
  ) {
    return {
      statusCode: 401,
      userMessage:
        "AskGPT service configuration issue. Please ensure your GEMINI_API_KEY is configured in your environment variables.",
    };
  }

  // General network or server errors
  return {
    statusCode: 500,
    userMessage:
      "AskGPT encountered a temporary server error while generating your response. Please try again in a moment.",
  };
}

// Track search grounding rate-limiting to avoid redundant 429 calls
let lastSearchGroundingQuotaErrorAt = 0;
const SEARCH_COOLDOWN_MS = 60 * 1000; // 60 seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { messages = [], prompt = "", attachment } = body;

    if (!prompt && (!messages || messages.length === 0) && !attachment) {
      return res.status(400).json({ error: "Prompt or message content is required." });
    }

    // Attachment validation (size and format)
    if (attachment?.data) {
      if (typeof attachment.data !== "string" || attachment.data.length > MAX_BASE64_ATTACHMENT_SIZE) {
        return res.status(413).json({
          error: "The attached document exceeds the maximum 4MB size limit. Please upload a smaller file.",
          message: "The attached document exceeds the maximum 4MB size limit. Please upload a smaller file.",
        });
      }

      if (attachment.mimeType && !isMimeTypeSupported(attachment.mimeType)) {
        return res.status(400).json({
          error: "Unsupported file format. AskGPT supports PDFs, images, and text/CSV documents.",
          message: "Unsupported file format. AskGPT supports PDFs, images, and text/CSV documents.",
        });
      }
    }

    // Profanity & abusive language moderation filter
    if (typeof prompt === "string" && prompt.trim()) {
      const moderation = checkProfanity(prompt);
      if (moderation.isAbusive) {
        return res.status(200).json({
          text: moderation.warningText,
          model: "AskGPT",
          blocked: true,
          isMixed: moderation.isMixed,
        });
      }
    }

    // Natural greeting handling for simple greetings (e.g. "hello", "hi", "hey", "good morning", "good evening")
    const GREETING_REGEX =
      /^(hi|hello|hey|hiya|howdy|good\s+morning|good\s+afternoon|good\s+evening|good\s+day|namaste|greetings)(\s+(there|askgpt|buddy|friend|ai))?[!.\s]*$/i;
    const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (trimmedPrompt && !attachment?.data && GREETING_REGEX.test(trimmedPrompt)) {
      const lower = trimmedPrompt.toLowerCase();
      let greetingText = "Hello! 👋 How can I help you today?";
      if (lower.includes("good morning")) {
        greetingText = "Good morning! ☀️ How can I help you today?";
      } else if (lower.includes("good afternoon")) {
        greetingText = "Good afternoon! How can I help you today?";
      } else if (lower.includes("good evening")) {
        greetingText = "Good evening! How can I help you today?";
      } else if (lower.includes("namaste")) {
        greetingText = "Namaste! 🙏 How can I help you today?";
      }
      return res.status(200).json({
        text: greetingText,
        model: "AskGPT",
      });
    }

    if (Array.isArray(messages) && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUserMsg && typeof lastUserMsg.content === "string") {
        const histMod = checkProfanity(lastUserMsg.content);
        if (histMod.isAbusive) {
          return res.status(200).json({
            text: histMod.warningText,
            model: "AskGPT",
            blocked: true,
            isMixed: histMod.isMixed,
          });
        }
      }
    }

    // Verify server-side GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not configured.");
      return res.status(401).json({
        error:
          "AskGPT service configuration issue. Please ensure your GEMINI_API_KEY is configured in your Vercel project Environment Variables.",
        message:
          "AskGPT service configuration issue. Please ensure your GEMINI_API_KEY is configured in your Vercel project Environment Variables.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Real-time temporal context calculated dynamically at request time (Asia/Kolkata - IST)
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      timeStyle: "medium",
      hour12: true,
    });
    const currentDateStr = dateFormatter.format(now);
    const currentTimeStr = timeFormatter.format(now);
    const currentYearStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(now);

    const systemInstruction = `You are AskGPT, a highly capable, articulate, and intelligent general-purpose AI assistant.

REAL-TIME TEMPORAL CONTEXT (Calculated dynamically at request time):
- Current Timezone: Asia/Kolkata (IST - Indian Standard Time, UTC+05:30)
- Current Date & Day: ${currentDateStr}
- Current Time: ${currentTimeStr}
- Current Year: ${currentYearStr}

CORE BEHAVIORAL DIRECTIVES:
1. STRICT TOPIC NEUTRALITY & NO UNREQUESTED ASSUMPTIONS:
   - AskGPT is an all-purpose general AI assistant. You DO NOT have any default subject, course, or focus.
   - NEVER assume the conversation is about C Programming, C++, Object-Oriented Programming (OOP), lecture notes, or uploaded study materials unless the user explicitly asks about them.
   - NEVER bring up C, C++, OOP, or lecture notes/slides unprompted.
   - Answer according to the user's actual question:
     * User: "hello" -> Give a normal, warm greeting.
     * User: "What is Python?" -> Explain Python.
     * User: "Who created AskGPT?" -> "AskGPT was created and developed by Pushpraj Kumar."
     * User: "What is polymorphism?" -> Explain polymorphism in general and across programming languages.
     * User: "What is today's date?" -> Give the correct current live date from the temporal context.

2. NATURAL GREETINGS:
   - When the user sends a greeting (e.g., "hello", "hi", "hey", "good morning", "good evening"):
     Respond naturally and warmly (e.g., "Hello! 👋 How can I help you today?").
     DO NOT add unsolicited topic suggestions like "Do you have any questions about Object-Oriented Programming?" or mention any academic subject.

3. UNDERSTAND THE EXACT QUESTION FIRST:
   - Carefully analyze the user's specific query, nuances, and underlying intent before generating your answer.
   - Always address the exact question asked. Never output a canned, boilerplate, or predefined response based on superficial keyword matching.
   - Every distinct question MUST receive a unique, tailored, grammatically correct answer.
   - Prioritize the latest question asked. Use previous conversation history only where directly relevant for follow-ups. If the user changes topic, transition cleanly to the new topic.

4. ADAPTIVE LANGUAGE & TONE:
   - Match the user's language and phrasing naturally.
   - If the user asks in Hindi or Hinglish (e.g., "Tumko kisne banaya?", "Aaj ki date kya hai?", "Abhi kitne baje hain?", "2022 me kya hua tha?"), respond naturally, fluently, and appropriately in Hindi/Hinglish.
   - If the user asks in English (e.g., "Who created you?", "What is Python?", "What is the latest Gemini model?"), respond in clear, grammatically precise English.
   - Maintain a helpful, respectful, and articulate persona.

5. CREATOR VS. OWNER CLARITY (Never hijack general questions):
   - Application Name: AskGPT.
   - Creator & Developer: Pushpraj Kumar created and developed AskGPT.
     * When asked who created, developed, or built AskGPT (e.g., "Who created you?", "Who developed you?", "Tumko kisne banaya?", "Developer kaun hai?"), answer specifically that Pushpraj Kumar created and developed AskGPT. Example: "AskGPT was created and developed by Pushpraj Kumar."
   - Owner: Pushpraj Kumar is the owner of AskGPT.
     * When asked who owns AskGPT or who is your owner (e.g., "Who is your owner?", "Tumhara owner kaun hai?", "Who owns AskGPT?"), answer specifically regarding ownership: Pushpraj Kumar is the owner of AskGPT. Example: "Pushpraj Kumar is the owner of AskGPT."
   - CRITICAL: Never confuse creator/owner queries with normal questions about other people, leaders, or entities (e.g., "Who is the Prime Minister of India?", "Who is the CEO of Google?", "Who founded Apple?", "Who was Mahatma Gandhi?"). Those must always be answered with the accurate factual figures, never with Pushpraj Kumar.

6. REAL-TIME DATE & TIME ACCURACY:
   - When asked for the current date, today's date, current day, or current time (e.g., "Aaj ki date kya hai?", "What is today's date?", "What day is today?", "Abhi kitne baje hain?", "What time is it?", "Current date and time?"), ALWAYS state the exact live date/time from the REAL-TIME TEMPORAL CONTEXT above in Asia/Kolkata (IST).

// 7. CURRENT & LATEST INFORMATION (Google Search Grounding):
//    - For questions about current events, today, recent happenings, now, latest releases, 2026 developments, current office holders, current sports scores, current prices, or recent technology/AI announcements: Use Google Search grounding to retrieve and synthesize up-to-date facts.
//    - Clearly cite facts from reputable, authoritative sources.
7. INTELLIGENT WEB SEARCH & FACTUAL ACCURACY:
   - You have access to Google Search grounding.
   - Decide intelligently from the user's question whether web search is needed.
   - Use web search whenever information may be current, changing, recent, time-sensitive, uncertain, niche, or difficult to verify.
   - This includes current or past sports results, winners, tournaments, events, news, current office holders, prices, products, technology releases, AI models, rankings, statistics, schedules, and similar information.
   - Do not rely on keyword matching to decide whether to search.
   - For stable general knowledge, programming, mathematics, explanations, and writing, answer directly without unnecessary searching.
   - Never guess or invent factual information.
   - When web search is used, provide relevant clickable source links when available.

8. HISTORICAL QUESTIONS & COMPARISONS:
   - When asked about a specific past year or era (e.g., 2020, 2021, 2022, 2023, 2024, or 'X years ago'): Answer specifically and accurately for that historical period without conflating it with current information.
   - When asked to compare past and present (e.g., "2022 vs 2026", "2022 me kya tha aur 2026 me kya hai?", "3 saal pehle aur abhi me kya difference hai?"): Structure a clear, structured comparison covering historical context, current state, key milestones, and notable differences.

9. GENERAL KNOWLEDGE & CONCEPTUAL EXPLANATIONS:
   - For technical, mathematical, scientific, or conceptual questions (e.g., "What is Python?", "How does machine learning work?", "What is polymorphism?"): Provide thorough, well-organized explanations with code snippets, formulas, or bullet points where suitable.

10. DOCUMENT & PDF COMPREHENSION:
    - If the user provides an attachment (PDF, text document, image), prioritize the content of the attached document when answering questions about it.
    - Do NOT assume subsequent unrelated questions are about that document unless the user refers to it.`;

    // Format conversation history and attachments for Gemini
    const contents: any[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      // Find the index of the most recent attachment in history (if any)
      const lastAttachmentIndex = messages
        .map((m: any, idx: number) => (m.attachment?.data ? idx : -1))
        .filter((idx: number) => idx !== -1)
        .pop();

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        const parts: any[] = [];

        // Include attachment only for the latest historical file to avoid payload inflation
        if (
          i === lastAttachmentIndex &&
          msg.attachment?.data &&
          msg.attachment?.mimeType &&
          isMimeTypeSupported(msg.attachment.mimeType)
        ) {
          parts.push({
            inlineData: {
              data: msg.attachment.data,
              mimeType: msg.attachment.mimeType,
            },
          });
        }

        if (msg.content) {
          parts.push({ text: msg.content });
        }

        if (parts.length > 0) {
          contents.push({ role, parts });
        }
      }
    }

    // Format current turn
    if (prompt || attachment) {
      const currentParts: any[] = [];

      if (attachment?.data && attachment?.mimeType && isMimeTypeSupported(attachment.mimeType)) {
        currentParts.push({
          inlineData: {
            data: attachment.data,
            mimeType: attachment.mimeType,
          },
        });
      }

      if (prompt) {
        currentParts.push({ text: prompt });
      }

      if (currentParts.length > 0) {
        contents.push({ role: "user", parts: currentParts });
      }
    }

    // Candidate model list prioritizing active, high-quota, fast Gemini models
    const candidateModels = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ];

    let response: any = null;
    let lastError: any = null;

    // Check if query needs live Google Search grounding
    // const promptLower = (prompt || "").toLowerCase();
    // const isTemporalOrSearchQuery =
    //   promptLower.includes("today") ||
    //   promptLower.includes("current") ||
    //   promptLower.includes("latest") ||
    //   promptLower.includes("recent") ||
    //   promptLower.includes("news") ||
    //   promptLower.includes("now") ||
    //   promptLower.includes("abhi") ||
    //   promptLower.includes("aaj") ||
    //   promptLower.includes("weather") ||
    //   promptLower.includes("score") ||
    //   promptLower.includes("price") ||
    //   promptLower.includes("2026") ||
    //   promptLower.includes("who is the current") ||
    //   promptLower.includes("who is the prime minister");

    // Phase 1: If question warrants live web search and not in quota cooldown, attempt Google Search grounding
    // const canAttemptSearch =
    //   isTemporalOrSearchQuery &&
    //   Date.now() - lastSearchGroundingQuotaErrorAt > SEARCH_COOLDOWN_MS;

    // if (canAttemptSearch) {
    //   for (const searchModel of ["gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"]) {
    //     try {
    //       response = await ai.models.generateContent({
    //         model: searchModel,
    //         contents,
    //         config: {
    //           systemInstruction,
    //           temperature: 0.7,
    //           tools: [{ googleSearch: {} }],
    //         },
    //       });
    //       const hasText = Boolean(
    //         response?.text ||
    //         response?.candidates?.[0]?.content?.parts?.some((p: any) => Boolean(p.text))
    //       );
    //       if (hasText) break;
    //     } catch (searchErr: any) {
    //       lastError = searchErr;
    //       const errMsg = String(searchErr?.message || "");
    //       if (
    //         searchErr?.status === 429 ||
    //         errMsg.includes("429") ||
    //         errMsg.includes("quota") ||
    //         errMsg.includes("RESOURCE_EXHAUSTED")
    //       ) {
    //         lastSearchGroundingQuotaErrorAt = Date.now();
    //         break; // Stop retrying search on quota limit, seamlessly fall through to standard generation
    //       }
    //     }
    //   }
    // }

    // Phase 2: Standard generation with resilient multi-model fallback
    if (!response) {
      for (const model of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            // config: {
            //   systemInstruction,
            //   temperature: 0.7,
            // },
            config: {
  systemInstruction,
  temperature: 0.3,
  tools: [{ googleSearch: {} }],
},
          });
          const hasText = Boolean(
            response?.text ||
            response?.candidates?.[0]?.content?.parts?.some((p: any) => Boolean(p.text))
          );
          if (hasText) break;
        } catch (genErr: any) {
          lastError = genErr;
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Unable to generate response from AskGPT models at this moment.");
    }

    let replyText = "";
    try {
      replyText = response.text || "";
    } catch {
      replyText = "";
    }
    if (!replyText && response.candidates?.[0]?.content?.parts) {
      replyText = response.candidates[0].content.parts
        .map((p: any) => p.text || "")
        .filter(Boolean)
        .join("")
        .trim();
    }
    if (!replyText) {
      replyText = "I apologize, but I couldn't generate a response.";
    }

    // Extract grounding sources from Google Search metadata
    const candidate = response.candidates?.[0];
    const groundingChunks = (candidate?.groundingMetadata as any)?.groundingChunks;
    const sources: Array<{ title: string; uri: string }> = [];

    if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
      const seenUris = new Set<string>();
      for (const chunk of groundingChunks) {
        const web = chunk?.web;
        if (web?.uri && !seenUris.has(web.uri)) {
          seenUris.add(web.uri);
          let title = web.title?.trim();
          if (!title) {
            try {
              title = new URL(web.uri).hostname.replace(/^www\./, "");
            } catch {
              title = web.uri;
            }
          }
          sources.push({ title, uri: web.uri });
        }
      }

      // If sources exist and are not already cited in the markdown body, append a clean Sources list
      if (sources.length > 0 && !replyText.includes(sources[0].uri)) {
        const sourcesMarkdown = sources
          .slice(0, 5)
          .map((s) => `- [${s.title}](${s.uri})`)
          .join("\n");
        replyText += `\n\n**Sources:**\n${sourcesMarkdown}`;
      }
    }

    return res.status(200).json({
      text: replyText,
      model: "AskGPT",
      sources: sources.length > 0 ? sources : undefined,
    });
  } catch (error: any) {
    console.error("AskGPT Chat Error:", error?.message || error);
    const { statusCode, userMessage } = formatGeminiError(error);
    return res.status(statusCode).json({
      error: userMessage,
      message: userMessage,
    });
  }
}

