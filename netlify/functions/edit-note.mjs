import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async (req, res) => {
    const body = await req.json();
    const { id, title, content, tags } = body;

    if (!id || !title || !content) {
        return new Response(JSON.stringify({ error: "ID, title, and content required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { error } = await supabase
        .from('notes')
        .update({ title, content, tags })
        .eq('id', id);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};
