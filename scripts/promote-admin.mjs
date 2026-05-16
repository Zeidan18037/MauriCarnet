import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");

function getEnv(key: string): string | null {
  for (const line of envLocal.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (k === key) return v;
  }
  return null;
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const username = process.argv[2];
if (!username) {
  console.error("Usage: node scripts/promote-admin.mjs <username>");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find user by username
const { data: userRow, error: findError } = await admin
  .from("users")
  .select("id, username, auth_uid")
  .eq("username", username)
  .single();

if (findError || !userRow) {
  console.error(`User "${username}" not found:`, findError?.message);
  process.exit(1);
}

if (!userRow.auth_uid) {
  console.error(`User "${username}" has no auth_uid (never logged in via Supabase)`);
  process.exit(1);
}

// Set app_metadata via Auth Admin API
const { data: updatedUser, error: updateError } = await admin.auth.admin.updateUserById(
  userRow.auth_uid,
  { app_metadata: { role: "admin" } }
);

if (updateError) {
  console.error("Failed to promote user:", updateError.message);
  process.exit(1);
}

console.log(`✅ User "${username}" (${userRow.auth_uid}) promoted to admin`);
console.log("The user must log out and log back in for the new role to take effect.");
