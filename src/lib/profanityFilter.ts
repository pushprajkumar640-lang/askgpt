/**
 * AskGPT Professional Moderation & Profanity Filter
 * Supports English, Hindi (Devanagari), and Hinglish (Roman Hindi) abusive detection.
 * Handles character substitutions (leetspeak), repeated letters, spaced-out letters, and wildcards.
 * Conservative matching protects educational, technical, and ordinary language against false positives.
 */

export interface ModerationResult {
  isAbusive: boolean;
  isMixed: boolean;
  warningText: string | null;
  cleanedText?: string;
  matchedTerms?: string[];
}

export const RESPECTFUL_WARNING =
  "Please use respectful language. I'm happy to help you with your question.";

export const MIXED_WARNING =
  "Please remove the offensive language and send your question again. I'll be happy to help.";

// Whitelist of words that contain substrings that might resemble profanities
// These words MUST NEVER be flagged as profanity.
const SAFE_WHITELIST = new Set([
  // Programming & Educational Terms
  "class",
  "classes",
  "classic",
  "classical",
  "classify",
  "classification",
  "subclass",
  "superclass",
  "classroom",
  "pass",
  "passed",
  "passing",
  "password",
  "passwords",
  "bypass",
  "passport",
  "passage",
  "assign",
  "assigned",
  "assignment",
  "assignments",
  "assignee",
  "associate",
  "association",
  "assist",
  "assistant",
  "assistance",
  "assume",
  "assumption",
  "asset",
  "assets",
  "assess",
  "assessment",
  "glass",
  "grass",
  "bass",
  "compass",
  "mass",
  "embarrass",
  "harass",
  "analysis",
  "analyst",
  "analysts",
  "analytic",
  "analytical",
  "analytics",
  "document",
  "documents",
  "documentation",
  "documented",
  "cumulative",
  "accumulate",
  "accumulation",
  "cucumber",
  "circumstance",
  "title",
  "titles",
  "entity",
  "entities",
  "entitlement",
  "attitude",
  "appetite",
  "button",
  "buttons",
  "butterfly",
  "rebuttal",
  "cockpit",
  "peacock",
  "cocktail",
  "dickens",
  "dickinson",
  "penistone",
  "hello",
  "help",
  "shell",
  "bit",
  "bite",
  "pitch",
  "switch",
  "stitch",
  "witch",
  "hit",
  "sheet",
  "sheets",
  "dam",
  "damage",

  // Hindi & Hinglish safe words that could collide
  "chhutti",
  "chutti",
  "chhota",
  "chhoti",
  "chote",
  "chota",
  "choti",
  "saal",
  "saalon",
  "batao",
  "bataiye",
  "samjhao",
  "samjhaye",
  "kya",
  "kaise",
  "bhai",
  "behan",
  "bahan",
  "bhen",
  "mata",
  "pitaji",
  "ghar",
  "sahi",
  "baat",
  "kuch",
  "ganda",
  "gandi",
  "achha",
  "achhi",
  "kutta", // Safe when asked educationally like "kutta par nibandh", handled separately
]);

// Normalized English profanity root words (strictly checked at word boundaries)
const ENGLISH_PROFANITY_WORDS = [
  "idiot",
  "idiots",
  "idiotic",
  "stupid",
  "stupids",
  "stupidity",
  "retard",
  "retarded",
  "dumbass",
  "dumbasses",
  "jackass",
  "jackasses",
  "asshole",
  "assholes",
  "arsehole",
  "arseholes",
  "fuck",
  "fucker",
  "fuckers",
  "fucking",
  "fucked",
  "fuckoff",
  "motherfucker",
  "motherfuckers",
  "bitch",
  "bitches",
  "bitching",
  "bitchy",
  "bastard",
  "bastards",
  "cunt",
  "cunts",
  "dickhead",
  "dickheads",
  "dicksucker",
  "dipshit",
  "shithole",
  "bullshit",
  "whore",
  "whores",
  "slut",
  "sluts",
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "faggots",
];

