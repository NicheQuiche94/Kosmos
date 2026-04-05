import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload: any = {
      model: body.model || "claude-sonnet-4-20250514",
      max_tokens: body.max_tokens || 1500,
      system: body.system,
      messages: body.messages,
    };

    if (body.tools) payload.tools = body.tools;

    console.log("Chat API request:", { model: payload.model, max_tokens: payload.max_tokens, hasSystem: !!payload.system, messageCount: payload.messages?.length, hasApiKey: !!process.env.ANTHROPIC_API_KEY });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(errorJson, { status: response.status });
      } catch {
        return NextResponse.json({ error: errorText }, { status: response.status });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
