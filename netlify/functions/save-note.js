import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, context) {
    const body = await req.json();
    const { title, content, tags } = body;

    if (!title || !content) {
        return new Response(JSON.stringify({ error: "Title and content required." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { error } = await supabase.from('notes').insert([
        { title, content, tags, next_review: tomorrow.toISOString() }
    ]);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
