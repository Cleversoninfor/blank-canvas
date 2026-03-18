import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão de admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Helper to extract granular permissions
    const extractPermissions = (source: any) => {
      const perms: Record<string, boolean> = {};
      for (const key in source) {
        if (key.startsWith("perm_")) {
          perms[key] = Boolean(source[key]);
        }
      }
      return perms;
    };

    if (action === "create") {
      const { usuario, senha, acesso_operacoes, acesso_gestao, acesso_sistema } = body;
      const permissions = extractPermissions(body);

      if (!usuario || !senha) {
        return new Response(JSON.stringify({ error: "Usuário e senha são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate or preserve the internal login email for this admin user
      const normalizedUsuario = usuario.trim();
      const normalizedLower = normalizedUsuario.toLowerCase();
      const internalDomain = "@admin.internal";
      const slugSource = normalizedLower.endsWith(internalDomain)
        ? normalizedLower.slice(0, -internalDomain.length)
        : normalizedLower.split("@")[0];
      const slug = slugSource.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "admin";
      const loginEmail = normalizedLower.endsWith(internalDomain)
        ? normalizedLower
        : `${slug}@admin.internal`;

      // Create Supabase Auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: loginEmail,
        password: senha,
        email_confirm: true,
        user_metadata: { admin_usuario: normalizedUsuario, is_admin_user: true },
      });

      if (authError) {
        console.error("Auth create error:", authError);
        return new Response(JSON.stringify({ error: `Erro ao criar conta: ${authError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add admin role in user_roles
      await supabaseAdmin.from("user_roles").insert({
        user_id: authUser.user.id,
        role: "admin",
      });

      // Insert into admin_users table
      const { data: adminUser, error: insertError } = await supabaseAdmin
        .from("admin_users")
        .insert({
          usuario: normalizedUsuario,
          senha, // Will be hashed by trigger
          acesso_operacoes: acesso_operacoes ?? false,
          acesso_gestao: acesso_gestao ?? false,
          acesso_sistema: acesso_sistema ?? false,
          auth_user_id: authUser.user.id,
          login_email: loginEmail,
          ...permissions,
        })
        .select("*")
        .single();

      if (insertError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", authUser.user.id);
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: `Erro ao salvar: ${insertError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(adminUser), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update") {
      const { id, usuario, acesso_operacoes, acesso_gestao, acesso_sistema } = body;
      const permissions = extractPermissions(body);

      const updateFields: Record<string, unknown> = { ...permissions };
      if (usuario !== undefined) updateFields.usuario = usuario;
      if (acesso_operacoes !== undefined) updateFields.acesso_operacoes = acesso_operacoes;
      if (acesso_gestao !== undefined) updateFields.acesso_gestao = acesso_gestao;
      if (acesso_sistema !== undefined) updateFields.acesso_sistema = acesso_sistema;

      const { error } = await supabaseAdmin
        .from("admin_users")
        .update(updateFields)
        .eq("id", id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "change_password") {
      const { id, senha: newPassword } = body;

      // Get auth_user_id from admin_users
      const { data: adminUser } = await supabaseAdmin
        .from("admin_users")
        .select("auth_user_id")
        .eq("id", id)
        .single();

      if (adminUser?.auth_user_id) {
        // Update Supabase Auth password
        await supabaseAdmin.auth.admin.updateUserById(adminUser.auth_user_id, {
          password: newPassword,
        });
      }

      // Also update in admin_users table (trigger will hash it)
      const { error } = await supabaseAdmin
        .from("admin_users")
        .update({ senha: newPassword })
        .eq("id", id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete") {
      const { id } = body;

      // Get auth_user_id before deleting
      const { data: adminUser } = await supabaseAdmin
        .from("admin_users")
        .select("auth_user_id")
        .eq("id", id)
        .single();

      if (adminUser?.auth_user_id) {
        // Delete from user_roles
        await supabaseAdmin.from("user_roles").delete().eq("user_id", adminUser.auth_user_id);
        // Delete Supabase Auth user
        await supabaseAdmin.auth.admin.deleteUser(adminUser.auth_user_id);
      }

      const { error } = await supabaseAdmin
        .from("admin_users")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
