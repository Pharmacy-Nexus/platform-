import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://mflvykvoszvzrholoblp.supabase.co';
const supabaseAnonKey = 'sb_publishable_6UoVagkJGjFDqWcLVyJuFQ_J6f7jOef';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(targetId, text, ok = true) {
  el(targetId).innerHTML = `<p class="muted" style="color:${ok ? "#1c9d61" : "#d84d4d"};">${escapeHtml(text)}</p>`;
}

function clearForm() {
  el("questionId").value = "";
  el("topic").value = "";
  el("difficulty").value = "medium";
  el("caseScenario").value = "";
  el("question").value = "";
  el("opt1").value = "";
  el("opt2").value = "";
  el("opt3").value = "";
  el("opt4").value = "";
  el("correctAnswer").value = "";
  el("explanation").value = "";
  el("summary").value = "";
}

function getFormData() {
  return {
    id: el("questionId").value.trim() || `int_${Date.now()}`,
    topic: el("topic").value.trim().toLowerCase(),
    difficulty: el("difficulty").value,
    type: "case",
    case_scenario: el("caseScenario").value.trim(),
    question: el("question").value.trim(),
    options: [
      el("opt1").value.trim(),
      el("opt2").value.trim(),
      el("opt3").value.trim(),
      el("opt4").value.trim()
    ].filter(Boolean),
    correct_answer: el("correctAnswer").value.trim(),
    explanation: el("explanation").value.trim(),
    summary: el("summary").value.trim(),
    is_active: true
  };
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (session) {
    el("adminPanel").classList.remove("hidden");
    el("logoutBtn").classList.remove("hidden");
    showMessage("authMessage", `Logged in as ${session.user.email}`, true);
  } else {
    el("adminPanel").classList.add("hidden");
    el("logoutBtn").classList.add("hidden");
  }
}

async function login() {
  const email = el("loginEmail").value.trim();
  const password = el("loginPassword").value.trim();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("authMessage", error.message, false);
    return;
  }

  await checkSession();
}

async function logout() {
  await supabase.auth.signOut();
  await checkSession();
  showMessage("authMessage", "Logged out.", true);
}

async function saveQuestion() {
  const payload = getFormData();

  if (!payload.topic || !payload.question || payload.options.length < 2 || !payload.correct_answer) {
    showMessage("adminMessage", "Please fill the required fields.", false);
    return;
  }

  const editingId = el("questionId").value.trim();

  let result;

  if (editingId) {
    result = await supabase
      .from("intern_questions")
      .update({
        topic: payload.topic,
        difficulty: payload.difficulty,
        type: payload.type,
        case_scenario: payload.case_scenario,
        question: payload.question,
        options: payload.options,
        correct_answer: payload.correct_answer,
        explanation: payload.explanation,
        summary: payload.summary,
        is_active: true
      })
      .eq("id", editingId);
  } else {
    result = await supabase
      .from("intern_questions")
      .insert(payload);
  }

  if (result.error) {
    showMessage("adminMessage", result.error.message, false);
    return;
  }

  showMessage("adminMessage", editingId ? "Question updated." : "Question added.", true);
  clearForm();
  await loadQuestions();
}

async function loadQuestions() {
  const topic = el("filterTopic").value.trim().toLowerCase();

  let query = supabase
    .from("intern_questions")
    .select("*")
    .order("id", { ascending: false });

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;

  if (error) {
    showMessage("adminMessage", error.message, false);
    return;
  }

  el("questionList").innerHTML = (data || []).map((q) => `
    <div class="review-card">
      <h3>${escapeHtml(q.question)}</h3>
      <p><strong>ID:</strong> ${escapeHtml(q.id)}</p>
      <p><strong>Topic:</strong> ${escapeHtml(q.topic)}</p>
      <p><strong>Difficulty:</strong> ${escapeHtml(q.difficulty)}</p>
      <div class="small-row">
        <button class="mini-btn" data-edit="${escapeHtml(q.id)}">Edit</button>
        <button class="mini-btn" data-delete="${escapeHtml(q.id)}">Delete</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => editQuestion(btn.getAttribute("data-edit"), data));
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteQuestion(btn.getAttribute("data-delete")));
  });
}

function editQuestion(id, rows) {
  const q = rows.find(item => item.id === id);
  if (!q) return;

  el("questionId").value = q.id || "";
  el("topic").value = q.topic || "";
  el("difficulty").value = q.difficulty || "medium";
  el("caseScenario").value = q.case_scenario || "";
  el("question").value = q.question || "";
  el("opt1").value = q.options?.[0] || "";
  el("opt2").value = q.options?.[1] || "";
  el("opt3").value = q.options?.[2] || "";
  el("opt4").value = q.options?.[3] || "";
  el("correctAnswer").value = q.correct_answer || "";
  el("explanation").value = q.explanation || "";
  el("summary").value = q.summary || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteQuestion(id) {
  const ok = confirm("Delete this question?");
  if (!ok) return;

  const { error } = await supabase
    .from("intern_questions")
    .delete()
    .eq("id", id);

  if (error) {
    showMessage("adminMessage", error.message, false);
    return;
  }

  showMessage("adminMessage", "Question deleted.", true);
  await loadQuestions();
}

el("loginBtn").addEventListener("click", login);
el("logoutBtn").addEventListener("click", logout);
el("saveBtn").addEventListener("click", saveQuestion);
el("clearBtn").addEventListener("click", clearForm);
el("loadBtn").addEventListener("click", loadQuestions);

checkSession();
