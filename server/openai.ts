import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

// Lazy-load OpenAI client to allow app to start without API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for AI reply generation");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// Truncate reply to max characters, ending cleanly at sentence boundary
function truncateReply(reply: string, maxLength: number = 400): string {
  if (reply.length <= maxLength) {
    return reply;
  }
  
  // Find the last sentence-ending punctuation before the limit
  const truncated = reply.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > maxLength * 0.5) {
    return reply.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Fallback: cut at last space and add ellipsis
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return reply.substring(0, lastSpace).trim() + '...';
  }
  
  return truncated.trim();
}

interface ReviewReplyOptions {
  reviewerName: string;
  rating: number;
  comment: string;
  restaurantName: string;
  toneOfVoice: string;
  customInstructions?: string; // Custom instructions from tone preset
}

interface ReplyResult {
  reply: string;
  language: string;
  sentiment: string;
}

export async function generateReviewReply(
  options: ReviewReplyOptions,
): Promise<ReplyResult> {
  const { reviewerName, rating, comment, restaurantName, toneOfVoice, customInstructions } =
    options;

  const toneDescriptions: Record<string, string> = {
    friendly: "warm, friendly, and approachable",
    formal: "professional, polite, and formal",
    casual: "relaxed, casual, and personable",
    professional: "professional, polished, and business-like",
    warm: "warm, caring, and heartfelt",
    mediterranean: "warm, Mediterranean-style, with a touch of Barcelona charm",
  };

  const toneDescription =
    toneDescriptions[toneOfVoice] || toneDescriptions.friendly;

  // Generate a unique variation hint to ensure each reply is different
  const variationHint = Math.random().toString(36).substring(2, 8);
  
  // Build custom instructions section if provided
  const customInstructionsSection = customInstructions 
    ? `\n\nCUSTOM INSTRUCTIONS (MUST FOLLOW):\nThe business owner has provided specific instructions that you MUST incorporate into every reply:\n${customInstructions}\n`
    : "";

  const systemPrompt = `
You are a warm, experienced restaurant owner in Barcelona writing personal replies to Google reviews.

PERSONA:
- Write as if you ARE the restaurant owner/manager, not an assistant
- Channel Spanish hospitality: warm, welcoming, like greeting a guest at your door
- Be genuine and personal - you remember faces and value every customer
- Use first person plural ("we", "nosotros", "our team") to feel inclusive

CRITICAL OUTPUT RULES:
- Output ONLY a single valid JSON object - no extra text, markdown, or comments
- If review is empty or unclear, still return JSON with a warm, brief reply

PERSONALIZATION (VERY IMPORTANT):
- ALWAYS mention 1-2 SPECIFIC details from the customer's review
- If they mention a dish → reference it by name ("So glad you loved our paella!")
- If they mention staff → acknowledge it ("Our team will be thrilled to hear this")
- If they describe an experience → reflect it back ("That sunset dinner sounds magical")
- If they mention an occasion → celebrate it ("Happy anniversary! What an honor to be part of your celebration")
- Make them feel SEEN and remembered

BANNED PHRASES (NEVER use these generic lines):
- "Thank you for your feedback"
- "We appreciate your business"
- "Your feedback is valuable to us"
- "Thank you for taking the time"
- "We strive to provide..."
- "Your satisfaction is our priority"

NATURAL OPENINGS (start directly, no long intros):
- Jump straight into acknowledging their specific experience
- Use the customer's name naturally if provided
- NO fixed intro phrases - vary every reply
- Start with what matters: reference their dish, occasion, or compliment immediately

LENGTH LIMIT (CRITICAL):
- Maximum 400 characters total - this is a HARD limit
- Keep replies SHORT: 2-3 sentences maximum
- End cleanly - never cut off mid-sentence

LANGUAGE & TONE:
- Match the EXACT language of the review (Spanish = "es", Catalan = "ca", English = "en")
- Sound like a real person, not a corporation
- Be ${toneDescription}
- Variation seed: ${variationHint}

HANDLING DIFFERENT RATINGS:
- Positive (4-5 stars): Celebrate their experience, reference specific praise, invite them back warmly
- Neutral (3 stars): Acknowledge what they enjoyed, address concerns with genuine care, express desire to do better
- Negative (1-2 stars): Express sincere empathy (not corporate apology), reference their specific concern, offer to make it right personally

Business name: "${restaurantName}"
${customInstructionsSection}
RESPOND ONLY with this JSON format:
{
  "reply": "Your warm, personalized reply here",
  "language": "en" or "es" or "ca",
  "sentiment": "positive" or "negative" or "neutral"
}
`.trim();

  const userPrompt = `Review from ${reviewerName || "a customer"} (${
    rating ?? "no"
  } stars):
"${comment || "No comment provided"}"

Generate the JSON reply as HolaRevi.`;

  try {
    const openai = getOpenAIClient();
    
    // DEBUG: Log the full prompt being sent to OpenAI
    console.log("[OpenAI] Generating reply for:", {
      reviewerName,
      rating,
      commentLength: comment?.length || 0,
      restaurantName,
      toneOfVoice,
      hasCustomInstructions: !!customInstructions,
    });
    console.log("[OpenAI] System prompt preview:", systemPrompt.substring(0, 200) + "...");
    console.log("[OpenAI] User prompt:", userPrompt);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // Use gpt-4o which is a valid, powerful model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.85, // Higher temperature for more varied, natural-sounding replies
    });

    const rawContent = response.choices[0].message.content || "{}";
    
    // DEBUG: Log the raw response from OpenAI
    console.log("[OpenAI] Raw response:", rawContent);

    let result: any;
    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      console.error("Error parsing OpenAI JSON reply:", e, rawContent);
      result = {};
    }

    const rawReply = result.reply || `¡Gracias por visitarnos en ${restaurantName}! Esperamos verte de nuevo pronto.`;
    
    return {
      reply: truncateReply(rawReply, 400),
      language: result.language || "es",
      sentiment:
        result.sentiment ||
        (rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral"),
    };
  } catch (error: any) {
    console.error("OpenAI error:", error?.message ?? error);

    // Warm, hospitality-style fallback replies
    const isPositive = rating >= 4;
    const fallbackReplies = {
      positive: `¡Qué alegría saber que disfrutaste tu visita a ${restaurantName}! Nos encanta tenerte como parte de nuestra familia. ¡Esperamos verte pronto de nuevo!`,
      negative: `Lamentamos mucho que tu experiencia no haya sido la que esperabas. Nos gustaría tener la oportunidad de compensarlo. Si nos contactas, haremos todo lo posible para hacerte sentir como en casa.`,
    };

    return {
      reply: isPositive ? fallbackReplies.positive : fallbackReplies.negative,
      language: "es",
      sentiment: isPositive ? "positive" : "negative",
    };
  }
}

