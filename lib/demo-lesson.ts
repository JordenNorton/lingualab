import type { Explanation, Lesson, LessonRequest, WorkbookFeedback } from "@/lib/schemas";

export const defaultLessonRequest: LessonRequest = {
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  level: "A2",
  contentType: "news-brief",
  topic: "local food markets and everyday routines",
  tone: "warm",
  length: "medium",
  focusArea: "vocabulary",
  regionVariant: "Latin American Spanish",
  includeVocabularyCount: 8
};

export const demoLesson: Lesson = {
  id: "demo-market-morning",
  title: "Un mercado con nuevas ideas",
  dek: "A gentle A2 reading about a neighborhood market, useful routine verbs, and practical food vocabulary.",
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  level: "A2",
  contentType: "news-brief",
  estimatedMinutes: 14,
  cefrSkillTargets: [
    "Understand short paragraphs about familiar places.",
    "Use present-tense routine verbs.",
    "Identify prices, products, and simple opinions."
  ],
  textSections: [
    {
      heading: "La noticia",
      paragraphs: [
        "En el barrio San Miguel, el mercado abre cada sábado a las ocho de la mañana. Esta semana, los vendedores tienen una idea nueva: cada mesa muestra una receta fácil con sus productos.",
        'La señora Marta vende tomates, cebollas y hierbas frescas. Ella dice: "Muchas personas quieren cocinar en casa, pero no siempre tienen tiempo. Una receta corta ayuda mucho".'
      ]
    },
    {
      heading: "Las personas",
      paragraphs: [
        "A las diez, muchas familias caminan por el mercado. Compran pan, fruta y queso. También preguntan por los precios y hablan con los vendedores.",
        'Diego, un estudiante, compra dos manzanas y una bolsa de arroz. Él quiere preparar una cena simple para sus amigos. "No soy chef", dice Diego, "pero hoy puedo aprender algo nuevo".'
      ]
    }
  ],
  vocabulary: [
    {
      term: "el mercado",
      translation: "the market",
      note: "A place where people buy food or other goods.",
      example: "El mercado abre los sábados."
    },
    {
      term: "los vendedores",
      translation: "the sellers/vendors",
      note: "People who sell products.",
      example: "Los vendedores hablan con las familias."
    },
    {
      term: "una receta",
      translation: "a recipe",
      note: "Instructions for cooking food.",
      example: "La receta es corta y fácil."
    },
    {
      term: "fresco",
      translation: "fresh",
      note: "Used for food that is new or recently prepared.",
      example: "Marta vende hierbas frescas."
    },
    {
      term: "comprar",
      translation: "to buy",
      note: "Regular -ar verb.",
      example: "Diego compra arroz."
    },
    {
      term: "preguntar",
      translation: "to ask",
      note: "Often used with por for asking about something.",
      example: "Preguntan por los precios."
    },
    {
      term: "preparar",
      translation: "to prepare",
      note: "Useful for food and plans.",
      example: "Quiere preparar una cena."
    },
    {
      term: "aprender",
      translation: "to learn",
      note: "Regular -er verb.",
      example: "Hoy puedo aprender algo nuevo."
    }
  ],
  grammarNotes: [
    {
      title: "Present tense for routines",
      explanation: "The text uses present tense to describe regular actions: abre, vende, compran, preguntan.",
      example: "El mercado abre cada sábado."
    },
    {
      title: "Wanting to do something",
      explanation: "Use querer + infinitive to say what someone wants to do.",
      example: "Diego quiere preparar una cena simple."
    }
  ],
  workbook: {
    multipleChoice: [
      {
        id: "mc-1",
        prompt: "When does the market open?",
        options: ["At six in the evening", "At eight in the morning", "At ten at night", "Only on Sundays"],
        correctIndex: 1,
        explanation: "The text says: el mercado abre cada sábado a las ocho de la mañana."
      },
      {
        id: "mc-2",
        prompt: "What new idea do the sellers have?",
        options: [
          "They play music all day",
          "They show easy recipes with their products",
          "They close the market early",
          "They sell only rice"
        ],
        correctIndex: 1,
        explanation: "Each table shows a short recipe connected to the products."
      },
      {
        id: "mc-3",
        prompt: "Why does Diego buy food?",
        options: [
          "He wants to prepare dinner for friends",
          "He owns a restaurant",
          "He sells apples",
          "He needs breakfast at school"
        ],
        correctIndex: 0,
        explanation: "Diego wants to prepare a simple dinner for his friends."
      }
    ],
    fillBlank: [
      {
        id: "fb-1",
        prompt: "La señora Marta vende tomates, cebollas y hierbas ____.",
        answer: "frescas",
        explanation: "Hierbas is feminine plural, so fresco becomes frescas."
      },
      {
        id: "fb-2",
        prompt: "Diego quiere ____ una cena simple.",
        answer: "preparar",
        explanation: "After quiere, use the infinitive form: preparar."
      }
    ],
    writingPrompt: {
      prompt: "Write 3-4 sentences in Spanish about what you buy at a market and why.",
      successCriteria: [
        "Use at least three food words.",
        "Use comprar or querer correctly.",
        "Keep sentences simple and clear."
      ]
    }
  },
  culturalNote:
    "Markets are common social spaces in many Spanish-speaking cities. People often ask questions, compare prices, and talk with vendors before buying.",
  retentionPlan: [
    "Today: reread the text aloud once and mark three useful food words.",
    "Tomorrow: write a new sentence with comprar, preparar, and aprender.",
    "In three days: retake the quiz without looking at the article.",
    "Next week: generate a dialogue at the same level using the saved vocabulary."
  ],
  createdAt: new Date().toISOString()
};

export function createDemoLesson(request: LessonRequest = defaultLessonRequest): Lesson {
  void request;

  return {
    ...demoLesson,
    id: `demo-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
}

export function createDemoExplanation(selectedText: string, nativeLanguage = "English"): Explanation {
  return {
    translation: `Approximate meaning of "${selectedText}" in ${nativeLanguage}.`,
    plainExplanation:
      "This phrase is being explained in demo mode because no OpenAI API key is configured. Add OPENAI_API_KEY to enable live explanations.",
    grammar: "Look for the verb form and any adjective agreement. Those usually carry the useful learning signal.",
    usageTip: "Try making one new sentence with the same structure.",
    microPractice: `Write a new sentence that uses: ${selectedText}`
  };
}

export function createDemoWorkbookFeedback(): WorkbookFeedback {
  return {
    score: 72,
    strengths: ["You answered with relevant vocabulary.", "Your response is understandable for the target level."],
    corrections: ["Demo mode cannot check grammar deeply. Add OPENAI_API_KEY for precise feedback."],
    nextStep: "Rewrite the answer once, adding one detail from the reading."
  };
}
