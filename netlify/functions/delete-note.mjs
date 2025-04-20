import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req) {
  try {
    const { id } = await req.json();
    console.log("🧪 Deleting note with id:", id);

    if (!id) {
      return new Response(JSON.stringify({ error: 'No ID provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if it exists
    const { data: found, error: findError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id);

    if (findError) {
      console.error("🔍 Find error:", findError.message);
      return new Response(JSON.stringify({ error: findError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!found || found.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    //  REAL DELETE
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("🗑️ Delete error:", deleteError.message);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(" Note deleted successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(" Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
