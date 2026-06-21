import { createServerFn } from "@tanstack/react-start";

export type EstimatePayload = {
  setup: {
    country: string;
    projectType: string;
    areaSize: string;
    areaUnit: string;
  };
  answers: Record<string, string>;
};

export type EstimateResult = {
  currency: string;
  total_estimate_min: string;
  total_estimate_max: string;
  cost_per_sqft: string;
  breakdown: {
    foundation: string;
    structure: string;
    finishing: string;
    electrical: string;
    plumbing: string;
    labor: string;
  };
  assumptions: string[];
  notes: string;
};

const SYSTEM_PROMPT = `You are a senior construction cost estimation expert.
Use the provided project data to calculate a realistic construction cost estimate based on:
- Country-specific construction rates
- Material quality
- Labor costs
- Market conditions

Return ONLY valid JSON in exactly this shape:
{
  "currency": "",
  "total_estimate_min": "",
  "total_estimate_max": "",
  "cost_per_sqft": "",
  "breakdown": {
    "foundation": "",
    "structure": "",
    "finishing": "",
    "electrical": "",
    "plumbing": "",
    "labor": ""
  },
  "assumptions": [],
  "notes": ""
}
Numbers should be plain numeric strings without commas or currency symbols (the currency goes in "currency"). Be realistic and conservative. Do not include any text outside the JSON.`;

export const generateEstimate = createServerFn({ method: "POST" })
  .inputValidator((input: EstimatePayload) => input)
  .handler(async ({ data }): Promise<EstimateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userContent = `Project data:\n${JSON.stringify(data, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI gateway error: ${res.status} ${txt}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: EstimateResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid AI response");
      parsed = JSON.parse(match[0]);
    }
    return parsed;
  });