// Review Summary Analysis
export interface ReviewSummaryResult {
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  sentimentScore: number; // 0-100
  keyThemes: Array<{
    theme: string;
    sentiment: "positive" | "neutral" | "negative";
    count: number;
    examples: string[];
  }>;
  trends: {
    improving: string[];
    declining: string[];
    consistent: string[];
  };
  recommendations: string[];
  summary: string;
}

export async function analyzeReviewSummary(
  reviews: Array<{
    rating: number;
    comment: string;
    reviewedAt: Date | string;
    sentiment?: string;
  }>,
  restaurantName: string,
  language: string = "en"
): Promise<ReviewSummaryResult> {
  const languageNames: Record<string, string> = {
    es: "Spanish",
    ca: "Catalan",
    en: "English",
  };
  const targetLanguage = languageNames[language] || "English";

  const noReviewsMessages: Record<string, string> = {
    es: "No hay reseñas para analizar todavía.",
    ca: "No hi ha ressenyes per analitzar encara.",
    en: "No reviews to analyze yet.",
  };

  if (reviews.length === 0) {
    return {
      overallSentiment: "neutral",
      sentimentScore: 50,
      keyThemes: [],
      trends: { improving: [], declining: [], consistent: [] },
      recommendations: [],
      summary: noReviewsMessages[language] || noReviewsMessages.en
    };
  }

  try {
    const openai = getOpenAIClient();

    // Format reviews for analysis
    const reviewsText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): "${r.comment || 'No comment'}"`)
      .join("\n");

    const systemPrompt = `You are an expert restaurant review analyst. Analyze the provided Google reviews and extract meaningful insights.

CRITICAL LANGUAGE REQUIREMENT: ALL text in your response MUST be written in ${targetLanguage}. This includes the summary, theme names, trend descriptions, and recommendations. The ONLY exceptions are the JSON keys which must remain in English.

Your task is to:
1. Identify the overall sentiment and calculate a sentiment score (0-100, where 100 is most positive)
2. Extract 3-6 key themes mentioned in reviews (e.g., "Food Quality", "Service Speed", "Ambiance", "Value for Money", "Staff Friendliness") - translate these to ${targetLanguage}
3. For each theme, determine if the sentiment is positive, neutral, or negative, and count how many reviews mention it
4. Identify trends - what's improving, declining, or staying consistent based on review patterns - write in ${targetLanguage}
5. Provide 2-4 actionable recommendations for the restaurant - write in ${targetLanguage}
6. Write a brief executive summary - write in ${targetLanguage}

CRITICAL: Return ONLY valid JSON with no extra text or markdown. ALL content values must be in ${targetLanguage}.`;

    const userPrompt = `Analyze these ${reviews.length} reviews for "${restaurantName}":

${reviewsText}

Return JSON in this exact format:
{
  "overallSentiment": "positive" | "neutral" | "negative" | "mixed",
  "sentimentScore": <number 0-100>,
  "keyThemes": [
    {
      "theme": "<theme name>",
      "sentiment": "positive" | "neutral" | "negative",
      "count": <number of reviews mentioning this>,
      "examples": ["<short quote from review>", "<another quote>"]
    }
  ],
  "trends": {
    "improving": ["<aspect that's getting better>"],
    "declining": ["<aspect that's getting worse>"],
    "consistent": ["<aspect that stays the same>"]
  },
  "recommendations": ["<actionable recommendation>"],
  "summary": "<2-3 sentence executive summary>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const rawContent = response.choices[0].message.content || "{}";
    console.log("[OpenAI] Review analysis response:", rawContent);

    const result = JSON.parse(rawContent);

    return {
      overallSentiment: result.overallSentiment || "neutral",
      sentimentScore: result.sentimentScore ?? 50,
      keyThemes: result.keyThemes || [],
      trends: result.trends || { improving: [], declining: [], consistent: [] },
      recommendations: result.recommendations || [],
      summary: result.summary || "Analysis complete."
    };
  } catch (error: any) {
    console.error("OpenAI review analysis error:", error?.message ?? error);
    
    // Calculate basic stats from reviews
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    return {
      overallSentiment: avgRating >= 4 ? "positive" : avgRating >= 3 ? "neutral" : "negative",
      sentimentScore: Math.round(avgRating * 20),
      keyThemes: [],
      trends: { improving: [], declining: [], consistent: [] },
      recommendations: ["Unable to generate AI analysis. Please try again later."],
      summary: `Based on ${reviews.length} reviews with an average rating of ${avgRating.toFixed(1)} stars.`
    };
  }
}
