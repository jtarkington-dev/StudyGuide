import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async (req) => {
    const { id, correct } = await req.json();

    if (!id || typeof correct !== "boolean") {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const date = new Date();
    const daysToAdd = correct ? 3 : 1;
    date.setDate(date.getDate() + daysToAdd);

    const { error } = await supabase
        .from("notes")
        .update({ next_review: date.toISOString() })
        .eq("id", id);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