// Normalized Hindi & Hinglish abusive root words
const HINGLISH_PROFANITY_WORDS = [
  "chutiya",
  "chutiye",
  "chootiya",
  "chootiye",
  "chutya",
  "chutye",
  "chutiyapa",
  "chutiyappe",
  "bhenchod",
  "behenchod",
  "behnchod",
  "benchod",
  "banchod",
  "madarchod",
  "maderchod",
  "madrchod",
  "maadar chod",
  "bhosdike",
  "bhosadike",
  "bhosdika",
  "bhosdi",
  "bhosada",
  "bhosda",
  "bsdk",
  "bosepka",
  "gandu",
  "gaandu",
  "gandfat",
  "gandmasti",
  "harami",
  "haraami",
  "haramkhor",
  "haramzada",
  "haramzade",
  "haramzadi",
  "kamina",
  "kameena",
  "kamine",
  "kameene",
  "kaminapan",
  "lauda",
  "laude",
  "lawda",
  "lawde",
  "loda",
  "lode",
  "lodu",
  "lowdu",
  "lavda",
  "lavde",
  "randi",
  "raand",
  "randwa",
  "randwe",
  "jhaant",
  "jhant",
  "jhaantu",
  "jhantu",
  "chodu",
  "chudakkad",
  "chudwana",
  "kuttiya",
];

// Devanagari Hindi abusive phrases/terms
const DEVANAGARI_PROFANITY_REGEXES = [
  /मादरचोद/u,
  /मादर\s*चोद/u,
  /बहनचोद/u,
  /बेहनचोद/u,
  /बहन\s*चोद/u,
  /चूतिया/u,
  /चूतिये/u,
  /चूतियापा/u,
  /भोसड़ीके/u,
  /भोसड़ीके/u,
  /भोसड़ी/u,
  /भोसड़ा/u,
  /गांडू/u,
  /गांड/u,
  /हरामी/u,
  /हरामखोर/u,
  /हरामज़ादा/u,
  /हरामज़ादे/u,
  /कमीना/u,
  /कमीने/u,
  /कमीनी/u,
  /लौड़ा/u,
  /लौड़े/u,
  /लोडू/u,
  /रंडी/u,
  /रांड/u,
  /झांट/u,
  /झांटू/u,
  /चूत(?!्टी)/u, // Matches चूत without matching छुट्टी
];

// Specific multi-word phrases and targeted regexes
const TARGETED_PROFANITY_REGEXES = [
  /\b(?:son\s+of\s+a\s+bitch|sonofabitch)\b/i,
  /\b(?:mother\s*fuck(?:er|ing)?)\b/i,
  /\b(?:shut\s*the\s*fuck\s*up|stfu)\b/i,
  /\b(?:what\s*the\s*fuck|wtf)\b/i,
  /\b(?:fuck\s+(?:off|you|u|up))\b/i,
  /\b(?:f[\W_]*u[\W_]*c[\W_]*k)\b/i,
  /\b(?:f[\W_]*\*+[\W_]*c?[\W_]*k)\b/i,
  /\b(?:b[\W_]*[i1!*][\W_]*t[\W_]*c[\W_]*h)\b/i,
  /\b(?:s[\W_]*h[\W_]*[i1!*][\W_]*t)\b/i,
  /\b(?:c[\W_]*[u*][\W_]*n[\W_]*t)\b/i,
  /\b(?:a[\W_]*[\$s*][\W_]*[\$s*][\W_]*h[\W_]*[o0*][\W_]*l[\W_]*[e3*])\b/i,
  /\b(?:b[\W_]*[\$s*][\W_]*d[\W_]*k)\b/i,
  /\b(?:m[\W_]*c|b[\W_]*c)\b/i, // MC and BC when standalone in abusive contexts
  /\b(?:ma[\W_]*dar[\W_]*chod|madar[\W_]*chod)\b/i,
  /\b(?:bhen[\W_]*chod|behen[\W_]*chod)\b/i,
  /\b(?:bhos[\W_]*d[i1!][\W_]*k[e3])\b/i,
  /\b(?:ch[\W_]*[u*0o][\W_]*t[\W_]*[i1!y*][\W_]*[y*][\W_]*[a4*])\b/i,
  /\b(?:teri\s+maa\s+ki\s+(?:chut|choot|bhosda)?)\b/i,
  /\b(?:maa\s+ki\s+(?:chut|choot))\b/i,
  /\b(?:suar\s+ke\s+(?:bacche|pille|bachhe))\b/i,
  /\b(?:kutte\s+kamine|kamine\s+kutte|abey\s+saale|saale\s+kutte)\b/i,
  /\btu\s+(?:kutta|suar|chutiya|kamina|harami|gandu)\s+hai\b/i,
  /\b(?:chut|choot)\b/i, // Standalone vulgar term
  /\b(?:gaand|gand)\b/i, // Standalone vulgar term
  /\b(?:ass)\b/i, // Standalone vulgar term only (never substrings)
  /\b(?:dick|dicks)\b/i, // Standalone vulgar term only (never substrings)
];

