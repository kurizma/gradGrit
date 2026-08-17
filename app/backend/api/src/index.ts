import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

function corsHeaders(origin?: string) {
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || undefined;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok' }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    // GET /messages
    if (url.pathname === '/messages' && request.method === 'GET') {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
            headers: {
              'content-type': 'application/json',
              ...corsHeaders(origin),
            },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    // POST /messages
    if (url.pathname === '/messages' && request.method === 'POST') {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      let body: any;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
              ...corsHeaders(origin),
            },
          }
        );
      }

      const { name, message, ip_address, access_code } = body;

      if (!access_code || access_code !== env.MSG_ACCESS_CODE) {
        return new Response(
          JSON.stringify({ error: 'Invalid access code' }),
          {
            status: 403,
            headers: {
              'content-type': 'application/json',
              ...corsHeaders(origin),
            },
          }
        );
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          name: name ?? null,
          message: message ?? null,
          ip_address: ip_address ?? null,
          approved: false,
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: {
              'content-type': 'application/json',
              ...corsHeaders(origin),
            },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 201,
          headers: {
            'content-type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          'content-type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  },
};