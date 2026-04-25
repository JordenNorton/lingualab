export const lessonResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "dek",
    "targetLanguage",
    "nativeLanguage",
    "level",
    "contentType",
    "estimatedMinutes",
    "cefrSkillTargets",
    "textSections",
    "vocabulary",
    "grammarNotes",
    "workbook",
    "culturalNote",
    "retentionPlan",
    "createdAt"
  ],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    dek: { type: "string" },
    targetLanguage: { type: "string" },
    nativeLanguage: { type: "string" },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    contentType: {
      type: "string",
      enum: ["news-brief", "short-story", "dialogue", "travel-scene", "workplace-note", "daily-life"]
    },
    estimatedMinutes: { type: "number" },
    cefrSkillTargets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
    textSections: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "paragraphs"],
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }
        }
      }
    },
    vocabulary: {
      type: "array",
      minItems: 4,
      maxItems: 14,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "translation", "note", "example"],
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          note: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    grammarNotes: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "explanation", "example"],
        properties: {
          title: { type: "string" },
          explanation: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    workbook: {
      type: "object",
      additionalProperties: false,
      required: ["multipleChoice", "fillBlank", "writingPrompt"],
      properties: {
        multipleChoice: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "prompt", "options", "correctIndex", "explanation"],
            properties: {
              id: { type: "string" },
              prompt: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 },
              correctIndex: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string" }
            }
          }
        },
        fillBlank: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "prompt", "answer", "explanation"],
            properties: {
              id: { type: "string" },
              prompt: { type: "string" },
              answer: { type: "string" },
              explanation: { type: "string" }
            }
          }
        },
        writingPrompt: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "successCriteria"],
          properties: {
            prompt: { type: "string" },
            successCriteria: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }
          }
        }
      }
    },
    culturalNote: { type: "string" },
    retentionPlan: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    createdAt: { type: "string" }
  }
} as const;

export const explanationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["translation", "plainExplanation", "grammar", "usageTip", "microPractice"],
  properties: {
    translation: { type: "string" },
    plainExplanation: { type: "string" },
    grammar: { type: "string" },
    usageTip: { type: "string" },
    microPractice: { type: "string" }
  }
} as const;

export const workbookFeedbackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "strengths", "corrections", "nextStep"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    corrections: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    nextStep: { type: "string" }
  }
} as const;
