import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("ERREUR: Variables d'env SUPABASE manquantes");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NEW_PIN = "0000";
const USERNAME = "Sidi";
const EMAIL = `${USERNAME.toLowerCase()}@mauricarnet.app`;

async function backfill() {
  // 1. Vérifier si l'user existe déjà avec auth_uid
  const { data: existing, error: checkErr } = await supabase
    .from("users")
    .select("id, username, auth_uid, enc_salt")
    .eq("username", USERNAME)
    .single();

  if (checkErr) {
    console.error("Erreur vérification user:", checkErr);
    process.exit(1);
  }

  console.log("User trouvé:", JSON.stringify(existing, null, 2));

  if (existing.auth_uid) {
    console.log("⚠️  User a déjà un auth_uid — rien à faire");
    return;
  }

  // 2. Créer un Auth user Supabase
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: NEW_PIN,
    email_confirm: true,
    user_metadata: { username: USERNAME },
  });

  if (authErr) {
    if (authErr.message?.includes("already exists")) {
      console.log("⚠️  Auth user existe déjà — récupération...");
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const authUser = usersList?.users?.find(u => u.email === EMAIL);
      if (!authUser) {
        console.error("Impossible de trouver l'auth user existant");
        process.exit(1);
      }
      var authUid = authUser.id;
      console.log("Auth UID existant:", authUid);
    } else {
      console.error("Erreur création auth user:", authErr);
      process.exit(1);
    }
  } else {
    var authUid = authData.user.id;
    console.log("Auth UID créé:", authUid);
  }

  // 3. Mettre à jour public.users
  const newSalt = crypto.randomUUID();
  const { error: updateErr } = await supabase
    .from("users")
    .update({
      auth_uid: authUid,
      enc_salt: newSalt,
      pin_hash: "",
    })
    .eq("username", USERNAME);

  if (updateErr) {
    console.error("Erreur mise à jour users:", updateErr);
    // Rollback: supprimer l'auth user si on vient de le créer
    if (!authData?.user?.id) {
      await supabase.auth.admin.deleteUser(authUid);
    }
    process.exit(1);
  }

  console.log(`✅ User "${USERNAME}" backfillé avec succès !`);
  console.log(`   auth_uid: ${authUid}`);
  console.log(`   enc_salt: ${newSalt}`);
  console.log(`   Nouveau PIN: ${NEW_PIN}`);
  console.log(`   ⚠️  L'utilisateur doit être informé du nouveau PIN.`);
}

backfill().catch(console.error);
