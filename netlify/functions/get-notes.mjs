import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req) {
    const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, tags, created_at, next_review');


    if (error) {
        console.error("🔥 Supabase fetch error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ notes: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
