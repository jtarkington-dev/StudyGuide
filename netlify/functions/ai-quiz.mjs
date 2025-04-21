export const config = {
    timeout: 26,
};

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const { notes, tag } = JSON.parse(event.body);

    if (!notes || notes.length === 0 || !tag) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No notes or tag provided" }),
        };
    }

    const taggedNotes = notes.filter(n => (n.tags || []).includes(tag));

    if (taggedNotes.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({ quiz: `No notes found for tag "${tag}".` }),
        };
    }

    const selectedNotes = taggedNotes
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    const prompt = `
You are a helpful quiz-generating AI assistant.

Based on the following study notes, create exactly 10 quiz questions focused on the tag: "${tag}".

Use this exact format for each question:

1. Question text? a) Option A b) Option B c) Option C d) Option D  
**Answer:** b \`correct value here\`  
**Why:** explanation here

Only generate the questions — do not add commentary or extras.

NOTES:
${selectedNotes.map(n => `Title: ${n.title}\nContent: ${n.content}`).join("\n\n")}
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat-v3-0324:free",
                messages: [
                    { role: "system", content: "You are a quiz-making AI assistant." },
                    { role: "user", content: prompt },
                ],
            }),
        });

        const data = await response.json();
        console.log("✅ OpenRouter Quiz Response:", JSON.stringify(data, null, 2));

        const reply = data.choices?.[0]?.message?.content || "No response";

        return {
            statusCode: 200,
            body: JSON.stringify({ quiz: reply }),
        };
    } catch (err) {
        console.error("❌ AI Quiz Error:", err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
