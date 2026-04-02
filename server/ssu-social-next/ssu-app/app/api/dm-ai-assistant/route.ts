import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// POST /api/dm-ai-assistant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lesson_id = String(body?.lesson_id || "").trim();
    const user_id = String(body?.user_id || "").trim();
    const question = String(body?.question || "").trim();

    if (!lesson_id || !user_id || !question) {
      return NextResponse.json(
        { error: "lesson_id, user_id and question are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔒 Basic protection
    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question too long (max 500 chars)." },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Load lesson from YOUR DB (exact structure)
    const rows = await sql`
      SELECT
        lesson_id,
        title,
        style,
        difficulty,
        duration_sec,
        video_url,
        description
      FROM dm_lessons
      WHERE lesson_id = ${lesson_id}
      LIMIT 1
    `;

    if (!rows?.length) {
      return NextResponse.json(
        { error: "Lesson not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const lesson = rows[0];

    // 🔒 Block obvious off-topic questions
    const lowerQ = question.toLowerCase();
    const blocked = [
      "politics",
      "bitcoin",
      "stock",
      "weather",
      "programming",
      "code",
      "hacking",
      "religion",
      "homework",
      "math",
    ];

    if (blocked.some((w) => lowerQ.includes(w))) {
      return NextResponse.json(
        {
          answer:
            `I can help only with this ${lesson.style} lesson. ` +
            `Ask about steps, movement, rhythm, posture, or technique.`,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 🧠 SYSTEM PROMPT (core logic)
    const systemPrompt = `
You are DanceMaster AI, a lesson-specific dance assistant.

Rules:
- Answer in plain text only.
- Keep answers short, clear, and practical.
- Use the lesson description as the MAIN source of truth.
- If the user asks about a move, explain that move in simpler words.
- Help the user perform the move more easily.
- You may use general dance knowledge only to SUPPORT the explanation.
- Do NOT go outside this lesson.
- If unrelated question → politely refuse.
`;

    // 🧠 USER PROMPT (dynamic per lesson)
    const userPrompt = `
Lesson:
Title: ${lesson.title}
Style: ${lesson.style}
Difficulty: ${lesson.difficulty}

Lesson description:
${lesson.description || "No description provided."}

User question:
${question}

Instructions:
- Explain based on the lesson first.
- If lesson says something like "move your hip down", explain HOW to do it easier.
- Keep answer practical and beginner-friendly.
`;

    // 🤖 OpenAI call
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "web_search" }], // optional support
    });

    const answer =
      response.output_text?.trim() ||
      `Ask about the steps, rhythm, or movement in this lesson.`;

    return NextResponse.json(
      {
        answer,
        lesson: {
          lesson_id: lesson.lesson_id,
          title: lesson.title,
          style: lesson.style,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("AI ROUTE ERROR:", err);

    return NextResponse.json(
      { error: err?.message ?? "AI request failed." },
      { status: 500, headers: corsHeaders }
    );
  }
}