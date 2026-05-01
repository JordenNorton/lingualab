import { z } from "zod";

export const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const languageOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Polish",
  "Czech",
  "Romanian",
  "Hungarian",
  "Greek",
  "Russian",
  "Ukrainian",
  "Turkish",
  "Arabic",
  "Hebrew",
  "Persian",
  "Hindi",
  "Bengali",
  "Urdu",
  "Mandarin Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Swahili"
] as const;

export const contentTypes = [
  "news-brief",
  "short-story",
  "dialogue",
  "travel-scene",
  "workplace-note",
  "daily-life"
] as const;

export const tones = ["natural", "warm", "formal", "playful", "journalistic"] as const;
export const lengths = ["short", "medium", "long"] as const;
export const focusAreas = ["vocabulary", "grammar", "idioms", "conversation", "exam-practice"] as const;
export const fontSizePreferences = ["small", "default", "large", "extra-large"] as const;
export const themePreferences = ["system", "light", "dark"] as const;

export const lessonRequestSchema = z.object({
  targetLanguage: z.enum(languageOptions),
  nativeLanguage: z.enum(languageOptions),
  level: z.enum(levels),
  contentType: z.enum(contentTypes),
  topic: z.string().min(2).max(160),
  tone: z.enum(tones),
  length: z.enum(lengths),
  focusArea: z.enum(focusAreas),
  regionVariant: z.string().max(80).optional().default(""),
  includeVocabularyCount: z.number().int().min(4).max(14).default(8)
});

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  dek: z.string(),
  targetLanguage: z.string(),
  nativeLanguage: z.string(),
  level: z.enum(levels),
  contentType: z.enum(contentTypes),
  estimatedMinutes: z.number(),
  cefrSkillTargets: z.array(z.string()),
  textSections: z.array(
    z.object({
      heading: z.string(),
      paragraphs: z.array(z.string())
    })
  ),
  vocabulary: z.array(
    z.object({
      term: z.string(),
      translation: z.string(),
      note: z.string(),
      example: z.string()
    })
  ),
  grammarNotes: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      example: z.string()
    })
  ),
  workbook: z.object({
    multipleChoice: z.array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        options: z.array(z.string()).min(3).max(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string()
      })
    ),
    fillBlank: z.array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        answer: z.string(),
        explanation: z.string()
      })
    ),
    writingPrompt: z.object({
      prompt: z.string(),
      successCriteria: z.array(z.string())
    })
  }),
  culturalNote: z.string(),
  retentionPlan: z.array(z.string()),
  createdAt: z.string()
});

export const explanationRequestSchema = z.object({
  selectedText: z.string().min(1).max(1200),
  targetLanguage: z.string().min(2).max(60),
  nativeLanguage: z.string().min(2).max(60),
  level: z.enum(levels),
  surroundingText: z.string().max(2500).optional().default("")
});

export const explanationSchema = z.object({
  translation: z.string(),
  plainExplanation: z.string(),
  grammar: z.string(),
  usageTip: z.string(),
  microPractice: z.string()
});

export const workbookCheckRequestSchema = z.object({
  lessonId: z.string().min(1).max(160),
  title: z.string().min(1).max(220),
  targetLanguage: z.string().min(2).max(60),
  nativeLanguage: z.string().min(2).max(60),
  level: z.enum(levels),
  prompt: z.string().min(2).max(1200),
  answer: z.string().min(1).max(2000),
  successCriteria: z.array(z.string()).default([])
});

export const workbookFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  corrections: z.array(z.string()),
  nextStep: z.string()
});

export const quizAttemptCreateSchema = z.object({
  lessonId: z.string().min(1).max(160),
  title: z.string().min(1).max(220),
  targetLanguage: z.string().min(2).max(60),
  level: z.enum(levels),
  score: z.number().int().min(0).max(100)
});

export const quizAttemptSchema = quizAttemptCreateSchema.extend({
  createdAt: z.string()
});

export const writingFeedbackHistorySchema = workbookCheckRequestSchema.extend({
  id: z.string(),
  feedback: workbookFeedbackSchema,
  score: z.number().int().min(0).max(100),
  createdAt: z.string()
});

export const profileSettingsSchema = z.object({
  displayName: z.string().max(80).default(""),
  profilePictureUrl: z
    .string()
    .max(500)
    .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
      message: "Use a full image URL that starts with http:// or https://."
    })
    .default(""),
  shortBio: z.string().max(280).default(""),
  learningGoal: z.string().max(320).default(""),
  targetLanguage: z.enum(languageOptions),
  nativeLanguage: z.enum(languageOptions),
  currentLevel: z.enum(levels),
  regionVariant: z.string().max(80).default(""),
  fontSize: z.enum(fontSizePreferences).default("default"),
  highContrast: z.boolean().default(false),
  dyslexiaAssist: z.boolean().default(false),
  themePreference: z.enum(themePreferences).default("system")
});

export const userProfileSchema = profileSettingsSchema.extend({
  updatedAt: z.string().optional()
});

export type LessonRequest = z.infer<typeof lessonRequestSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type WorkbookFeedback = z.infer<typeof workbookFeedbackSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type WritingFeedbackHistory = z.infer<typeof writingFeedbackHistorySchema>;
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
