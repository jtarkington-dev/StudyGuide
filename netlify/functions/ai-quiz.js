export default async (req, res) => {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const { notes, tag } = await req.json();

    if (!notes || notes.length === 0) {
        return res.status(400).json({ error: "No notes provided" });
    }

    const prompt = `
  You're an intelligent learning assistant. Generate 25 quiz questions based on the following notes. Each question should be short-answer or multiple-choice. Focus on the tag: "${tag}".
    
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
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a quiz-making AI assistant." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "No response";

        return res.status(200).json({ quiz: reply });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
