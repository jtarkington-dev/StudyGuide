// Allow maximum time Netlify permits (26 seconds for sync functions)
export const config = {
    timeout: 26
};

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const { notes, tag } = JSON.parse(event.body);

    if (!notes || notes.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No notes provided" }),
        };
    }

    const prompt = `
  You are a helpful quiz-generating AI.
  
  Based on the following notes, create 5 quiz questions focused on the tag: "${tag}"
  
  Use this format exactly:
  
  1. Question text? a) Option A b) Option B c) Option C d) Option D  
  **Answer:** b \`correct value here\`  
  **Why:** explanation here
  
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
