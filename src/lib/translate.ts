import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const localeInstructions: Record<string, string> = {
  da: "Translate this support article to Danish. Use formal Danish (De-form) suitable for enterprise B2B software documentation.",
  sv: "Translate this support article to Swedish. Use formal Swedish suitable for enterprise B2B software documentation.",
  de: "Translate this support article to German. Use formal German (Sie-form) suitable for enterprise B2B software documentation.",
}

export interface TranslationResult {
  title: string
  content: unknown
  excerpt: string
}

export async function translateArticle(
  title: string,
  content: unknown,
  targetLocale: string
): Promise<TranslationResult> {
  const instruction = localeInstructions[targetLocale]
  if (!instruction) throw new Error(`Unsupported locale: ${targetLocale}`)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    messages: [
      {
        role: "user",
        content: `${instruction}

IMPORTANT: Return ONLY valid JSON with no markdown, no code blocks. Format:
{"title":"<translated title>","content":<translated Tiptap JSON — keep exact structure>,"excerpt":"<1-2 sentence summary in ${targetLocale}>"}

Title: ${title}
Content (Tiptap JSON): ${JSON.stringify(content)}`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Strip any markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract JSON from the response
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No valid JSON in translation response")
    return JSON.parse(match[0])
  }
}
