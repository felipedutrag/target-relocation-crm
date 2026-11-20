import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface WorkspaceMember {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: "admin" | "ops" | "sdr_outbound" | "sdr_inbound" | string;
  crm_owner_name: string | null;
  weekly_responsibility: string | null;
  is_active: boolean;
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL/Key não configuradas nas variáveis de ambiente.");
  }
  return { url, key };
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called inside Server Component; Proxy refreshes tokens cleanly
        }
      },
    },
  });
}

export function createPublicClient() {
  const { url, key } = getSupabaseEnv();
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireWorkspaceUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      member: null,
      errorResponse: NextResponse.json(
        { error: "Sessão expirada ou usuário não autenticado. Faça login novamente." },
        { status: 401 }
      ),
    };
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    return {
      supabase,
      user,
      member: null,
      errorResponse: NextResponse.json(
        { error: "Usuário autenticado sem vínculo ativo em workspace_members." },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    user,
    member: member as WorkspaceMember,
    errorResponse: null,
  };
}
