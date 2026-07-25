export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set; skipping embedding generation");
    return null;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      },
    );
    if (!res.ok) {
      console.warn(`Embedding API returned status ${res.status}`);
      return null;
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    if (Array.isArray(values)) {
      return values as number[];
    }
    return null;
  } catch (err) {
    console.warn("Error fetching embedding:", err);
    return null;
  }
}
