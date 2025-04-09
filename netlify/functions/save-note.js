import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
    const { title, content, tags } = await req.json();

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content required." });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { error } = await supabase.from('notes').insert([
        { title, content, tags, next_review: tomorrow.toISOString() }
    ]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
};
