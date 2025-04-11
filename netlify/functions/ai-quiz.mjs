export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // ⛔ DEBUG LOG for Netlify deploy logs
    console.log("🔍 OPENROUTER_API_KEY:", OPENROUTER_API_KEY ? "✅ Loaded" : "❌ MISSING");

    const { notes, tag } = JSON.parse(event.body);

    // 🧱 Sanity check
    if (!notes || notes.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No notes provided" }),
        };
    }

    // 🔐 Check if env key is missing
    if (!OPENROUTER_API_KEY) {
        console.error("❌ OPENROUTER_API_KEY is not defined in environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Missing OpenRouter API key" }),
        };
    }

    const prompt = `
You're an intelligent quiz-making assistant.

Generate 10 quiz questions from the notes below using this format:

[FORMAT]
1. Question text? a) Option A b) Option B c) Option C d) Option D
**Answer:** b \`correct value here\`
**Why:** explanation here

Focus on this topic tag: "${tag}"
NOTES:
${notes.map(n => `Title: ${n.title}\nContent: ${n.content}`).join("\n\n")}
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat-v3-0324:free",
                messages: [
                    { role: "system", content: "You are a quiz-making AI assistant." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();

        console.log("✅ OpenRouter response:", JSON.stringify(data, null, 2));

        const reply = data.choices?.[0]?.message?.content || "No response";

        return {
            statusCode: 200,
            body: JSON.stringify({ quiz: reply }),
        };
    } catch (err) {
        console.error("❌ API Error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
