(function () {
  'use strict';

  const PAGE = document.body.dataset.page || 'home';
  const SET_SIZE = 30;
  const KEYS = {
    progress: 'pn_progress_v3',
    saved: 'pn_saved_v3',
    adminPass: 'pn_admin_pass_v3',
    github: 'pn_github_v3',
    review: 'pn_review_v3',
    retry: 'pn_retry_v3'
  };

  const state = {
    index: null,
    subjectMap: new Map(),
    topicMap: new Map(),
    questionCache: new Map(),
    currentReview: null
  };

  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  const getJSON = async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  };

  const slugify = (value) => value.toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const params = () => new URLSearchParams(window.location.search);
  const readStore = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const formatDate = (date) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);

  async function loadIndex() {
    if (state.index) return state.index;
    const index = await getJSON('./data/index.json');
    state.index = index;
    state.subjectMap.clear();
    state.topicMap.clear();
    index.subjects.forEach((subject) => {
      state.subjectMap.set(subject.id, subject);
      subject.topics.forEach((topic) => {
        state.topicMap.set(`${subject.id}:${topic.id}`, { ...topic, subjectId: subject.id, subjectName: subject.name });
      });
    });
    return index;
  }

  async function loadTopic(subjectId, topicId) {
    const key = `${subjectId}:${topicId}`;
    if (state.questionCache.has(key)) return state.questionCache.get(key);
    const topicMeta = state.topicMap.get(key);
    if (!topicMeta) throw new Error('Topic not found');
    const data = await getJSON(`./${topicMeta.file}`);
    state.questionCache.set(key, data);
    return data;
  }

  function pageLink(path, query = {}) {
    const u = new URL(path, window.location.href);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    });
    return `${u.pathname.split('/').pop()}${u.search}`;
  }

  function getSavedIds() { return readStore(KEYS.saved, []); }
  function setSavedIds(ids) { writeStore(KEYS.saved, ids); }
  function isSaved(id) { return getSavedIds().includes(id); }
  function toggleSaved(question) {
    const ids = getSavedIds();
    const exists = ids.includes(question.id);
    let next;
    if (exists) {
      next = ids.filter((id) => id !== question.id);
    } else {
      next = [...ids, question.id];
    }
    setSavedIds(next);
    const progress = readStore(KEYS.progress, { savedBank: {} });
    progress.savedBank = progress.savedBank || {};
    if (!exists) progress.savedBank[question.id] = question;
    else delete progress.savedBank[question.id];
    writeStore(KEYS.progress, progress);
    return !exists;
  }


  function getSavedNotes() {
    const progress = getProgress();
    progress.savedNotes = progress.savedNotes || {};
    return progress.savedNotes;
  }

  function getNote(questionId) {
    return getSavedNotes()[questionId]?.note || '';
  }

  function hasNote(questionId) {
    return !!getNote(questionId).trim();
  }

  function setNote(question, noteText) {
    const progress = getProgress();
    progress.savedNotes = progress.savedNotes || {};
    const clean = (noteText || '').trim();
    if (!clean) {
      delete progress.savedNotes[question.id];
    } else {
      progress.savedNotes[question.id] = {
        id: question.id,
        subject: question.subject,
        topic: question.topic,
        question: question.question,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        caseScenario: question.caseScenario || '',
        imageUrl: question.imageUrl || '',
        note: clean
      };
    }
    saveProgress(progress);
  }

  function getProgress() {
    return readStore(KEYS.progress, {
      studiedQuestions: 0,
      studySessions: 0,
      finalExamsCompleted: 0,
      correctSelections: 0,
      totalSelections: 0,
      subjects: {},
      topics: {},
      recent: [],
      strengths: {},
      weak: {},
      savedBank: {},
      savedNotes: {}
    });
  }

  function saveProgress(progress) { writeStore(KEYS.progress, progress); }

  function getTopicStatus(subjectId, topicId, questionCount = 0) {
    const progress = getProgress();
    const key = `${subjectId}:${topicId}`;
    const stats = progress.topics[key] || null;
    const answered = Math.min(stats?.total || 0, questionCount || stats?.total || 0);
    const accuracy = stats?.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    const completion = questionCount ? Math.min(100, Math.round((answered / questionCount) * 100)) : 0;

    if (!stats || !stats.total) return { label: 'Not Started', accuracy: 0, completion: 0, tone: 'tag' };
    if (questionCount && answered >= questionCount && accuracy >= 85) return { label: 'Mastered', accuracy, completion: 100, tone: 'badge' };
    if (questionCount && answered >= questionCount) return { label: 'Completed', accuracy, completion: 100, tone: 'badge' };
    return { label: 'In Progress', accuracy, completion: completion || 1, tone: 'tag' };
  }

  function getTopicStatusMarkup(subjectId, topicId, questionCount = 0) {
    const status = getTopicStatus(subjectId, topicId, questionCount);
    return `
      <span class="${status.tone}">${status.label}</span>
      ${status.accuracy ? `<span class="tag">${status.accuracy}% Accuracy</span>` : ''}
      ${status.completion ? `<span class="tag">${status.completion}% Complete</span>` : ''}
    `;
  }

  function getContinueState() {
    const progress = getProgress();
    return progress.continueStudy || null;
  }

  function setContinueState(payload) {
    const progress = getProgress();
    progress.continueStudy = {
      subjectId: payload.subjectId,
      subjectName: payload.subjectName,
      topicId: payload.topicId,
      topicName: payload.topicName,
      setNumber: payload.setNumber,
      questionIndex: payload.questionIndex || 0,
      totalQuestions: payload.totalQuestions || 0,
      updatedAt: Date.now()
    };
    saveProgress(progress);
  }

  function clearContinueState() {
    const progress = getProgress();
    delete progress.continueStudy;
    saveProgress(progress);
  }

  function continueLink() {
    const state = getContinueState();
    if (!state) return '';
    return pageLink('./study.html', { subject: state.subjectId, topic: state.topicId, set: state.setNumber, resume: 1 });
  }

  function ensureShell() {
    const root = document.getElementById('site-shell');
    root.innerHTML = `
      <header class="site-header">
        <div class="container navbar">
          <a class="brand" href="./index.html">
            <span class="brand-mark">PN</span>
            <span>Pharmacy Nexus</span>
          </a>
          <button class="nav-toggle" id="navToggle" type="button" aria-label="Open navigation"><span></span></button>
          <nav class="nav-menu" id="navMenu">
            <a class="nav-link ${PAGE === 'home' ? 'is-active' : ''}" href="./index.html">Home</a>
            <a class="nav-link ${PAGE === 'final-exam' ? 'is-active' : ''}" href="./final-exam.html">Final Exam</a>
            <a class="nav-link ${PAGE === 'dashboard' ? 'is-active' : ''}" href="./dashboard.html">Dashboard</a>
            <a class="nav-link ${PAGE === 'saved' ? 'is-active' : ''}" href="./saved.html">Saved</a>
          </nav>
        </div>
      </header>
      <main class="main-section"><div class="container" id="pageRoot"></div></main>
      <footer class="footer">
        <div class="container footer-shell">
          <div>
            <strong>Contact: pharmacynexusofficial@gmail.com</strong>
            <div>For feedback, collaboration, or educational contributions, feel free to contact us.</div>
          </div>
      </footer>
      <div class="admin-backdrop" id="adminBackdrop"></div>
    `;

    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('is-open');
      menu.classList.toggle('is-open');
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      toggle.classList.remove('is-open');
      menu.classList.remove('is-open');
    }));
  }

  function renderHome(index) {
    const root = document.getElementById('pageRoot');
    const subjects = index.subjects;
    const topicsCount = subjects.reduce((acc, s) => acc + s.topics.length, 0);
    const progress = getProgress();
    const continueState = getContinueState();
    const recent = progress.recent.slice(0, 4);
    const savedCount = Object.keys(progress.savedBank || {}).length;
    const notesCount = Object.keys(progress.savedNotes || {}).length;
    const accuracy = progress.totalSelections ? Math.round((progress.correctSelections / progress.totalSelections) * 100) : 0;
    root.innerHTML = `
      <section class="hero">
        <div class="hero-grid">
          <div>
            <span class="eyebrow">Pharmacy Nexus • Structured Learning</span>
            <h1>Your Ultimate Pharmacy Learning Platform <span>Built for Future Pharmacists</span></h1>
            <p>Move subject by subject, topic by topic, study in clear 30-question sets, review every attempt in detail, and finish with a polished final exam workflow.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="./subjects.html">Explore Subjects</a>
              <a class="btn btn-secondary" href="./final-exam.html">Go to Final Exam</a>
            </div>
          </div>
          <div class="hero-panel">
            <h3>Focused. Clean. Expandable.</h3>
            <p>Study sets, instant feedback, saved questions, final exam review, dashboard tracking, and hidden admin management inside one lightweight static build.</p>
            <div class="stats-grid">
              <div class="stat-box"><div class="label">Subjects</div><div class="value">${subjects.length}</div></div>
              <div class="stat-box"><div class="label">Topics</div><div class="value">${topicsCount}</div></div>
              <div class="stat-box"><div class="label">Saved Questions</div><div class="value">${savedCount}</div></div>
              <div class="stat-box"><div class="label">Accuracy</div><div class="value">${accuracy}%</div></div>
            </div>
          </div>
        </div>
      </section>
      ${continueState ? `
      <section style="margin-top:24px;">
        <div class="card">
          <div class="question-top">
            <div>
              <div class="meta-row"><span class="badge">Continue Studying</span><span class="tag">Set ${continueState.setNumber}</span></div>
              <h3 style="margin:10px 0 6px;">${continueState.topicName}</h3>
              <p class="muted">${continueState.subjectName} • Resume from question ${Math.min((continueState.questionIndex || 0) + 1, Math.max(continueState.totalQuestions || 1, 1))}</p>
            </div>
           
        </div>
      </section>` : ''}
      <section class="ticker-section" style="margin-top:26px;">
        <div class="ticker-shell">
          <div class="ticker-track">
            <span>• Study in focused 30-question sets</span>
            <span>• Get instant answer feedback and explanations</span>
            <span>• Save important questions and notes</span>
            <span>• Retry only the questions you missed</span>
            <span>• Practice with timed final exams</span>
            <span>• Study in focused 30-question sets</span>
            <span>• Get instant answer feedback and explanations</span>
            <span>• Save important questions and notes</span>
            <span>• Retry only the questions you missed</span>
            <span>• Practice with timed final exams</span>
          </div>
        </div>
      </section>
      <section style="margin-top:30px;">
        <div class="section-header">
          <div>
            <h2>How It Works</h2>
            <p>One simple study path, from first topic to final review.</p>
          </div>
        </div>
        <div class="card-grid home-flow-grid">
          <article class="card home-dark-card">
            <div class="home-step-number">01</div>
            <h3>Choose a Subject</h3>
            <p class="muted">Start from the subjects page, open any topic, and see its full question count and study sets.</p>
          </article>
          <article class="card home-dark-card">
            <div class="home-step-number">02</div>
            <h3>Study in Sets</h3>
            <p class="muted">Work through 30-question sets with instant answer feedback, explanations, saved questions, and notes.</p>
          </article>
          <article class="card home-dark-card">
            <div class="home-step-number">03</div>
            <h3>Review and Improve</h3>
            <p class="muted">Use review pages, retry wrong questions, dashboard progress, and final exam mode to reinforce weak areas.</p>
          </article>
        </div>
      </section>
      <section style="margin-top:30px;">
        <div class="section-header">
          <div>
            <h2>Progress Snapshot</h2>
            <p>Keep track of where you stopped and what deserves your attention next.</p>
          </div>
        </div>
        <div class="analysis-grid home-progress-grid">
          <div class="card home-dark-card">
            <h3 style="margin-top:0;">Latest Activity</h3>
            ${recent.length ? recent.map((item) => `<div class="list-item home-dark-item"><div><strong>${item.name}</strong><div class="muted">${item.subject}</div></div><div><strong>${item.score}</strong><div class="muted">${item.date}</div></div></div>`).join('') : '<div class="empty-state">No recent activity yet.</div>'}
          </div>
          <div class="card home-dark-card">
            <h3 style="margin-top:0;">Keep Going</h3>
            ${continueState ? `
            <div class="panel home-dark-panel">
      
              <div class="muted" style="margin-top:8px;">Continue Set ${continueState.setNumber} in ${continueState.subjectName} from question ${Math.min((continueState.questionIndex || 0) + 1, Math.max(continueState.totalQuestions || 1, 1))}.</div>
              <div style="margin-top:16px;"><a class="btn btn-primary" href="${continueLink()}">Continue Studying</a></div>
            </div>` : '<div class="panel home-dark-panel"><strong>Start Learning</strong><div class="muted" style="margin-top:8px;">Open the subjects page and begin your first study set to build progress, saved questions, and review history.</div><div style="margin-top:16px;"><a class="btn btn-primary" href="./subjects.html">Browse Subjects</a></div></div>'}
            <div class="metric-list" style="margin-top:18px;">
              <div class="metric-row"><span>Saved Questions</span><strong>${savedCount}</strong></div>
              <div class="metric-row"><span>Notes</span><strong>${notesCount}</strong></div>
              <div class="metric-row"><span>Final Exams</span><strong>${progress.finalExamsCompleted}</strong></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderSubjectCards(subjects, target, searchInput) {
    const draw = (term = '') => {
      const filtered = subjects.filter((subject) => subject.name.toLowerCase().includes(term.toLowerCase()));
      target.innerHTML = filtered.length ? '' : '<div class="empty-state">No subjects matched your search.</div>';
      filtered.forEach((subject) => {
        const card = el('article', 'card soft');
        card.innerHTML = `
          <div class="meta-row"><span class="badge">${subject.topics.length} Topics</span><span class="tag">${subject.id}</span></div>
          <h3>${subject.name}</h3>
          <p class="muted">Structured study content for ${subject.name} with topic-based JSON files.</p>
          <div class="meta-row">${subject.topics.slice(0, 2).map((t) => `<span class="tag">${t.name}</span>`).join('')}</div>
          <div style="margin-top:20px;"><a class="btn btn-dark" href="${pageLink('./topics.html', { subject: subject.id })}">Open Topics</a></div>
        `;
        target.appendChild(card);
      });
    };
    draw();
    searchInput?.addEventListener('input', (e) => draw(e.target.value));
  }

  function renderSubjectsPage(index) {
    const root = document.getElementById('pageRoot');
    root.innerHTML = `
      <div class="section-header"><div><h2>Subjects</h2><p>Choose a subject, then move into its topics and study sets.</p></div></div>
      <div class="panel" style="margin-bottom:18px;"><input class="input" id="subjectSearch" placeholder="Search subjects..." /></div>
      <div class="card-grid" id="subjectsGrid"></div>
    `;
    renderSubjectCards(index.subjects, document.getElementById('subjectsGrid'), document.getElementById('subjectSearch'));
  }

  function renderTopicsPage() {
    const subjectId = params().get('subject');
    const subject = state.subjectMap.get(subjectId);
    const root = document.getElementById('pageRoot');
    if (!subject) {
      root.innerHTML = '<div class="empty-state">Subject not found.</div>';
      return;
    }
    root.innerHTML = `
      <div class="section-header"><div><h2>${subject.name}</h2><p>Choose a topic, then enter a study set or prepare for the final exam.</p></div></div>
      <div class="panel" style="margin-bottom:18px;"><input class="input" id="topicSearch" placeholder="Search topics..." /></div>
      <div class="card-grid" id="topicsGrid"></div>
    `;
    const grid = document.getElementById('topicsGrid');
    const draw = (term = '') => {
      const filtered = subject.topics.filter((t) => t.name.toLowerCase().includes(term.toLowerCase()));
      grid.innerHTML = filtered.length ? '' : '<div class="empty-state">No topics matched your search.</div>';
      filtered.forEach((topic) => {
        const setCount = Math.ceil(topic.questionCount / SET_SIZE);
        const statusMarkup = getTopicStatusMarkup(subject.id, topic.id, topic.questionCount);
        const card = el('article', 'card');
        card.innerHTML = `
          <div class="meta-row"><span class="badge">${topic.questionCount} Questions</span><span class="tag">${setCount} Sets</span></div>
          <h3>${topic.name}</h3>
          <div class="meta-row" style="margin-bottom:10px;">${statusMarkup}</div>
          <p class="muted">Study in shuffled sets with instant feedback and end-of-set review.</p>
          <div class="action-row" style="margin-top:22px;justify-content:flex-start;">
            <a class="btn btn-dark" href="${pageLink('./topic.html', { subject: subject.id, topic: topic.id })}">Study</a>
          </div>
        `;
        grid.appendChild(card);
      });
    };
    draw();
    document.getElementById('topicSearch').addEventListener('input', (e) => draw(e.target.value));
  }

  async function renderTopicPage() {
    const subjectId = params().get('subject');
    const topicId = params().get('topic');
    const subject = state.subjectMap.get(subjectId);
    const topic = state.topicMap.get(`${subjectId}:${topicId}`);
    const root = document.getElementById('pageRoot');
    if (!subject || !topic) {
      root.innerHTML = '<div class="empty-state">Topic not found.</div>';
      return;
    }
    const data = await loadTopic(subjectId, topicId);
    const questions = data.questions || [];
    const diff = { easy: 0, medium: 0, hard: 0 };
    questions.forEach((q) => { diff[q.difficulty] = (diff[q.difficulty] || 0) + 1; });
    const setCount = Math.ceil(questions.length / SET_SIZE);
    const topicStatus = getTopicStatus(subjectId, topicId, questions.length);
    root.innerHTML = `
      <div class="section-header"><div><h2>${topic.name}</h2><p>${subject.name} • ${questions.length} questions • choose a study set below.</p><div class="meta-row" style="margin-top:10px;">${getTopicStatusMarkup(subjectId, topicId, questions.length)}</div></div></div>
      <div class="summary-grid four input-row four">
        <div class="card summary-card"><div class="muted">Easy</div><div class="big">${diff.easy || 0}</div></div>
        <div class="card summary-card"><div class="muted">Medium</div><div class="big">${diff.medium || 0}</div></div>
        <div class="card summary-card"><div class="muted">Hard</div><div class="big">${diff.hard || 0}</div></div>
        <div class="card summary-card"><div class="muted">Status</div><div class="big" style="font-size:1.1rem;">${topicStatus.label}</div></div>
      </div>
      ${(() => { const c = getContinueState(); return c && c.subjectId === subjectId && c.topicId === topicId ? `
      <section style="margin-top:26px;">
        <div class="card">
          <div class="question-top">
            <div>
              <div class="meta-row"><span class="badge">Continue This Topic</span><span class="tag">Set ${c.setNumber}</span></div>
              <h3 style="margin:10px 0 6px;">Resume ${topic.name}</h3>
              <p class="muted">You last stopped at question ${Math.min((c.questionIndex || 0) + 1, Math.max(c.totalQuestions || 1, 1))} in this topic.</p>
            </div>
            <a class="btn btn-dark" href="${continueLink()}">Resume</a>
          </div>
        </div>
      </section>` : ''; })()}
      <section style="margin-top:26px;">
        <div class="card">
          <h3 style="margin-top:0;">Study Sets</h3>
          <p class="muted">Questions are automatically split into sets of 30. Inside each set, both question order and answer order are shuffled every time.</p>
          <div class="topic-sets" id="setGrid"></div>
        </div>
      </section>
    `;
    const setGrid = document.getElementById('setGrid');
    for (let i = 0; i < setCount; i += 1) {
      const start = i * SET_SIZE + 1;
      const end = Math.min((i + 1) * SET_SIZE, questions.length);
      const item = el('div', 'set-card');
      item.innerHTML = `
        <div class="tag">Set ${i + 1}</div>
        <h4 style="margin:12px 0 8px;">Questions ${start} - ${end}</h4>
        <p class="muted">${end - start + 1} questions in this set.</p>
        <a class="btn btn-dark" href="${pageLink('./study.html', { subject: subjectId, topic: topicId, set: i + 1 })}">Start Set</a>
      `;
      setGrid.appendChild(item);
    }
  }

  function prepareStudySet(questions, setNumber) {
    const start = (setNumber - 1) * SET_SIZE;
    const chunk = questions.slice(start, start + SET_SIZE);
    return shuffle(chunk).map((q) => ({
      ...q,
      options: shuffle([...(q.options || [])])
    }));
  }

  function questionKey(q) { return `${q.subject}:${q.topic}:${q.id}`; }

  function updateStudyProgress(payload) {
    const progress = getProgress();
    progress.studiedQuestions += payload.questionsSeen;
    progress.studySessions += 1;
    progress.correctSelections += payload.correct;
    progress.totalSelections += payload.total;
    progress.subjects[payload.subjectId] = progress.subjects[payload.subjectId] || { attempts: 0, correct: 0, total: 0 };
    progress.subjects[payload.subjectId].attempts += 1;
    progress.subjects[payload.subjectId].correct += payload.correct;
    progress.subjects[payload.subjectId].total += payload.total;
    progress.topics[payload.topicId] = progress.topics[payload.topicId] || { attempts: 0, correct: 0, total: 0, topicName: payload.topicName, subjectName: payload.subjectName };
    progress.topics[payload.topicId].attempts += 1;
    progress.topics[payload.topicId].correct += payload.correct;
    progress.topics[payload.topicId].total += payload.total;
    progress.recent.unshift({
      type: 'study', name: payload.topicName, subject: payload.subjectName, score: `${payload.correct}/${payload.total}`, date: formatDate(new Date())
    });
    progress.recent = progress.recent.slice(0, 12);
    saveProgress(progress);
  }


  function updateRetryProgress(payload) {
    const progress = getProgress();
    progress.studiedQuestions += payload.questionsSeen;
    progress.studySessions += 1;
    progress.correctSelections += payload.correct;
    progress.totalSelections += payload.total;
    payload.rows.forEach((row) => {
      const subjectId = row.question.subject;
      const topicKey = `${row.question.subject}:${row.question.topic}`;
      progress.subjects[subjectId] = progress.subjects[subjectId] || { attempts: 0, correct: 0, total: 0 };
      progress.subjects[subjectId].correct += row.isCorrect ? 1 : 0;
      progress.subjects[subjectId].total += 1;
      progress.subjects[subjectId].attempts += 1;
      progress.topics[topicKey] = progress.topics[topicKey] || { attempts: 0, correct: 0, total: 0, topicName: row.question.topic, subjectName: row.question.subject };
      progress.topics[topicKey].correct += row.isCorrect ? 1 : 0;
      progress.topics[topicKey].total += 1;
      progress.topics[topicKey].attempts += 1;
    });
    progress.recent.unshift({
      type: 'study',
      name: payload.name || 'Retry Wrong Questions',
      subject: payload.subject || 'Mixed',
      score: `${payload.correct}/${payload.total}`,
      date: formatDate(new Date())
    });
    progress.recent = progress.recent.slice(0, 12);
    saveProgress(progress);
  }

  async function renderStudyPage() {
    const p = params();
    const retryMode = p.get('retry') === '1';
    const subjectId = p.get('subject');
    const topicId = p.get('topic');
    const setNumber = Number(p.get('set') || '1');
    const root = document.getElementById('pageRoot');

    let prepared = [];
    let subject = null;
    let topic = null;
    let panelTag = '';
    let panelTitle = '';
    let panelMuted = '';
    let backHref = './dashboard.html';
    let backLabel = 'Back';

    if (retryMode) {
      const retryData = readStore(KEYS.retry, null);
      const retryQuestions = retryData?.questions || [];
      if (!retryQuestions.length) {
        root.innerHTML = '<div class="empty-state">No wrong-question retry session found yet.</div>';
        return;
      }
      prepared = shuffle(retryQuestions).map((q) => ({ ...q, options: shuffle([...(q.options || [])]) }));
      panelTag = 'Retry Session';
      panelTitle = retryData.title || 'Retry Wrong Questions';
      panelMuted = `${prepared.length} incorrect questions selected from your last review`;
      backHref = './review.html';
      backLabel = 'Back to Review';
    } else {
      subject = state.subjectMap.get(subjectId);
      topic = state.topicMap.get(`${subjectId}:${topicId}`);
      if (!subject || !topic) {
        root.innerHTML = '<div class="empty-state">Topic not found.</div>';
        return;
      }
      const data = await loadTopic(subjectId, topicId);
      prepared = prepareStudySet(data.questions || [], setNumber);
      if (!prepared.length) {
        root.innerHTML = '<div class="empty-state">This set does not contain questions.</div>';
        return;
      }
      panelTag = `Study Set ${setNumber}`;
      panelTitle = topic.name;
      panelMuted = subject.name;
      backHref = pageLink('./topic.html', { subject: subjectId, topic: topicId });
      backLabel = 'Back to Topic';
    }

    let index = 0;
    if (!retryMode) {
      const continueState = getContinueState();
      if (p.get('resume') === '1' && continueState && continueState.subjectId === subjectId && continueState.topicId === topicId && Number(continueState.setNumber) === setNumber) {
        index = Math.min(Number(continueState.questionIndex) || 0, Math.max(prepared.length - 1, 0));
      }
    }
    const answers = {};

    root.innerHTML = `
      <div class="study-shell">
        <aside class="side-panel">
          <div class="sidebar-card">
            <div class="tag">${panelTag}</div>
            <h3>${panelTitle}</h3>
            <p class="muted">${panelMuted}</p>
            <div style="margin:14px 0 10px;" class="progress-bar"><div class="progress-fill" id="setProgressFill"></div></div>
            <div class="muted" id="setProgressText"></div>
          </div>
          <div class="sidebar-card">
            <h4>Rules</h4>
            <p class="muted">First choice locks immediately. Correct answer turns green, wrong choice turns red, and explanation appears right away.</p>
            <a class="btn btn-light" href="${backHref}">${backLabel}</a>
          </div>
        </aside>
        <section class="question-card" id="studyCard"></section>
      </div>
    `;

    const card = document.getElementById('studyCard');
    const progressFill = document.getElementById('setProgressFill');
    const progressText = document.getElementById('setProgressText');

    function drawQuestion() {
      const q = prepared[index];
      if (!retryMode) {
        setContinueState({
          subjectId,
          subjectName: subject.name,
          topicId,
          topicName: topic.name,
          setNumber,
          questionIndex: index,
          totalQuestions: prepared.length
        });
      }
      const answered = answers[q.id];
      const saved = isSaved(q.id);
      const note = getNote(q.id);
      progressFill.style.width = `${((index + 1) / prepared.length) * 100}%`;
      progressText.textContent = `Question ${index + 1} of ${prepared.length}`;
      card.innerHTML = `
        <div class="question-top">
          <div>
            <div class="meta-row"><span class="badge">${q.difficulty.toUpperCase()}</span><span class="tag">${q.type}</span>${hasNote(q.id) ? '<span class="tag">Noted</span>' : ''}</div>
            <h2 class="question-title">${q.question}</h2>
          </div>
          <div class="question-tools">
            <button class="btn btn-light btn-note" id="toggleNoteBtn" type="button">${note ? 'Edit Note' : 'Add Note'}</button>
            <button class="star-btn ${saved ? 'is-saved' : ''}" id="saveBtn" title="Save question">★</button>
          </div>
        </div>
        ${q.caseScenario ? `<div class="case-box"><strong>Case</strong><div class="muted" style="margin-top:8px;">${q.caseScenario}</div></div>` : ''}
        ${q.imageUrl ? `<div style="margin-top:18px;"><img src="${q.imageUrl}" alt="Question visual" style="border-radius:22px; border:1px solid var(--border);"></div>` : ''}
        <div class="option-list" id="optionList"></div>
        <div class="explanation-box ${answered ? 'is-visible' : ''}" id="explanationBox">
          <strong>Explanation</strong>
          <div class="muted" style="margin-top:8px;">${answered ? q.explanation : ''}</div>
        </div>
        <div class="note-panel" id="noteBox" style="display:none;">
          <strong>Question Note</strong>
          <textarea class="textarea" id="noteInput" placeholder="Write your note here..." style="margin-top:10px;">${note}</textarea>
          <div class="action-row" style="justify-content:flex-start; margin-top:12px;">
            <button class="btn btn-dark" id="saveNoteBtn" type="button">Save Note</button>
            <button class="btn btn-light" id="cancelNoteBtn" type="button">Cancel</button>
          </div>
        </div>
        <div class="action-row">
          <button class="btn btn-light" id="prevBtn" ${index === 0 ? 'disabled' : ''}>Previous</button>
          <button class="btn btn-dark" id="nextBtn">${index === prepared.length - 1 ? 'Finish Set' : 'Next'}</button>
        </div>
      `;
      const optionList = document.getElementById('optionList');
      q.options.forEach((option) => {
        const btn = el('button', 'option-btn');
        btn.type = 'button';
        btn.textContent = option;
        if (answered) {
          btn.classList.add('locked');
          if (option === q.correctAnswer) btn.classList.add('correct');
          if (option === answered.selected && option !== q.correctAnswer) btn.classList.add('wrong');
        }
        btn.addEventListener('click', () => {
          if (answers[q.id]) return;
          const correct = option === q.correctAnswer;
          answers[q.id] = { selected: option, correct };
          drawQuestion();
        });
        optionList.appendChild(btn);
      });

      document.getElementById('saveBtn').addEventListener('click', () => {
        const on = toggleSaved(q);
        document.getElementById('saveBtn').classList.toggle('is-saved', on);
      });
      const noteBox = document.getElementById('noteBox');
      document.getElementById('toggleNoteBtn').addEventListener('click', () => {
        noteBox.style.display = noteBox.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('saveNoteBtn').addEventListener('click', () => {
        setNote(q, document.getElementById('noteInput').value);
        drawQuestion();
      });
      document.getElementById('cancelNoteBtn').addEventListener('click', () => {
        noteBox.style.display = 'none';
      });
      document.getElementById('prevBtn').addEventListener('click', () => { if (index > 0) { index -= 1; drawQuestion(); } });
      document.getElementById('nextBtn').addEventListener('click', () => {
        if (index === prepared.length - 1) {
          finishSet();
        } else {
          index += 1;
          drawQuestion();
        }
      });
    }

    function finishSet() {
      const rows = prepared.map((q) => ({
        question: q,
        selected: answers[q.id]?.selected || 'No answer selected',
        correct: q.correctAnswer,
        isCorrect: !!answers[q.id]?.correct
      }));
      const correct = rows.filter((row) => row.isCorrect).length;
      if (retryMode) {
        updateRetryProgress({
          rows,
          correct,
          total: rows.length,
          questionsSeen: rows.length,
          name: 'Retry Wrong Questions',
          subject: 'Mixed'
        });
        writeStore(KEYS.review, {
          type: 'study',
          title: 'Retry Wrong Questions Review',
          summary: { score: correct, total: rows.length, subject: 'Mixed', topic: 'Wrong Questions' },
          rows,
          actions: { back: './dashboard.html', backLabel: 'Back to Dashboard' }
        });
      } else {
        updateStudyProgress({
          subjectId, topicId: `${subjectId}:${topicId}`, topicName: topic.name, subjectName: subject.name,
          correct, total: rows.length, questionsSeen: rows.length
        });
        clearContinueState();
        writeStore(KEYS.review, {
          type: 'study',
          title: `${topic.name} • Set ${setNumber}`,
          summary: { score: correct, total: rows.length, subject: subject.name, topic: topic.name },
          rows,
          actions: { back: pageLink('./topic.html', { subject: subjectId, topic: topicId }), backLabel: 'Back to Topic' }
        });
      }
      window.location.href = './review.html';
    }

    drawQuestion();
  }

  async function renderFinalExamPage() {
    const root = document.getElementById('pageRoot');
    await loadIndex();
    const subjects = state.index.subjects;
    root.innerHTML = `
      <div class="section-header"><div><h2>Final Exam</h2><p>Choose multiple subjects or a single subject with selected topics. Answers stay hidden until the exam ends.</p></div></div>
      <div id="examSetup"></div>
      <div id="examEngine"></div>
    `;
    const setup = document.getElementById('examSetup');
    const engine = document.getElementById('examEngine');

    setup.innerHTML = `
      <div class="card">
        <div class="input-row two">
          <div>
            <label class="muted">Exam mode</label>
            <select class="select" id="examMode">
              <option value="multi">Mode 1 • Multiple Subjects</option>
              <option value="single">Mode 2 • Single Subject + Topics</option>
            </select>
          </div>
          <div>
            <label class="muted">Difficulty</label>
            <select class="select" id="examDifficulty">
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        <div class="input-row two" style="margin-top:16px;">
          <div>
            <label class="muted">Number of questions</label>
            <input class="input" id="examCount" type="number" min="5" value="20" />
          </div>
          <div>
            <label class="muted">Time limit (minutes)</label>
            <input class="input" id="examMinutes" type="number" min="5" value="30" />
          </div>
        </div>
        <div id="modeArea" style="margin-top:16px;"></div>
        <div style="margin-top:20px;"><button class="btn btn-dark" id="startExamBtn">Start Final Exam</button></div>
        <div id="examMessage"></div>
      </div>
    `;

    const modeSelect = document.getElementById('examMode');
    const modeArea = document.getElementById('modeArea');
    const drawMode = () => {
      if (modeSelect.value === 'multi') {
        modeArea.innerHTML = `
          <label class="muted">Subjects</label>
          <div class="input-row two">
            <label class="panel"><input type="radio" name="multiScope" value="all" checked /> All subjects</label>
            <label class="panel"><input type="radio" name="multiScope" value="single" /> One subject only</label>
          </div>
          <div style="margin-top:14px;"><select class="select" id="multiSubjectSelect">${subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        `;
      } else {
        modeArea.innerHTML = `
          <div>
            <label class="muted">Subject</label>
            <select class="select" id="singleSubjectSelect">${subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
          </div>
          <div style="margin-top:14px;" id="topicCheckboxes"></div>
        `;
        const select = document.getElementById('singleSubjectSelect');
        const drawTopics = () => {
          const subject = state.subjectMap.get(select.value);
          document.getElementById('topicCheckboxes').innerHTML = `<label class="muted">Topics</label><div class="analysis-grid" style="margin-top:10px;">${subject.topics.map((topic) => `<label class="panel"><input type="checkbox" value="${topic.id}" checked /> ${topic.name}</label>`).join('')}</div>`;
        };
        select.addEventListener('change', drawTopics);
        drawTopics();
      }
    };
    modeSelect.addEventListener('change', drawMode);
    drawMode();

    document.getElementById('startExamBtn').addEventListener('click', async () => {
      const difficulty = document.getElementById('examDifficulty').value;
      const count = Number(document.getElementById('examCount').value || '20');
      const minutes = Number(document.getElementById('examMinutes').value || '30');
      const msg = document.getElementById('examMessage');
      try {
        let pool = [];
        if (modeSelect.value === 'multi') {
          const scope = document.querySelector('input[name="multiScope"]:checked')?.value || 'all';
          const subjectIds = scope === 'all' ? subjects.map((s) => s.id) : [document.getElementById('multiSubjectSelect').value];
          for (const subjectId of subjectIds) {
            const subject = state.subjectMap.get(subjectId);
            for (const topic of subject.topics) {
              const data = await loadTopic(subjectId, topic.id);
              pool.push(...data.questions);
            }
          }
        } else {
          const subjectId = document.getElementById('singleSubjectSelect').value;
          const checked = [...document.querySelectorAll('#topicCheckboxes input:checked')].map((input) => input.value);
          if (!checked.length) throw new Error('Select at least one topic.');
          for (const topicId of checked) {
            const data = await loadTopic(subjectId, topicId);
            pool.push(...data.questions);
          }
        }
        if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty);
        if (!pool.length) throw new Error('No questions matched your exam filters.');
        const examQuestions = shuffle(pool).slice(0, Math.min(count, pool.length)).map((q) => ({ ...q, options: [...q.options] }));
        setup.classList.add('hidden');
        startExamEngine(engine, examQuestions, minutes);
      } catch (error) {
        msg.innerHTML = `<div class="message error">${error.message}</div>`;
      }
    });
  }

  function startExamEngine(container, questions, minutes) {
    let current = 0;
    const answers = {};
    let remaining = minutes * 60;
    let timerId = null;

    container.innerHTML = `
      <div class="study-shell">
        <aside class="side-panel">
          <div class="sidebar-card"><div class="tag">Final Exam</div><div class="timer" id="examTimer"></div><div class="muted">Time remaining</div></div>
          <div class="sidebar-card"><div class="progress-bar"><div class="progress-fill" id="examProgressFill"></div></div><div class="muted" id="examProgressText" style="margin-top:10px;"></div></div>
        </aside>
        <section class="question-card" id="examCard"></section>
      </div>
    `;

    const timerEl = document.getElementById('examTimer');
    const progressFill = document.getElementById('examProgressFill');
    const progressText = document.getElementById('examProgressText');
    const card = document.getElementById('examCard');

    const drawTimer = () => {
      const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
      const secs = (remaining % 60).toString().padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    };
    drawTimer();
    timerId = setInterval(() => {
      remaining -= 1;
      drawTimer();
      if (remaining <= 0) {
        clearInterval(timerId);
        finishExam();
      }
    }, 1000);

    function drawQuestion() {
      const q = questions[current];
      progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
      progressText.textContent = `Question ${current + 1} of ${questions.length}`;
      card.innerHTML = `
        <div class="question-top">
          <div>
            <div class="meta-row"><span class="badge">${q.difficulty.toUpperCase()}</span><span class="tag">${q.subject}</span><span class="tag">${q.topic}</span></div>
            <h2 class="question-title">${q.question}</h2>
          </div>
        </div>
        ${q.caseScenario ? `<div class="case-box"><strong>Case</strong><div class="muted" style="margin-top:8px;">${q.caseScenario}</div></div>` : ''}
        <div class="option-list" id="examOptionList"></div>
        <div class="action-row">
          <button class="btn btn-light" id="examPrev" ${current === 0 ? 'disabled' : ''}>Previous</button>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-danger" id="submitExam">Submit Exam</button>
            <button class="btn btn-dark" id="examNext">${current === questions.length - 1 ? 'Last Question' : 'Next'}</button>
          </div>
        </div>
      `;
      const list = document.getElementById('examOptionList');
      q.options.forEach((option) => {
        const button = el('button', 'option-btn');
        button.type = 'button';
        button.textContent = option;
        if (answers[q.id] === option) button.classList.add('ghost-correct');
        button.addEventListener('click', () => {
          answers[q.id] = option;
          drawQuestion();
        });
        list.appendChild(button);
      });
      document.getElementById('examPrev').addEventListener('click', () => { if (current > 0) { current -= 1; drawQuestion(); } });
      document.getElementById('examNext').addEventListener('click', () => { if (current < questions.length - 1) { current += 1; drawQuestion(); } });
      document.getElementById('submitExam').addEventListener('click', () => {
        if (confirm('Submit final exam now?')) finishExam();
      });
    }

    function finishExam() {
      clearInterval(timerId);
      const rows = questions.map((q) => ({
        question: q,
        selected: answers[q.id] || 'No answer selected',
        correct: q.correctAnswer,
        isCorrect: answers[q.id] === q.correctAnswer
      }));
      const correct = rows.filter((row) => row.isCorrect).length;
      const progress = getProgress();
      progress.finalExamsCompleted += 1;
      progress.correctSelections += correct;
      progress.totalSelections += rows.length;
      progress.recent.unshift({ type: 'exam', name: 'Final Exam', subject: 'Mixed', score: `${correct}/${rows.length}`, date: formatDate(new Date()) });
      progress.recent = progress.recent.slice(0, 12);
      rows.forEach((row) => {
        progress.subjects[row.question.subject] = progress.subjects[row.question.subject] || { attempts: 0, correct: 0, total: 0 };
        progress.subjects[row.question.subject].correct += row.isCorrect ? 1 : 0;
        progress.subjects[row.question.subject].total += 1;
        progress.subjects[row.question.subject].attempts += 1;
        const topicKey = `${row.question.subject}:${row.question.topic}`;
        progress.topics[topicKey] = progress.topics[topicKey] || { attempts: 0, correct: 0, total: 0, topicName: row.question.topic, subjectName: row.question.subject };
        progress.topics[topicKey].correct += row.isCorrect ? 1 : 0;
        progress.topics[topicKey].total += 1;
        progress.topics[topicKey].attempts += 1;
      });
      saveProgress(progress);
      const bySubject = {};
      const byTopic = {};
      rows.forEach((row) => {
        bySubject[row.question.subject] = bySubject[row.question.subject] || { correct: 0, total: 0 };
        bySubject[row.question.subject].total += 1;
        if (row.isCorrect) bySubject[row.question.subject].correct += 1;
        const topicKey = `${row.question.subject} • ${row.question.topic}`;
        byTopic[topicKey] = byTopic[topicKey] || { correct: 0, total: 0 };
        byTopic[topicKey].total += 1;
        if (row.isCorrect) byTopic[topicKey].correct += 1;
      });
      writeStore(KEYS.review, {
        type: 'exam',
        title: 'Final Exam Review',
        summary: { score: correct, total: rows.length, subjects: bySubject, topics: byTopic },
        rows,
        actions: { back: './final-exam.html', backLabel: 'Back to Final Exam' }
      });
      window.location.href = './review.html';
    }

    drawQuestion();
  }

  function renderReviewPage() {
    const data = readStore(KEYS.review, null);
    const root = document.getElementById('pageRoot');
    if (!data) {
      root.innerHTML = '<div class="empty-state">No review data found yet.</div>';
      return;
    }
    const rows = data.rows || [];
    const correct = data.summary.score;
    const total = data.summary.total;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    let analysis = '';
    if (data.type === 'exam') {
      const subjectRows = Object.entries(data.summary.subjects || {})
        .map(([name, stats]) => ({ name, pct: Math.round((stats.correct / stats.total) * 100), ...stats }))
        .sort((a, b) => b.pct - a.pct);
      const topicRows = Object.entries(data.summary.topics || {})
        .map(([name, stats]) => ({ name, pct: Math.round((stats.correct / stats.total) * 100), ...stats }))
        .sort((a, b) => a.pct - b.pct);
      analysis = `
        <div class="analysis-grid" style="margin-bottom:24px;">
          <div class="card"><h3 style="margin-top:0;">Strongest Areas</h3>${subjectRows.slice(0, 3).map((row) => `<div class="metric-row"><span>${row.name}</span><strong>${row.pct}%</strong></div>`).join('') || '<div class="muted">No data</div>'}</div>
          <div class="card"><h3 style="margin-top:0;">Needs Review</h3>${topicRows.slice(0, 4).map((row) => `<div class="metric-row"><span>${row.name}</span><strong>${row.pct}%</strong></div>`).join('') || '<div class="muted">No data</div>'}</div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="section-header"><div><h2>${data.title}</h2><p>Detailed performance review with your answers, the correct answers, and explanations.</p></div></div>
      <div class="summary-grid four" style="margin-bottom:24px;">
        <div class="card summary-card"><div class="muted">Score</div><div class="big">${correct}/${total}</div></div>
        <div class="card summary-card"><div class="muted">Percent</div><div class="big">${percent}%</div></div>
        <div class="card summary-card"><div class="muted">Correct</div><div class="big">${correct}</div></div>
        <div class="card summary-card"><div class="muted">Incorrect</div><div class="big">${total - correct}</div></div>
      </div>
      ${analysis}
      <div class="review-list" id="reviewList"></div>
      <div class="action-row" style="margin-top:22px; justify-content:flex-start;">
        ${rows.some((row) => !row.isCorrect) ? '<button class="btn btn-primary" id="retryWrongBtn" type="button">Retry Wrong Questions</button>' : ''}
        <a class="btn btn-light" href="${data.actions.back}">${data.actions.backLabel}</a>
        <a class="btn btn-dark" href="./dashboard.html">Go to Dashboard</a>
      </div>
    `;
    const list = document.getElementById('reviewList');
    const retryWrongBtn = document.getElementById('retryWrongBtn');
    if (retryWrongBtn) {
      retryWrongBtn.addEventListener('click', () => {
        const wrongQuestions = rows.filter((row) => !row.isCorrect).map((row) => row.question);
        writeStore(KEYS.retry, {
          title: data.title,
          type: data.type,
          questions: wrongQuestions,
          sourceBack: data.actions.back,
          sourceBackLabel: data.actions.backLabel
        });
        window.location.href = './study.html?retry=1';
      });
    }
    rows.forEach((row, idx) => {
      const saved = isSaved(row.question.id);
      const note = getNote(row.question.id);
      const card = el('article', 'review-card');
      card.innerHTML = `
        <div class="question-top">
          <div>
            <div class="meta-row"><div class="review-status ${row.isCorrect ? 'correct' : 'wrong'}">${row.isCorrect ? 'Correct' : 'Incorrect'}</div>${note ? '<span class="tag">Noted</span>' : ''}</div>
            <h3 style="margin:10px 0 8px;">${idx + 1}. ${row.question.question}</h3>
          </div>
          <div class="question-tools">
            <button class="btn btn-light btn-note note-toggle-btn" type="button">${note ? 'Edit Note' : 'Add Note'}</button>
            <button class="star-btn ${saved ? 'is-saved' : ''}">★</button>
          </div>
        </div>
        ${row.question.caseScenario ? `<div class="case-box"><strong>Case</strong><div class="muted" style="margin-top:8px;">${row.question.caseScenario}</div></div>` : ''}
        <div class="review-answer"><strong>Your answer:</strong> ${row.selected}</div>
        <div class="review-answer"><strong>Correct answer:</strong> ${row.correct}</div>
        <div class="review-answer"><strong>Explanation:</strong> ${row.question.explanation}</div>
        <div class="note-panel review-note-box" style="display:none; margin-top:14px;">
          <strong>Question Note</strong>
          <textarea class="textarea review-note-input" style="margin-top:10px;" placeholder="Write your note here...">${note}</textarea>
          <div class="action-row" style="justify-content:flex-start; margin-top:12px;">
            <button class="btn btn-dark save-review-note" type="button">Save Note</button>
            <button class="btn btn-light cancel-review-note" type="button">Cancel</button>
          </div>
        </div>
      `;
      card.querySelector('.star-btn').addEventListener('click', (e) => {
        const on = toggleSaved(row.question);
        e.currentTarget.classList.toggle('is-saved', on);
      });
      const reviewNoteBox = card.querySelector('.review-note-box');
      card.querySelector('.note-toggle-btn').addEventListener('click', () => {
        reviewNoteBox.style.display = reviewNoteBox.style.display === 'none' ? 'block' : 'none';
      });
      card.querySelector('.save-review-note').addEventListener('click', () => {
        setNote(row.question, card.querySelector('.review-note-input').value);
        renderReviewPage();
      });
      card.querySelector('.cancel-review-note').addEventListener('click', () => {
        reviewNoteBox.style.display = 'none';
      });
      list.appendChild(card);
    });
  }

  function renderDashboardPage() {
    const progress = getProgress();
    const root = document.getElementById('pageRoot');
    const success = progress.totalSelections ? Math.round((progress.correctSelections / progress.totalSelections) * 100) : 0;
    const topicRows = Object.values(progress.topics).map((topic) => ({
      ...topic,
      pct: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0
    }));
    const strengths = [...topicRows].sort((a, b) => b.pct - a.pct).slice(0, 4);
    const weak = [...topicRows].sort((a, b) => a.pct - b.pct).slice(0, 4);
    const recommendation = weak[0];
    const achievementItems = [
      { label: 'Studied 100 Questions', on: progress.studiedQuestions >= 100 },
      { label: 'Completed 5 Study Sessions', on: progress.studySessions >= 5 },
      { label: 'Completed 3 Final Exams', on: progress.finalExamsCompleted >= 3 },
      { label: 'Reached 80%+ Overall', on: success >= 80 }
    ];

    root.innerHTML = `
      <div class="section-header"><div><h2>Student Dashboard</h2><p>Track progress, review weak areas, and monitor recent study and final exam activity.</p></div></div>
      <div class="summary-grid four">
        <div class="card summary-card"><div class="muted">Overall Success Rate</div><div class="big">${success}%</div></div>
        <div class="card summary-card"><div class="muted">Total Solved Questions</div><div class="big">${progress.studiedQuestions}</div></div>
        <div class="card summary-card"><div class="muted">Study Sessions</div><div class="big">${progress.studySessions}</div></div>
        <div class="card summary-card"><div class="muted">Final Exams Completed</div><div class="big">${progress.finalExamsCompleted}</div></div>
      </div>
      ${(() => { const c = getContinueState(); return c ? `
      <div class="card" style="margin-top:24px;">
        <div class="question-top">
          <div>
            <div class="meta-row"><span class="badge">Continue Studying</span><span class="tag">Set ${c.setNumber}</span></div>
            <h3 style="margin:10px 0 6px;">${c.topicName}</h3>
            <p class="muted">${c.subjectName} • Resume from question ${Math.min((c.questionIndex || 0) + 1, Math.max(c.totalQuestions || 1, 1))}</p>
          </div>
          <a class="btn btn-dark" href="${continueLink()}">Resume</a>
        </div>
      </div>` : ''; })()}
      <div class="dashboard-grid" style="margin-top:24px;">
        <div class="analysis-grid">
          <div class="card"><h3 style="margin-top:0;">Strength Areas</h3>${strengths.length ? strengths.map((row) => `<div class="metric-row"><span>${row.topicName}</span><strong>${row.pct}%</strong></div>`).join('') : '<div class="muted">No data yet.</div>'}</div>
          <div class="card"><h3 style="margin-top:0;">Weak Areas</h3>${weak.length ? weak.map((row) => `<div class="metric-row"><span>${row.topicName}</span><strong>${row.pct}%</strong></div>`).join('') : '<div class="muted">No data yet.</div>'}</div>
        </div>
        <div class="analysis-grid">
          <div class="card"><h3 style="margin-top:0;">Recent Activity</h3>${progress.recent.length ? progress.recent.slice(0, 5).map((item) => `<div class="list-item"><div><strong>${item.name}</strong><div class="muted">${item.subject}</div></div><div><strong>${item.score}</strong><div class="muted">${item.date}</div></div></div>`).join('') : '<div class="muted">No recent activity.</div>'}</div>
          <div class="card"><h3 style="margin-top:0;">Recommendation</h3>${recommendation ? `<div class="panel"><strong>Review ${recommendation.topicName}</strong><div class="muted" style="margin-top:8px;">This topic currently has your lowest tracked percentage.</div></div>` : '<div class="muted">Start studying to unlock recommendations.</div>'}</div>
        </div>
        <div class="card"><h3 style="margin-top:0;">Achievements</h3><div class="metric-list">${achievementItems.map((item) => `<div class="achievement">${item.on ? '🏅' : '⭕'} ${item.label}</div>`).join('')}</div></div>
      </div>
    `;
  }

  function renderSavedPage() {
    const progress = getProgress();
    const savedMap = progress.savedBank || {};
    const notesMap = progress.savedNotes || {};
    const mergedMap = {};

    Object.values(savedMap).forEach((q) => {
      mergedMap[q.id] = { ...q, isSaved: true, note: notesMap[q.id]?.note || '' };
    });
    Object.values(notesMap).forEach((q) => {
      mergedMap[q.id] = {
        ...(mergedMap[q.id] || q),
        ...q,
        isSaved: !!savedMap[q.id],
        note: q.note || ''
      };
    });

    const allItems = Object.values(mergedMap);
    const root = document.getElementById('pageRoot');
    const subjects = [...new Set(allItems.map((q) => q.subject).filter(Boolean))];
    const topics = [...new Set(allItems.map((q) => q.topic).filter(Boolean))];

    root.innerHTML = `
      <div class="section-header"><div><h2>Saved Questions</h2><p>Your starred questions and notes are stored locally in this browser for quick review later.</p></div></div>
      <div class="card" style="margin-bottom:20px;">
        <div class="action-row saved-filter-row" style="justify-content:flex-start; gap:10px; margin-top:0; margin-bottom:16px; flex-wrap:wrap;">
          <button class="btn btn-dark saved-filter-btn is-active" data-filter="all" type="button">All</button>
          <button class="btn btn-light saved-filter-btn" data-filter="starred" type="button">Starred</button>
          <button class="btn btn-light saved-filter-btn" data-filter="notes" type="button">Notes</button>
          <button class="btn btn-light saved-filter-btn" data-filter="both" type="button">Starred + Notes</button>
        </div>
        <div class="input-row three">
          <select class="select" id="savedSubjectFilter">
            <option value="all">All Subjects</option>
            ${subjects.map((s) => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <select class="select" id="savedTopicFilter">
            <option value="all">All Topics</option>
            ${topics.map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <input class="input" id="savedSearch" placeholder="Search saved questions or notes..." />
        </div>
      </div>
      <div class="saved-grid" id="savedGrid"></div>
    `;

    const grid = document.getElementById('savedGrid');
    const filterButtons = [...document.querySelectorAll('.saved-filter-btn')];
    const subjectFilter = document.getElementById('savedSubjectFilter');
    const topicFilter = document.getElementById('savedTopicFilter');
    const searchInput = document.getElementById('savedSearch');
    let activeFilter = 'all';

    function draw() {
      const subjectValue = subjectFilter.value;
      const topicValue = topicFilter.value;
      const term = searchInput.value.trim().toLowerCase();
      let rows = [...allItems];

      if (activeFilter === 'starred') rows = rows.filter((q) => q.isSaved);
      if (activeFilter === 'notes') rows = rows.filter((q) => (q.note || '').trim());
      if (activeFilter === 'both') rows = rows.filter((q) => q.isSaved && (q.note || '').trim());
      if (subjectValue !== 'all') rows = rows.filter((q) => q.subject === subjectValue);
      if (topicValue !== 'all') rows = rows.filter((q) => q.topic === topicValue);
      if (term) {
        rows = rows.filter((q) =>
          q.question.toLowerCase().includes(term) ||
          (q.note || '').toLowerCase().includes(term) ||
          (q.explanation || '').toLowerCase().includes(term)
        );
      }

      grid.innerHTML = '';
      if (!rows.length) {
        grid.innerHTML = '<div class="empty-state">No matching saved questions or notes found.</div>';
        return;
      }

      rows.forEach((q) => {
        const card = el('article', 'card');
        card.innerHTML = `
          <div class="question-top">
            <div>
              <div class="meta-row"><span class="badge">${q.subject}</span><span class="tag">${q.topic}</span>${q.note ? '<span class="tag">Noted</span>' : ''}</div>
              <h3 style="margin:0;">${q.question}</h3>
            </div>
            <div class="question-tools">
              <button class="btn btn-light btn-note saved-note-toggle" type="button">${q.note ? 'Edit Note' : 'Add Note'}</button>
              <button class="star-btn ${q.isSaved ? 'is-saved' : ''}" type="button">★</button>
            </div>
          </div>
          <div class="review-answer"><strong>Correct answer:</strong> ${q.correctAnswer}</div>
          <div class="review-answer"><strong>Explanation:</strong> ${q.explanation}</div>
          ${q.note ? `<div class="case-box" style="margin-top:14px;"><strong>Your note</strong><div class="muted" style="margin-top:8px;">${q.note}</div></div>` : ''}
          <div class="note-panel saved-note-box" style="display:none; margin-top:14px;">
            <strong>Question Note</strong>
            <textarea class="textarea saved-note-input" style="margin-top:10px;" placeholder="Write your note here...">${q.note || ''}</textarea>
            <div class="action-row" style="justify-content:flex-start; margin-top:12px;">
              <button class="btn btn-dark saved-note-save" type="button">Save Note</button>
              <button class="btn btn-light saved-note-cancel" type="button">Cancel</button>
              ${q.note ? '<button class="btn btn-danger saved-note-delete" type="button">Delete Note</button>' : ''}
            </div>
          </div>
          <div class="action-row" style="justify-content:flex-start; margin-top:16px;">
            <a class="btn btn-light" href="${pageLink('./topic.html', { subject: q.subject, topic: q.topic })}">Open Topic</a>
          </div>
        `;

        card.querySelector('.star-btn').addEventListener('click', (e) => {
          const on = toggleSaved(q);
          q.isSaved = on;
          e.currentTarget.classList.toggle('is-saved', on);
          draw();
        });

        const noteBox = card.querySelector('.saved-note-box');
        card.querySelector('.saved-note-toggle').addEventListener('click', () => {
          noteBox.style.display = noteBox.style.display === 'none' ? 'block' : 'none';
        });
        card.querySelector('.saved-note-save').addEventListener('click', () => {
          setNote(q, card.querySelector('.saved-note-input').value);
          draw();
        });
        card.querySelector('.saved-note-cancel').addEventListener('click', () => {
          noteBox.style.display = 'none';
        });
        const deleteBtn = card.querySelector('.saved-note-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => {
            setNote(q, '');
            draw();
          });
        }

        grid.appendChild(card);
      });
    }

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        filterButtons.forEach((b) => {
          b.classList.remove('is-active', 'btn-dark');
          b.classList.add('btn-light');
        });
        btn.classList.add('is-active', 'btn-dark');
        btn.classList.remove('btn-light');
        draw();
      });
    });

    subjectFilter.addEventListener('change', draw);
    topicFilter.addEventListener('change', draw);
    searchInput.addEventListener('input', draw);
    draw();
  }

  function githubHeaders(token) {
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
  }

  async function githubRequest(path, options = {}) {
    const settings = readStore(KEYS.github, null);
    if (!settings?.owner || !settings?.repo || !settings?.branch || !settings?.token) {
      throw new Error('GitHub settings are incomplete.');
    }
    const res = await fetch(`https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`, {
      ...options,
      headers: { ...githubHeaders(settings.token), ...(options.headers || {}) }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'GitHub request failed');
    return json;
  }

  async function githubGetText(path) {
    const file = await githubRequest(path);
    const decoded = atob(file.content.replace(/\n/g, ''));
    return { text: decoded, sha: file.sha };
  }

  async function githubPutFile(path, content, message) {
    let sha;
    try { sha = (await githubRequest(path)).sha; } catch (_) { sha = undefined; }
    const settings = readStore(KEYS.github, null);
    return githubRequest(path, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: settings.branch,
        sha
      })
    });
  }

  async function githubDeleteFile(path, message) {
    const settings = readStore(KEYS.github, null);
    const file = await githubRequest(path);
    return githubRequest(path, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha: file.sha, branch: settings.branch })
    });
  }

  function injectAdmin() {
    const backdrop = document.getElementById('adminBackdrop');
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        openAdmin();
      }
    });

    function passwordMarkup(hasPass) {
      return `
        <div class="password-screen">
          <h2>${hasPass ? 'Enter Admin Password' : 'Create Admin Password'}</h2>
          <p class="muted">This password is stored locally in this browser only.</p>
          <input class="input" id="adminPassInput" type="password" placeholder="${hasPass ? 'Enter password' : 'Create password'}" />
          <div class="action-row" style="justify-content:flex-start; margin-top:16px;">
            <button class="btn btn-dark" id="adminPassBtn">${hasPass ? 'Unlock' : 'Save Password'}</button>
            <button class="btn btn-light" id="adminCancelBtn">Cancel</button>
          </div>
          <div id="adminPassMsg"></div>
        </div>
      `;
    }

    function openAdmin() {
      backdrop.classList.add('is-open');
      const currentPass = localStorage.getItem(KEYS.adminPass);
      backdrop.innerHTML = passwordMarkup(!!currentPass);
      document.getElementById('adminPassInput').focus();
      document.getElementById('adminCancelBtn').onclick = closeAdmin;
      const submit = () => {
        const input = document.getElementById('adminPassInput').value.trim();
        if (!input) return;
        if (!currentPass) {
          localStorage.setItem(KEYS.adminPass, input);
          renderAdminPanel();
        } else if (input === currentPass) {
          renderAdminPanel();
        } else {
          document.getElementById('adminPassMsg').innerHTML = '<div class="message error">Wrong password.</div>';
        }
      };
      document.getElementById('adminPassBtn').onclick = submit;
      document.getElementById('adminPassInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }

    function closeAdmin() {
      backdrop.classList.remove('is-open');
      backdrop.innerHTML = '';
    }

    function renderAdminPanel() {
      backdrop.innerHTML = `
        <div class="admin-modal">
          <aside class="admin-nav">
            <div>
              <div class="brand-mark" style="margin-bottom:12px;">PN</div>
              <strong style="font-size:1.35rem;">Admin Panel</strong>
              <div style="color:rgba(255,255,255,0.72); margin-top:6px;">Manage subjects, topics, and questions.</div>
            </div>
            <button class="is-active" data-tab="github">1. GitHub</button>
            <button data-tab="subject">2. Add Subject</button>
            <button data-tab="topic">3. Add Topic</button>
            <button data-tab="question">4. Add Question</button>
            <button id="adminClose" style="margin-top:auto; background:rgba(255,255,255,0.04); color:#ffb1b1;">Close</button>
          </aside>
          <section class="admin-content"><div id="adminTabContent"></div></section>
        </div>
      `;
      backdrop.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
        backdrop.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        drawAdminTab(btn.dataset.tab);
      }));
      document.getElementById('adminClose').onclick = closeAdmin;
      drawAdminTab('github');
    }

    function drawAdminTab(tab) {
      const box = document.getElementById('adminTabContent');
      if (tab === 'github') return drawGithubTab(box);
      if (tab === 'subject') return drawSubjectTab(box);
      if (tab === 'topic') return drawTopicTab(box);
      drawQuestionTab(box);
    }

    function drawGithubTab(box) {
      const settings = readStore(KEYS.github, { owner: '', repo: '', branch: 'main', token: '' });
      box.innerHTML = `
        <h2>GitHub Settings</h2>
        <p class="muted">Use your GitHub username or org as owner, exact repo name, exact branch name, and a Classic PAT with repo access.</p>
        <div class="input-row two">
          <input class="input" id="ghOwner" placeholder="Owner" value="${settings.owner || ''}" />
          <input class="input" id="ghRepo" placeholder="Repo" value="${settings.repo || ''}" />
        </div>
        <div class="input-row two" style="margin-top:16px;">
          <input class="input" id="ghBranch" placeholder="Branch" value="${settings.branch || 'main'}" />
          <input class="input" id="ghToken" placeholder="Classic PAT" value="${settings.token || ''}" />
        </div>
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;">
          <button class="btn btn-dark" id="ghSave">Save Settings</button>
          <button class="btn btn-light" id="ghTest">Test Connection</button>
        </div>
        <div id="ghMsg"></div>
      `;
      document.getElementById('ghSave').onclick = () => {
        const next = {
          owner: document.getElementById('ghOwner').value.trim(),
          repo: document.getElementById('ghRepo').value.trim(),
          branch: document.getElementById('ghBranch').value.trim(),
          token: document.getElementById('ghToken').value.trim()
        };
        writeStore(KEYS.github, next);
        document.getElementById('ghMsg').innerHTML = '<div class="message success">Settings saved in this browser.</div>';
      };
      document.getElementById('ghTest').onclick = async () => {
        try {
          const settingsNow = {
            owner: document.getElementById('ghOwner').value.trim(),
            repo: document.getElementById('ghRepo').value.trim(),
            branch: document.getElementById('ghBranch').value.trim(),
            token: document.getElementById('ghToken').value.trim()
          };
          writeStore(KEYS.github, settingsNow);
          const res = await fetch(`https://api.github.com/repos/${settingsNow.owner}/${settingsNow.repo}/branches/${settingsNow.branch}`, { headers: githubHeaders(settingsNow.token) });
          if (!res.ok) throw new Error('GitHub could not find this repo/branch. Check owner, repo, branch, and PAT access.');
          document.getElementById('ghMsg').innerHTML = '<div class="message success">Connection successful.</div>';
        } catch (error) {
          document.getElementById('ghMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };
    }

    function drawSubjectTab(box) {
      box.innerHTML = `
        <h2>Add Subject</h2>
        <p class="muted">Type the subject name only. The slug ID is created automatically.</p>
        <input class="input" id="subjectNameInput" placeholder="Subject name" />
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;"><button class="btn btn-dark" id="createSubjectBtn">Create Subject</button></div>
        <div id="subjectMsg"></div>
        <h3 style="margin-top:28px;">Delete Subject</h3>
        <select class="select" id="deleteSubjectSelect">${state.index.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;"><button class="btn btn-danger" id="deleteSubjectBtn">Delete Subject</button></div>
      `;
      document.getElementById('createSubjectBtn').onclick = async () => {
        const name = document.getElementById('subjectNameInput').value.trim();
        if (!name) return;
        try {
          const indexData = JSON.parse((await githubGetText('data/index.json')).text);
          const id = slugify(name);
          if (indexData.subjects.some((s) => s.id === id)) throw new Error('Subject already exists.');
          indexData.subjects.push({ id, name, topics: [] });
          await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Add subject ${name}`);
          document.getElementById('subjectMsg').innerHTML = '<div class="message success">Subject created. Refresh the page to load it locally.</div>';
        } catch (error) {
          document.getElementById('subjectMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };
      document.getElementById('deleteSubjectBtn').onclick = async () => {
        const subjectId = document.getElementById('deleteSubjectSelect').value;
        if (!subjectId || !confirm('Delete this subject and all its topic files?')) return;
        try {
          const indexFile = await githubGetText('data/index.json');
          const indexData = JSON.parse(indexFile.text);
          const subject = indexData.subjects.find((s) => s.id === subjectId);
          for (const topic of subject.topics) {
            await githubDeleteFile(topic.file, `Delete topic ${topic.name}`);
          }
          indexData.subjects = indexData.subjects.filter((s) => s.id !== subjectId);
          await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Delete subject ${subjectId}`);
          document.getElementById('subjectMsg').innerHTML = '<div class="message success">Subject deleted from GitHub.</div>';
        } catch (error) {
          document.getElementById('subjectMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };
    }

    function drawTopicTab(box) {
      box.innerHTML = `
        <h2>Add Topic</h2>
        <div class="input-row two">
          <select class="select" id="topicSubjectSelect">${state.index.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
          <input class="input" id="topicNameInput" placeholder="Topic name" />
        </div>
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;"><button class="btn btn-dark" id="createTopicBtn">Create Topic</button></div>
        <div id="topicMsg"></div>
        <h3 style="margin-top:28px;">Delete Topic</h3>
        <div class="input-row two">
          <select class="select" id="deleteTopicSubject"></select>
          <select class="select" id="deleteTopicSelect"></select>
        </div>
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;"><button class="btn btn-danger" id="deleteTopicBtn">Delete Topic</button></div>
      `;
      const deleteSubject = document.getElementById('deleteTopicSubject');
      const deleteTopic = document.getElementById('deleteTopicSelect');
      deleteSubject.innerHTML = state.index.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
      const syncTopics = () => {
        const subject = state.subjectMap.get(deleteSubject.value);
        deleteTopic.innerHTML = subject.topics.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
      };
      deleteSubject.addEventListener('change', syncTopics);
      syncTopics();

      document.getElementById('createTopicBtn').onclick = async () => {
        const subjectId = document.getElementById('topicSubjectSelect').value;
        const topicName = document.getElementById('topicNameInput').value.trim();
        if (!topicName) return;
        try {
          const indexData = JSON.parse((await githubGetText('data/index.json')).text);
          const subject = indexData.subjects.find((s) => s.id === subjectId);
          const topicId = slugify(topicName);
          if (subject.topics.some((t) => t.id === topicId)) throw new Error('Topic already exists.');
          const filePath = `data/${subjectId}/${topicId}.json`;
          subject.topics.push({ id: topicId, name: topicName, file: filePath, questionCount: 0 });
          await githubPutFile(filePath, JSON.stringify({ questions: [] }, null, 2), `Create topic file ${topicName}`);
          await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Add topic ${topicName}`);
          document.getElementById('topicMsg').innerHTML = '<div class="message success">Topic created on GitHub.</div>';
        } catch (error) {
          document.getElementById('topicMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };

      document.getElementById('deleteTopicBtn').onclick = async () => {
        const subjectId = deleteSubject.value;
        const topicId = deleteTopic.value;
        if (!topicId || !confirm('Delete this topic and its file?')) return;
        try {
          const indexData = JSON.parse((await githubGetText('data/index.json')).text);
          const subject = indexData.subjects.find((s) => s.id === subjectId);
          const topic = subject.topics.find((t) => t.id === topicId);
          await githubDeleteFile(topic.file, `Delete topic ${topic.name}`);
          subject.topics = subject.topics.filter((t) => t.id !== topicId);
          await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Delete topic ${topicId}`);
          document.getElementById('topicMsg').innerHTML = '<div class="message success">Topic deleted from GitHub.</div>';
        } catch (error) {
          document.getElementById('topicMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };
    }

    function drawQuestionTab(box) {
      box.innerHTML = `
        <h2>Add Question</h2>
        <div class="input-row two">
          <select class="select" id="qSubject"></select>
          <select class="select" id="qTopic"></select>
        </div>
        <div class="input-row two" style="margin-top:16px;">
          <select class="select" id="qType"><option value="mcq">MCQ</option><option value="true-false">True / False</option><option value="image">Image Question</option><option value="case">Clinical Case Question</option></select>
          <select class="select" id="qDifficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
        </div>
        <textarea class="textarea" id="qText" placeholder="Question text" style="margin-top:16px;"></textarea>
        <textarea class="textarea" id="qCase" placeholder="Case scenario (optional)" style="margin-top:16px;"></textarea>
        <input class="input" id="qImage" placeholder="Image URL (optional)" style="margin-top:16px;" />
        <div class="input-row two" style="margin-top:16px;"><input class="input" id="qA" placeholder="Option A" /><input class="input" id="qB" placeholder="Option B" /></div>
        <div class="input-row two" style="margin-top:16px;"><input class="input" id="qC" placeholder="Option C" /><input class="input" id="qD" placeholder="Option D" /></div>
        <select class="select" id="qCorrect" style="margin-top:16px;"><option value="A">Correct = Option A</option><option value="B">Correct = Option B</option><option value="C">Correct = Option C</option><option value="D">Correct = Option D</option></select>
        <textarea class="textarea" id="qExplanation" placeholder="Explanation" style="margin-top:16px;"></textarea>
        <div class="action-row" style="justify-content:flex-start; margin-top:16px;"><button class="btn btn-dark" id="addQuestionBtn">Add Question</button></div>
        <div id="questionMsg"></div>
        <h3 style="margin-top:28px;">Delete Question</h3>
        <div class="input-row two"><select class="select" id="delQSubject"></select><select class="select" id="delQTopic"></select></div>
        <div class="list-box" id="questionDeleteList"></div>
      `;
      const qSubject = document.getElementById('qSubject');
      const qTopic = document.getElementById('qTopic');
      const delQSubject = document.getElementById('delQSubject');
      const delQTopic = document.getElementById('delQTopic');
      const fillSubjectOptions = (select) => { select.innerHTML = state.index.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join(''); };
      fillSubjectOptions(qSubject); fillSubjectOptions(delQSubject);
      const syncTopicOptions = (subjectSelect, topicSelect) => {
        const subject = state.subjectMap.get(subjectSelect.value);
        topicSelect.innerHTML = subject.topics.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
      };
      const renderDeleteList = async () => {
        const subjectId = delQSubject.value; const topicId = delQTopic.value;
        if (!subjectId || !topicId) return;
        const meta = state.topicMap.get(`${subjectId}:${topicId}`);
        let data;
        try {
          data = JSON.parse((await githubGetText(meta.file)).text);
        } catch (_) {
          data = await getJSON(`./${meta.file}`);
        }
        const boxList = document.getElementById('questionDeleteList');
        boxList.innerHTML = data.questions.length ? '' : '<div class="empty-state">No questions in this topic.</div>';
        data.questions.slice(0, 50).forEach((q) => {
          const row = el('div', 'list-item');
          row.innerHTML = `<div><strong>${q.id}</strong><div class="muted">${q.question.slice(0, 90)}</div></div><button class="small-btn danger">Delete</button>`;
          row.querySelector('button').addEventListener('click', async () => {
            if (!confirm('Delete this question from GitHub?')) return;
            try {
              const file = await githubGetText(meta.file);
              const json = JSON.parse(file.text);
              json.questions = json.questions.filter((item) => item.id !== q.id);
              await githubPutFile(meta.file, JSON.stringify(json, null, 2), `Delete question ${q.id}`);
              const indexData = JSON.parse((await githubGetText('data/index.json')).text);
              const subject = indexData.subjects.find((s) => s.id === subjectId);
              const topic = subject.topics.find((t) => t.id === topicId);
              topic.questionCount = json.questions.length;
              await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Update count for ${topicId}`);
              row.remove();
            } catch (error) {
              document.getElementById('questionMsg').innerHTML = `<div class="message error">${error.message}</div>`;
            }
          });
          boxList.appendChild(row);
        });
      };
      qSubject.addEventListener('change', () => syncTopicOptions(qSubject, qTopic));
      delQSubject.addEventListener('change', async () => { syncTopicOptions(delQSubject, delQTopic); await renderDeleteList(); });
      delQTopic.addEventListener('change', renderDeleteList);
      syncTopicOptions(qSubject, qTopic); syncTopicOptions(delQSubject, delQTopic); renderDeleteList();

      document.getElementById('addQuestionBtn').onclick = async () => {
        try {
          const subjectId = qSubject.value;
          const topicId = qTopic.value;
          const meta = state.topicMap.get(`${subjectId}:${topicId}`);
          const file = await githubGetText(meta.file);
          const json = JSON.parse(file.text);
          const options = [document.getElementById('qA').value.trim(), document.getElementById('qB').value.trim(), document.getElementById('qC').value.trim(), document.getElementById('qD').value.trim()];
          if (options.some((o) => !o)) throw new Error('All 4 options are required.');
          const correctIndex = { A: 0, B: 1, C: 2, D: 3 }[document.getElementById('qCorrect').value];
          const question = {
            id: `${subjectId}-${topicId}-${Date.now()}`,
            type: document.getElementById('qType').value,
            subject: subjectId,
            topic: topicId,
            question: document.getElementById('qText').value.trim(),
            options,
            correctAnswer: options[correctIndex],
            explanation: document.getElementById('qExplanation').value.trim(),
            difficulty: document.getElementById('qDifficulty').value,
            caseScenario: document.getElementById('qCase').value.trim(),
            imageUrl: document.getElementById('qImage').value.trim()
          };
          if (!question.question || !question.explanation) throw new Error('Question text and explanation are required.');
          json.questions.push(question);
          await githubPutFile(meta.file, JSON.stringify(json, null, 2), `Add question ${question.id}`);
          const indexData = JSON.parse((await githubGetText('data/index.json')).text);
          const subject = indexData.subjects.find((s) => s.id === subjectId);
          const topic = subject.topics.find((t) => t.id === topicId);
          topic.questionCount = json.questions.length;
          await githubPutFile('data/index.json', JSON.stringify(indexData, null, 2), `Update count for ${topicId}`);
          document.getElementById('questionMsg').innerHTML = '<div class="message success">Question added to GitHub.</div>';
          renderDeleteList();
        } catch (error) {
          document.getElementById('questionMsg').innerHTML = `<div class="message error">${error.message}</div>`;
        }
      };
    }

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAdmin(); });
  }

  async function boot() {
    ensureShell();
    await loadIndex();
    injectAdmin();
    if (PAGE === 'home') renderHome(state.index);
    else if (PAGE === 'subjects') renderSubjectsPage(state.index);
    else if (PAGE === 'topics') renderTopicsPage();
    else if (PAGE === 'topic') await renderTopicPage();
    else if (PAGE === 'study') await renderStudyPage();
    else if (PAGE === 'final-exam') await renderFinalExamPage();
    else if (PAGE === 'review') renderReviewPage();
    else if (PAGE === 'dashboard') renderDashboardPage();
    else if (PAGE === 'saved') renderSavedPage();
  }

  boot().catch((error) => {
    const root = document.getElementById('pageRoot') || document.body;
    root.innerHTML = `<div class="container"><div class="message error">${error.message}</div></div>`;
    console.error(error);
  });
})();
