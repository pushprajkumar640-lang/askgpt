import { Message, Attachment } from "../types";

export function getBaseApiUrl(): string {
  // 1. Prioritize configured VITE_API_URL from environment (e.g. Render backend URL configured in Vercel)
  const envUrl =
    (import.meta as any).env?.VITE_API_URL ||
    (typeof process !== "undefined" && (process as any).env?.VITE_API_URL);

  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    let clean = envUrl.trim();
    // Strip surrounding quotes if entered in env vars
    clean = clean.replace(/^["']|["']$/g, "").trim();
    // Strip trailing /api/chat or /api to prevent duplicate path segments
    clean = clean.replace(/\/api\/chat\/?$/i, "").replace(/\/api\/?$/i, "");
    clean = clean.replace(/\/+$/, "");
    if (clean !== "" && clean !== "undefined" && clean !== "null") {
      return clean;
    }
  }

  // 2. If localStorage has an old API URL, it must NOT override the configured VITE_API_URL.
  // Only check user-configured custom URL in localStorage if VITE_API_URL is not set.
  try {
    const customUrl = localStorage.getItem("infinity_api_url");
    if (
      customUrl &&
      typeof customUrl === "string" &&
      customUrl.trim() !== "" &&
      /^https?:\/\//i.test(customUrl.trim())
    ) {
      let clean = customUrl.trim().replace(/^["']|["']$/g, "").trim();
      clean = clean.replace(/\/api\/chat\/?$/i, "").replace(/\/api\/?$/i, "");
      clean = clean.replace(/\/+$/, "");
      return clean;
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  // 3. Default: same-origin /api routes (Vercel Serverless Architecture or full-stack server)
  return "";
}

export async function sendChatMessage(
  prompt: string,
  history: Message[],
  attachment?: Attachment
): Promise<{ text: string; model?: string; blocked?: boolean; isMixed?: boolean }> {
  const baseUrl = getBaseApiUrl();
  const endpoint = `${baseUrl}/api/chat`;

  // Format history messages for backend (only last 10 messages to keep context fast and relevant)
  const formattedHistory = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
    attachment: m.attachment
      ? {
          mimeType: m.attachment.mimeType,
          data: m.attachment.data,
        }
      : undefined,
  }));

  const payload: any = {
    prompt,
    messages: formattedHistory,
  };

  if (attachment) {
    payload.attachment = {
      mimeType: attachment.mimeType,
      data: attachment.data,
    };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to AskGPT service. Please check your internet connection and try again."
    );
  }

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || "";
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = "";
      }
    }

    if (!errorDetail || errorDetail.startsWith("<!DOCTYPE") || errorDetail.includes("<html")) {
      if (response.status === 502 || response.status === 504) {
        errorDetail =
          "AskGPT backend service is waking up. Please wait a few moments and try your message again.";
      } else if (response.status === 503) {
        errorDetail =
          "AskGPT is currently experiencing high demand. Please wait a few moments and try your message again.";
      } else if (response.status === 429) {
        errorDetail =
          "You've reached the temporary request limit for AskGPT. Please pause for a moment before sending another message.";
      } else if (response.status === 401 || response.status === 403) {
        errorDetail =
          "AskGPT service configuration issue. Please ensure your GEMINI_API_KEY is configured in your backend environment variables.";
      } else if (response.status === 413) {
        errorDetail =
          "The attached document exceeds the maximum allowed size (4MB). Please upload a smaller document.";
      } else {
        errorDetail =
          "AskGPT encountered a temporary server error while generating your response. Please try again in a moment.";
      }
    }

    throw new Error(errorDetail);
  }

  const data = await response.json();
  return {
    text: data.text || "No response received.",
    model: data.model || "AskGPT",
    blocked: data.blocked,
    isMixed: data.isMixed,
  };
}

export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const baseUrl = customUrl !== undefined ? customUrl.trim().replace(/\/+$/, "") : getBaseApiUrl();
    const endpoint = `${baseUrl}/api/health`;

    const res = await fetch(endpoint, { method: "GET" });
    if (!res.ok) {
      return { ok: false, message: `Server returned HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, message: `Connected to ${data.app || "AskGPT"} by ${data.developer || "Pushpraj Kumar"}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Could not reach server" };
  }
}
