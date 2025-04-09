import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
    const { data, error } = await supabase.from('notes').select('*');

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ notes: data });
};
