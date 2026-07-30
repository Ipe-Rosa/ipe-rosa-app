// ===== CONFIGURAÇÃO DO SUPABASE =====
// Troque pelos SEUS valores (Settings > API no Supabase)
const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLISHABLE_KEY";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ALTERNAR ENTRE AS ABAS =====
const tabEntrar = document.getElementById("tab-entrar");
const tabCadastrar = document.getElementById("tab-cadastrar");
const formEntrar = document.getElementById("form-entrar");
const formCadastrar = document.getElementById("form-cadastrar");

tabEntrar.addEventListener("click", () => {
  tabEntrar.classList.add("active");
  tabCadastrar.classList.remove("active");
  formEntrar.style.display = "block";
  formCadastrar.style.display = "none";
});

tabCadastrar.addEventListener("click", () => {
  tabCadastrar.classList.add("active");
  tabEntrar.classList.remove("active");
  formCadastrar.style.display = "block";
  formEntrar.style.display = "none";
});

// ===== LOGIN =====
formEntrar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const mensagem = document.getElementById("login-mensagem");

  mensagem.textContent = "Entrando...";
  mensagem.className = "mensagem";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagem.textContent = "Erro: " + traduzirErro(error.message);
    mensagem.className = "mensagem erro";
  } else {
    mensagem.textContent = "Login feito com sucesso! Redirecionando...";
    mensagem.className = "mensagem sucesso";
    window.location.href = "painel.html";
  }
});

// ===== CADASTRO =====
formCadastrar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("cad-email").value;
  const senha = document.getElementById("cad-senha").value;
  const mensagem = document.getElementById("cad-mensagem");

  mensagem.textContent = "Criando conta...";
  mensagem.className = "mensagem";

  const { error } = await supabaseClient.auth.signUp({
    email: email,
    password: senha
  });

  if (error) {
    mensagem.textContent = "Erro: " + traduzirErro(error.message);
    mensagem.className = "mensagem erro";
  } else {
    mensagem.textContent = "Conta criada! Clique em 'Entrar' para acessar.";
    mensagem.className = "mensagem sucesso";
  }
});

// ===== TRADUÇÃO DE ERROS COMUNS =====
function traduzirErro(msgOriginal) {
  const mapa = {
    "Invalid login credentials": "e-mail ou senha incorretos",
    "User already registered": "esse e-mail já tem cadastro, tente entrar",
    "Password should be at least 6 characters": "a senha precisa ter no mínimo 6 caracteres",
    "Email not confirmed": "confirme seu e-mail antes de entrar (verifique sua caixa de entrada)"
  };
  return mapa[msgOriginal] || msgOriginal;
}
