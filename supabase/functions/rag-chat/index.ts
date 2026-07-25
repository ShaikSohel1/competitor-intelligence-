import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { embedText } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

async function getCurrentUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header is required");
  }

  const token = authHeader.slice("Bearer ".length);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceRoleKey,
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!data?.user?.id) {
    throw new Error("Unauthorized");
  }

  return data.user.id;
}

async function geminiGenerate(prompt: string): Promise<string | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    console.info('[AI Service] rag-chat Gemini skipped, GEMINI_API_KEY not configured');
    return null;
  }
  console.info('[AI Service] rag-chat geminiGenerate', {
    model: 'gemini-1.5-flash',
    promptLength: prompt.length,
  });
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
        }),
      },
    );
    if (!res.ok) {
      console.error('[AI Service] rag-chat geminiGenerate response error', { status: res.status, statusText: res.statusText });
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error('[AI Service] rag-chat geminiGenerate failed', err);
    return null;
  }
}

interface KnowledgeChunkRow {
  id: string;
  user_id: string;
  competitor_id: string | null;
  source_table: string;
  source_id: string;
  content: string;
  distance?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const userId = await getCurrentUserId(req);
    const body = await req.json();
    const question: string = body.question;
    const competitorId: string | undefined = body.competitorId;

    console.info('[AI Service] rag-chat request', {
      competitorId,
      questionLength: question?.length ?? 0,
    });

    if (!question || typeof question !== "string" || !question.trim()) {
      return json({ error: "question is required" }, 400);
    }

    const sb = adminClient();
    const queryEmbedding = await embedText(question);

    let chunks: KnowledgeChunkRow[] = [];

    if (queryEmbedding && Array.isArray(queryEmbedding)) {
      const { data, error: rpcErr } = await sb.rpc("match_knowledge_chunks", {
        query_embedding: queryEmbedding,
        match_user_id: userId,
        match_count: 8,
      });

      if (!rpcErr && Array.isArray(data)) {
        chunks = data as KnowledgeChunkRow[];
      }
    }

    // Fallback search if embedding fails or returns empty
    if (!chunks.length) {
      let query = sb
        .from("knowledge_chunks")
        .select("id, user_id, competitor_id, source_table, source_id, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (competitorId) {
        query = query.eq("competitor_id", competitorId);
      }

      const { data: fallbackData } = await query;
      if (Array.isArray(fallbackData)) {
        chunks = fallbackData as KnowledgeChunkRow[];
      }
    } else if (competitorId) {
      chunks = chunks.filter((c) => c.competitor_id === competitorId);
    }

    const sources = chunks.slice(0, 8).map((c) => ({
      source_table: c.source_table,
      competitor_id: c.competitor_id ?? null,
      content: c.content,
    }));

    const contextItems = chunks
      .map((c, i) => `${i + 1}. ${c.content}`)
      .join("\n");

    const prompt = `You are a competitor intelligence AI assistant. Answer the user's question using ONLY the provided context below.
- Cite competitor names naturally in your answer.
- If the provided context does not contain enough information to answer the question, state clearly: "I don't have enough data on that yet".
- Do not make up facts outside the provided context.

Context:
${contextItems || "No context chunks available."}

Question:
${question}`;

    let answer = await geminiGenerate(prompt);
    if (!answer) {
      console.info('[AI Service] rag-chat fallback to context-only answer', {
        chunksFound: chunks.length,
      });
      if (chunks.length > 0) {
        answer =
          "Based on retrieved competitor data:\n" +
          chunks.map((c) => `- ${c.content}`).join("\n");
      } else {
        answer = "I don't have enough data on that yet.";
      }
    }

    // Persist user question and assistant answer in chat_messages
    await sb.from("chat_messages").insert([
      {
        user_id: userId,
        competitor_id: competitorId ?? null,
        role: "user",
        content: question,
        sources: [],
      },
      {
        user_id: userId,
        competitor_id: competitorId ?? null,
        role: "assistant",
        content: answer,
        sources: sources,
      },
    ]);

    return json({ answer, sources });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RAG chat failed";
    return json({ error: msg }, 500);
  }
});
