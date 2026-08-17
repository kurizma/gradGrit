import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // GET /messages - list messages
    if (url.pathname === '/messages' && request.method === 'GET') {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // Optional query param: ?approved=true
      const approvedParam = url.searchParams.get('approved');

      let query = supabase
        .from('messages')
        .select('id, name, message, approved, created_at, ip_address')
        .order('created_at', { ascending: false })
        .limit(50);

      if (approvedParam === 'true') {
        query = query.eq('approved', true);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // POST /messages - create a new message
    if (url.pathname === '/messages' && request.method === 'POST') {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      const body = await request.json();
      const { name, message, ip_address } = body;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          name: name ?? null,
          message: message ?? null,
          ip_address: ip_address ?? null,
          approved: false, // default to unapproved
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }
    );
  },
};