/**
 * Normalizes text to handle leetspeak substitutions:
 * @ -> a, $ -> s, ! -> i, 1 -> i, 0 -> o, 3 -> e, 4 -> a, 5 -> s, 7 -> t, 8 -> b
 */
function normalizeLeetspeak(str: string): string {
  return str
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/\+/g, "t");
}

/**
 * Collapses 3 or more repeated consecutive identical letters to 1 or 2
 * e.g., "iiidiot" -> "idiot", "stuuupid" -> "stupid", "fuuuck" -> "fuck"
 */
function collapseRepeatedLetters(str: string): string {
  return str.replace(/([a-zA-Z])\1{2,}/g, "$1");
}

/**
 * Detects spaced-out words like "i d i o t", "s t u p i d", "c h u t i y a", "b s d k"
 * Extracts sequences of single letters and combines them to see if they form an abusive word.
 */
function checkSpacedWords(text: string, badWordsSet: Set<string>): string | null {
  // Look for sequences of single letters separated by spaces or punctuation
  const spacedRegex = /(?:^|[^a-zA-Z])([a-zA-Z](?:[\s.*_-]+[a-zA-Z]){2,})(?:[^a-zA-Z]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = spacedRegex.exec(text)) !== null) {
    const rawMatch = match[1];
    const condensed = rawMatch.replace(/[\s.*_-]+/g, "").toLowerCase();
    if (badWordsSet.has(condensed)) {
      return condensed;
    }
  }

  return null;
}

// Build consolidated bad words lookup set
const ALL_BAD_WORDS = new Set([
  ...ENGLISH_PROFANITY_WORDS,
  ...HINGLISH_PROFANITY_WORDS,
  "idiot",
  "stupid",
  "asshole",
  "bastard",
  "bitch",
  "fuck",
  "shit",
  "cunt",
  "chutiya",
  "bhenchod",
  "madarchod",
  "bhosdike",
  "bsdk",
  "gandu",
  "lauda",
  "lodu",
  "randi",
  "kamina",
  "harami",
]);

/**
 * Determines whether a message containing abusive language is a "mixed" message:
 * i.e., contains both a legitimate educational/technical/ordinary question or request
 * AND abusive language (e.g. "Explain polymorphism, you idiot").
 */
