const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLISHABLE_KEY";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "conta.html";
    return;
  }

  document.getElementById("boas-vindas").textContent = "Bem-vinda, " + session.user.email + "!";
}

document.getElementById("btn-sair").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "conta.html";
});

verificarLogin();
