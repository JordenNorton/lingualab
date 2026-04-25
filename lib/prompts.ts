import type { LessonRequest } from "@/lib/schemas";

const contentTypeLabels: Record<LessonRequest["contentType"], string> = {
  "news-brief": "fictional news-style article",
  "short-story": "short story",
  dialogue: "dialogue",
  "travel-scene": "travel scenario",
  "workplace-note": "workplace note",
  "daily-life": "daily-life scene"
};

const lengthGuidance: Record<LessonRequest["length"], string> = {
  short: "120-180 words",
  medium: "220-320 words",
  long: "420-560 words"
};

export function buildLessonInstructions() {
  return [
    "You are an expert language tutor and curriculum designer.",
    "Create level-appropriate reading practice in the learner's target language.",
    "The main reading text must be in the target language only, except names or unavoidable loanwords.",
    "All explanations, translations, answer explanations, vocabulary notes, and workbook directions must be in the learner's native language.",
    "Keep vocabulary, grammar, sentence length, and idioms appropriate for the requested CEFR level.",
    "For news briefs, write fictional but realistic educational news. Do not claim real current events or invent real sources.",
    "Return only data matching the supplied schema."
  ].join("\n");
}

export function buildLessonPrompt(request: LessonRequest) {
  const variant = request.regionVariant.trim()
    ? `Prefer this regional variant: ${request.regionVariant.trim()}.`
    : "Use a broadly understood standard variant of the target language.";

  return [
    `Target language: ${request.targetLanguage}`,
    `Learner native language: ${request.nativeLanguage}`,
    `CEFR level: ${request.level}`,
    `Content type: ${contentTypeLabels[request.contentType]}`,
    `Topic/interests: ${request.topic}`,
    `Tone: ${request.tone}`,
    `Length: ${lengthGuidance[request.length]}`,
    `Learning focus: ${request.focusArea}`,
    `Vocabulary count: ${request.includeVocabularyCount}`,
    variant,
    "",
    "Create a complete lesson with:",
    "1. A polished title and short native-language dek.",
    "2. A target-language text split into readable sections.",
    "3. Level-appropriate vocabulary with translations and examples.",
    "4. Grammar notes that explain useful patterns from the text.",
    "5. A mini workbook with multiple choice, fill-in-the-blank, and a short writing prompt.",
    "6. A practical retention plan with follow-up actions."
  ].join("\n");
}

export function buildExplanationInstructions(nativeLanguage: string) {
  return [
    "You are a concise language tutor.",
    `Explain in ${nativeLanguage}.`,
    "Do not over-explain. Focus on what helps the learner continue reading.",
    "Return only data matching the supplied schema."
  ].join("\n");
}

export function buildWorkbookFeedbackInstructions(nativeLanguage: string) {
  return [
    "You are a supportive language tutor checking a short workbook response.",
    `Give feedback in ${nativeLanguage}.`,
    "Be concrete, brief, and useful. Correct mistakes without rewriting more than needed.",
    "Return only data matching the supplied schema."
  ].join("\n");
}