function isMixedMessage(originalText: string, matchedPatterns: string[]): boolean {
  // Strip out the matched abusive terms from text
  let stripped = originalText;
  for (const term of matchedPatterns) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    stripped = stripped.replace(regex, " ");
  }

  // Also strip common targeted regexes
  for (const reg of TARGETED_PROFANITY_REGEXES) {
    stripped = stripped.replace(reg, " ");
  }
  for (const reg of DEVANAGARI_PROFANITY_REGEXES) {
    stripped = stripped.replace(reg, " ");
  }

  // Remove common insult pronouns and conversational filler
  const fillerRegex =
    /\b(?:you|u|ur|your|yours|are|r|is|am|a|an|the|so|such|hey|hi|hello|yo|oh|shut|up|off|go|to|get|lost|tu|tum|aap|tera|teri|tere|apna|hai|ho|h|saala|be|abey|abe|kya|bhai)\b/gi;
  stripped = stripped.replace(fillerRegex, " ");

  // Remove punctuation
  const cleanTokens = stripped
    .replace(/[^\w\s\u0900-\u097F]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  // Check if original contained a question mark
  const hasQuestionMark = originalText.includes("?");

  // Question and intent indicators
  const questionIndicators = new Set([
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "which",
    "explain",
    "describe",
    "define",
    "solve",
    "write",
    "create",
    "generate",
    "code",
    "help",
    "summary",
    "summarize",
    "kya",
    "kaise",
    "batao",
    "samjhao",
    "sikhao",
    "dikhao",
    "meaning",
    "difference",
    "example",
    "pdf",
    "file",
    "document",
    "image",
  ]);

  const hasQuestionWord = cleanTokens.some((token) => questionIndicators.has(token));

  // Substantive words (words with length >= 3 that are not mere numbers or single letters)
  const substantiveWords = cleanTokens.filter((token) => token.length >= 3);

  if (hasQuestionWord || (hasQuestionMark && substantiveWords.length >= 1) || substantiveWords.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Main Profanity Detection function
 * Evaluates text against profanity rules with false-positive protections.
 */
export function checkProfanity(text: string | null | undefined): ModerationResult {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      isAbusive: false,
      isMixed: false,
      warningText: null,
    };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();
  const matchedTerms: string[] = [];

  // 1. Check Devanagari Hindi expressions
  for (const reg of DEVANAGARI_PROFANITY_REGEXES) {
    if (reg.test(raw)) {
      matchedTerms.push(reg.source);
    }
  }

  // 2. Check targeted multi-word phrases and symbols regexes
  for (const reg of TARGETED_PROFANITY_REGEXES) {
    if (reg.test(raw)) {
      matchedTerms.push(reg.source);
    }
  }

  // 3. Check spaced-out letters like "i d i o t", "s t u p i d", "c h u t i y a"
  const spacedMatch = checkSpacedWords(raw, ALL_BAD_WORDS);
  if (spacedMatch) {
    matchedTerms.push(spacedMatch);
  }

  // 4. Tokenize and test words with Leetspeak & Repeated Letters normalizations
  // Extract individual words while respecting word boundaries
  const words = lower.match(/[a-z0-9@$!*+\-_]+/g) || [];

  for (const word of words) {
    // If the word is in the safe whitelist, NEVER block it!
    if (SAFE_WHITELIST.has(word)) {
      continue;
    }

    // Direct check against bad words
    if (ALL_BAD_WORDS.has(word)) {
      matchedTerms.push(word);
      continue;
    }

    // Normalized Leetspeak check: e.g. "1diot" -> "idiot", "b!tch" -> "bitch", "5tupid" -> "stupid"
    const deLeeted = normalizeLeetspeak(word);
    if (!SAFE_WHITELIST.has(deLeeted) && ALL_BAD_WORDS.has(deLeeted)) {
      matchedTerms.push(deLeeted);
      continue;
    }

    // Collapsed repeated letters check: e.g. "iiidiot" -> "idiot", "stuuupid" -> "stupid"
    const deRepeated = collapseRepeatedLetters(deLeeted);
    if (!SAFE_WHITELIST.has(deRepeated) && ALL_BAD_WORDS.has(deRepeated)) {
      matchedTerms.push(deRepeated);
      continue;
    }

    // Additional check with wildcard replacement: e.g. "f*ck" -> "fuck"
    if (word.includes("*")) {
      const deAsterisk = word.replace(/\*/g, "u");
      if (ALL_BAD_WORDS.has(deAsterisk)) {
        matchedTerms.push(deAsterisk);
        continue;
      }
      const deAsteriskI = word.replace(/\*/g, "i");
      if (ALL_BAD_WORDS.has(deAsteriskI)) {
        matchedTerms.push(deAsteriskI);
        continue;
      }
    }
  }

  // If any abusive language was detected
  if (matchedTerms.length > 0) {
    const isMixed = isMixedMessage(raw, matchedTerms);
    const warningText = isMixed ? MIXED_WARNING : RESPECTFUL_WARNING;

    return {
      isAbusive: true,
      isMixed,
      warningText,
      matchedTerms,
    };
  }

  return {
    isAbusive: false,
    isMixed: false,
    warningText: null,
  };
}
