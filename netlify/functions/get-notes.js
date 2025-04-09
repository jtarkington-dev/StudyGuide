import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, context) {
    const { data, error } = await supabase.from('notes').select('*');

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ notes: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
