(function () {
  const STORAGE_KEY = 'pharmacy_nexus_state_v1';
  const TRACKING_KEY = 'pharmacy_nexus_tracking_v1';
  const ROUTES = ['home', 'subjects', 'subject', 'topic', 'study', 'final-exam', 'exam-session', 'dashboard'];

  const sampleData = {
    subjects: [
      {
        id: 'pharmacology',
        name: 'Pharmacology',
        topics: [
          { id: 'antibiotics', name: 'Antibiotics', file: 'data/pharmacology/antibiotics.json', questionCount: 3 },
          { id: 'autonomic-pharmacology', name: 'Autonomic Pharmacology', file: 'data/pharmacology/autonomic-pharmacology.json', questionCount: 2 }
        ]
      },
      {
        id: 'pharmaceutics',
        name: 'Pharmaceutics',
        topics: [
          { id: 'tablets', name: 'Tablets', file: 'data/pharmaceutics/tablets.json', questionCount: 2 },
          { id: 'suspensions', name: 'Suspensions', file: 'data/pharmaceutics/suspensions.json', questionCount: 2 }
        ]
      },
      {
        id: 'clinical-pharmacy',
        name: 'Clinical Pharmacy',
        topics: [
          { id: 'hypertension', name: 'Hypertension', file: 'data/clinical-pharmacy/hypertension.json', questionCount: 3 },
          { id: 'diabetes', name: 'Diabetes Mellitus', file: 'data/clinical-pharmacy/diabetes.json', questionCount: 2 }
        ]
      }
    ],
    topicQuestions: {
      'data/pharmacology/antibiotics.json': {
        questions: [
          {
            id: 'pharm-abx-001', type: 'mcq', subject: 'pharmacology', topic: 'antibiotics', difficulty: 'easy',
            question: 'Which antibiotic class inhibits bacterial cell wall synthesis by binding to PBPs?',
            options: ['Macrolides', 'Penicillins', 'Fluoroquinolones', 'Tetracyclines'],
            correctAnswer: 'Penicillins',
            explanation: 'Penicillins are beta-lactam antibiotics that bind penicillin-binding proteins and inhibit cell wall synthesis.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'pharm-abx-002', type: 'clinical-case', subject: 'pharmacology', topic: 'antibiotics', difficulty: 'medium',
            question: 'Which antibiotic is most associated with tendon injury risk?',
            options: ['Ciprofloxacin', 'Azithromycin', 'Amoxicillin', 'Doxycycline'],
            correctAnswer: 'Ciprofloxacin',
            explanation: 'Fluoroquinolones such as ciprofloxacin can increase the risk of tendinopathy and tendon rupture.',
            caseScenario: 'A 61-year-old patient reports heel pain after starting therapy for a complicated UTI. You are reviewing possible medication causes.',
            imageUrl: ''
          },
          {
            id: 'pharm-abx-003', type: 'true-false', subject: 'pharmacology', topic: 'antibiotics', difficulty: 'hard',
            question: 'Vancomycin is a first-line oral treatment for systemic MRSA bacteremia.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'Vancomycin for systemic MRSA bacteremia is given intravenously; oral vancomycin is used mainly for C. difficile infection.',
            caseScenario: '', imageUrl: ''
          }
        ]
      },
      'data/pharmacology/autonomic-pharmacology.json': {
        questions: [
          {
            id: 'pharm-auto-001', type: 'mcq', subject: 'pharmacology', topic: 'autonomic-pharmacology', difficulty: 'easy',
            question: 'Which receptor is primarily responsible for increasing heart rate?',
            options: ['M2', 'Beta-1', 'Alpha-1', 'Beta-2'],
            correctAnswer: 'Beta-1',
            explanation: 'Beta-1 receptors in the heart increase heart rate and contractility when stimulated.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'pharm-auto-002', type: 'mcq', subject: 'pharmacology', topic: 'autonomic-pharmacology', difficulty: 'medium',
            question: 'Which adverse effect is most expected with a nonselective beta blocker?',
            options: ['Bronchodilation', 'Bradycardia', 'Tachycardia', 'Mydriasis'],
            correctAnswer: 'Bradycardia',
            explanation: 'Nonselective beta blockers reduce heart rate and can cause bradycardia.',
            caseScenario: '', imageUrl: ''
          }
        ]
      },
      'data/pharmaceutics/tablets.json': {
        questions: [
          {
            id: 'phceu-tab-001', type: 'mcq', subject: 'pharmaceutics', topic: 'tablets', difficulty: 'easy',
            question: 'Which excipient is commonly used as a binder in tablets?',
            options: ['Lactose', 'Starch paste', 'Magnesium stearate', 'Talc'],
            correctAnswer: 'Starch paste',
            explanation: 'Starch paste can act as a binder to improve tablet cohesion.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'phceu-tab-002', type: 'mcq', subject: 'pharmaceutics', topic: 'tablets', difficulty: 'medium',
            question: 'Which parameter reflects the mechanical strength of a compressed tablet?',
            options: ['Friability', 'pH', 'Viscosity', 'Density'],
            correctAnswer: 'Friability',
            explanation: 'Friability helps assess the ability of tablets to resist abrasion and breakage.',
            caseScenario: '', imageUrl: ''
          }
        ]
      },
      'data/pharmaceutics/suspensions.json': {
        questions: [
          {
            id: 'phceu-sus-001', type: 'true-false', subject: 'pharmaceutics', topic: 'suspensions', difficulty: 'easy',
            question: 'A good pharmaceutical suspension should be easy to redisperse after settling.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Redispersibility is a key property of a stable suspension.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'phceu-sus-002', type: 'mcq', subject: 'pharmaceutics', topic: 'suspensions', difficulty: 'medium',
            question: 'Which agent is commonly used to increase viscosity in suspensions?',
            options: ['Methylcellulose', 'Sucrose', 'Ethanol', 'Acetone'],
            correctAnswer: 'Methylcellulose',
            explanation: 'Suspending agents such as methylcellulose can increase viscosity and slow sedimentation.',
            caseScenario: '', imageUrl: ''
          }
        ]
      },
      'data/clinical-pharmacy/hypertension.json': {
        questions: [
          {
            id: 'clin-htn-001', type: 'clinical-case', subject: 'clinical-pharmacy', topic: 'hypertension', difficulty: 'medium',
            question: 'Which antihypertensive is appropriate first-line in a patient with diabetes and albuminuria?',
            options: ['Hydralazine', 'Lisinopril', 'Clonidine', 'Diltiazem'],
            correctAnswer: 'Lisinopril',
            explanation: 'ACE inhibitors are commonly preferred in diabetes with albuminuria due to renal protection.',
            caseScenario: 'A 57-year-old with type 2 diabetes and persistent albuminuria is newly diagnosed with hypertension.',
            imageUrl: ''
          },
          {
            id: 'clin-htn-002', type: 'mcq', subject: 'clinical-pharmacy', topic: 'hypertension', difficulty: 'easy',
            question: 'Which lifestyle change can help lower blood pressure?',
            options: ['Higher sodium intake', 'Weight reduction', 'Smoking more often', 'Less physical activity'],
            correctAnswer: 'Weight reduction',
            explanation: 'Weight reduction is one of the strongest nonpharmacologic measures for blood pressure control.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'clin-htn-003', type: 'image-question', subject: 'clinical-pharmacy', topic: 'hypertension', difficulty: 'hard',
            question: 'Review the blood pressure chart image and identify the category that best fits repeated values around 148/92 mmHg.',
            options: ['Normal', 'Elevated', 'Stage 1 hypertension', 'Stage 2 hypertension'],
            correctAnswer: 'Stage 2 hypertension',
            explanation: 'Blood pressure of 140/90 mmHg or higher falls into stage 2 hypertension in many commonly used classifications.',
            caseScenario: '', imageUrl: 'https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=900&q=80'
          }
        ]
      },
      'data/clinical-pharmacy/diabetes.json': {
        questions: [
          {
            id: 'clin-dm-001', type: 'mcq', subject: 'clinical-pharmacy', topic: 'diabetes', difficulty: 'easy',
            question: 'Which lab value is commonly used to assess average glycemic control over 2–3 months?',
            options: ['Fasting insulin', 'HbA1c', 'C-peptide', 'Random cortisol'],
            correctAnswer: 'HbA1c',
            explanation: 'HbA1c reflects average blood glucose exposure over approximately 2–3 months.',
            caseScenario: '', imageUrl: ''
          },
          {
            id: 'clin-dm-002', type: 'clinical-case', subject: 'clinical-pharmacy', topic: 'diabetes', difficulty: 'medium',
            question: 'Which medication is commonly first-line for type 2 diabetes when no contraindications exist?',
            options: ['Metformin', 'Insulin glargine', 'Pioglitazone', 'Acarbose'],
            correctAnswer: 'Metformin',
            explanation: 'Metformin is widely recommended as first-line therapy for type 2 diabetes in many patients.',
            caseScenario: 'A newly diagnosed adult with obesity and preserved renal function is starting therapy for type 2 diabetes.',
            imageUrl: ''
          }
        ]
      }
    },
    github: { owner: '', repo: '', branch: 'main', token: '' }
  };

  const state = loadState();
  const tracking = loadTracking();
  const app = document.getElementById('app');
  const adminDialog = document.getElementById('adminDialog');
  const adminRoot = document.getElementById('adminRoot');
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  let adminTab = 'settings';
  let currentStudy = { file: '', index: 0, revealed: false };
  let currentExam = null;

  navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  document.getElementById('closeAdmin').addEventListener('click', () => adminDialog.close());
  document.addEventListener('click', handleDelegatedClicks);
  document.addEventListener('submit', handleDelegatedSubmit);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  window.addEventListener('hashchange', render);

  bootstrap();

  function bootstrap() {
    if (!location.hash) {
      location.hash = '#/home';
    }
    render();
  }

  function loadState() {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (cached && Array.isArray(cached.subjects)) return cached;
    } catch (error) {}
    return structuredCloneSafe(sampleData);
  }

  function loadTracking() {
    try {
      const cached = JSON.parse(localStorage.getItem(TRACKING_KEY));
      if (cached) return cached;
    } catch (error) {}
    return {
      studySessions: [],
      questionReveals: {},
      topicVisits: {},
      finalExams: [],
      recommendedTopicId: ''
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveTracking() {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(tracking));
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseRoute() {
    const raw = location.hash.replace(/^#\/?/, '') || 'home';
    const [path, queryString] = raw.split('?');
    const params = new URLSearchParams(queryString || '');
    return { path: ROUTES.includes(path) ? path : 'home', params };
  }

  function go(path, params = {}) {
    const query = new URLSearchParams(params);
    location.hash = `#/${path}${query.toString() ? `?${query.toString()}` : ''}`;
  }

  function render() {
    const { path, params } = parseRoute();
    setActiveNav(path);
    mainNav.classList.remove('open');

    if (path === 'home') return renderHome();
    if (path === 'subjects') return renderSubjects();
    if (path === 'subject') return renderSubjectPage(params.get('id'));
    if (path === 'topic') return renderTopicPage(params.get('subject'), params.get('topic'));
    if (path === 'study') return renderStudyPage(params.get('subject'), params.get('topic'));
    if (path === 'final-exam') return renderFinalExamBuilder();
    if (path === 'exam-session') return renderExamSession();
    if (path === 'dashboard') return renderDashboard();
    renderHome();
  }

  function setActiveNav(path) {
    const mapped = path === 'subject' || path === 'topic' ? 'subjects' : path === 'exam-session' ? 'final-exam' : path;
    document.querySelectorAll('#mainNav button[data-route]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === mapped);
    });
  }

  function renderHome() {
    const subjectCount = state.subjects.length;
    const topicCount = state.subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    const questionCount = getAllQuestions().length;
    const successRate = getDashboardMetrics().overallSuccessRate;

    app.innerHTML = `
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-card">
            <span class="eyebrow">Pharmacy Nexus</span>
            <h1>Your Ultimate Pharmacy Learning Platform<br><span class="gold-line">Built for Future Pharmacists</span></h1>
            <p>Study topic by topic, track your performance locally, and manage your structured JSON repository from the hidden admin panel without adding heavy dependencies.</p>
            <div class="hero-stats">
              <div class="stat-chip"><strong>${subjectCount}</strong><span>Subjects</span></div>
              <div class="stat-chip"><strong>${topicCount}</strong><span>Topics</span></div>
              <div class="stat-chip"><strong>${questionCount}</strong><span>Study Questions</span></div>
              <div class="stat-chip"><strong>${successRate}%</strong><span>Success Rate</span></div>
            </div>
          </div>
          <div class="hero-card">
            <h3>Built for speed</h3>
            <p>Subjects load first, topics load inside the subject, and questions are handled topic-by-topic to stay lightweight and GitHub-friendly.</p>
            <div class="progress-list">
              <div class="progress-item"><strong>Structured JSON</strong><div class="bar"><span style="width: 100%"></span></div></div>
              <div class="progress-item"><strong>Study Mode</strong><div class="bar"><span style="width: 100%"></span></div></div>
              <div class="progress-item"><strong>Final Exam</strong><div class="bar"><span style="width: 100%"></span></div></div>
              <div class="progress-item"><strong>Admin + GitHub API</strong><div class="bar"><span style="width: 100%"></span></div></div>
            </div>
            <div style="display:flex; gap:12px; margin-top:18px; flex-wrap:wrap;">
              <button class="primary-btn" data-goto="subjects">Explore Subjects</button>
              <button class="secondary-btn" data-goto="dashboard">Open Dashboard</button>
            </div>
          </div>
        </div>
      </section>
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>Subjects</h2>
              <p>Homepage shows subjects only, exactly as requested.</p>
            </div>
          </div>
          ${renderSubjectCards(state.subjects)}
        </div>
      </section>
    `;
  }

  function renderSubjects() {
    app.innerHTML = `
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>Subjects</h2>
              <p>Select a subject to open its topics.</p>
            </div>
          </div>
          <div class="search-row">
            <input class="input" id="subjectSearch" placeholder="Search subjects..." />
            <button class="secondary-btn" type="button" data-filter-subjects>Search</button>
          </div>
          <div id="subjectResults">${renderSubjectCards(state.subjects)}</div>
        </div>
      </section>
    `;
  }

  function renderSubjectCards(subjects) {
    if (!subjects.length) return document.getElementById('emptyStateTemplate').innerHTML;
    return `<div class="grid subject-grid">${subjects.map(subject => `
      <article class="card subject-card">
        <div class="subject-meta">
          <span class="pill">${subject.id}</span>
          <span class="pill gold">${subject.topics.length} topics</span>
        </div>
        <h3>${escapeHtml(subject.name)}</h3>
        <p class="muted">Structured by subject first, then topic, with topic-level JSON files.</p>
        <button class="secondary-btn" data-goto="subject" data-subject-id="${subject.id}">Open Topics</button>
      </article>
    `).join('')}</div>`;
  }

  function renderSubjectPage(subjectId) {
    const subject = getSubject(subjectId);
    if (!subject) return renderNotFound('Subject not found');

    app.innerHTML = `
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>${escapeHtml(subject.name)}</h2>
              <p>${subject.topics.length} topics available for study.</p>
            </div>
            <button class="ghost-btn" data-goto="subjects">← Back to Subjects</button>
          </div>
          <div class="search-row">
            <input class="input" id="topicSearch" placeholder="Search topics in ${escapeHtml(subject.name)}..." />
            <button class="secondary-btn" type="button" data-filter-topics data-subject-id="${subject.id}">Search</button>
          </div>
          <div id="topicResults">${renderTopicCards(subject)}</div>
        </div>
      </section>
    `;
  }

  function renderTopicCards(subject, filteredTopics) {
    const topics = filteredTopics || subject.topics;
    if (!topics.length) return document.getElementById('emptyStateTemplate').innerHTML;
    return `<div class="grid topic-grid">${topics.map(topic => {
      const questions = getQuestionsByFile(topic.file);
      const breakdown = getDifficultyBreakdown(questions);
      return `
        <article class="card topic-card">
          <div class="topic-meta">
            <span class="pill">${questions.length} questions</span>
            <span class="pill gold">E ${breakdown.easy} • M ${breakdown.medium} • H ${breakdown.hard}</span>
          </div>
          <h3>${escapeHtml(topic.name)}</h3>
          <p class="muted">Study mode only here. Final exam is separated in its own builder.</p>
          <button class="secondary-btn" data-goto="topic" data-subject-id="${subject.id}" data-topic-id="${topic.id}">Study</button>
        </article>
      `;
    }).join('')}</div>`;
  }

  function renderTopicPage(subjectId, topicId) {
    const subject = getSubject(subjectId);
    const topic = getTopic(subjectId, topicId);
    if (!subject || !topic) return renderNotFound('Topic not found');
    const questions = getQuestionsByFile(topic.file);
    const breakdown = getDifficultyBreakdown(questions);

    app.innerHTML = `
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>${escapeHtml(topic.name)}</h2>
              <p>${escapeHtml(subject.name)} • ${questions.length} questions</p>
            </div>
            <button class="ghost-btn" data-goto="subject" data-subject-id="${subject.id}">← Back to Topics</button>
          </div>

          <div class="grid card-grid">
            <article class="card">
              <h3>Topic Overview</h3>
              <div class="progress-list">
                <div class="progress-item"><span>Easy</span><div class="bar"><span style="width:${questions.length ? breakdown.easy / questions.length * 100 : 0}%"></span></div></div>
                <div class="progress-item"><span>Medium</span><div class="bar"><span style="width:${questions.length ? breakdown.medium / questions.length * 100 : 0}%"></span></div></div>
                <div class="progress-item"><span>Hard</span><div class="bar"><span style="width:${questions.length ? breakdown.hard / questions.length * 100 : 0}%"></span></div></div>
              </div>
            </article>
            <article class="card">
              <h3>Actions</h3>
              <p class="muted">Start the study session question by question.</p>
              <button class="secondary-btn" data-goto="study" data-subject-id="${subject.id}" data-topic-id="${topic.id}">Study Questions</button>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function renderStudyPage(subjectId, topicId) {
    const subject = getSubject(subjectId);
    const topic = getTopic(subjectId, topicId);
    if (!subject || !topic) return renderNotFound('Study topic not found');

    const questions = getQuestionsByFile(topic.file);
    if (!questions.length) return renderNotFound('This topic does not contain questions yet.');

    if (currentStudy.file !== topic.file) {
      currentStudy = { file: topic.file, index: 0, revealed: false };
      recordTopicVisit(subjectId, topicId);
    }

    const question = questions[currentStudy.index];
    const progress = ((currentStudy.index + 1) / questions.length) * 100;
    const difficultyBadge = `<span class="pill gold">${question.difficulty}</span>`;

    app.innerHTML = `
      <section class="page">
        <div class="container study-layout">
          <article class="card study-question">
            <div class="question-meta">
              <span class="pill">${escapeHtml(subject.name)}</span>
              <span class="pill">${escapeHtml(topic.name)}</span>
              ${difficultyBadge}
              <span class="pill">Question ${currentStudy.index + 1} of ${questions.length}</span>
            </div>
            <div style="margin:16px 0 22px;">
              <div class="progress-bar"><span style="width:${progress}%"></span></div>
            </div>
            <div class="question-block">
              ${question.caseScenario ? `<div class="answer-panel"><strong>Case Scenario</strong><p>${escapeHtml(question.caseScenario)}</p></div>` : ''}
              <h2>${escapeHtml(question.question)}</h2>
              ${question.imageUrl ? `<div class="question-image"><img src="${escapeAttribute(question.imageUrl)}" alt="Question visual" loading="lazy"></div>` : ''}
              <div class="options">
                ${question.options.map(option => {
                  const revealedClass = currentStudy.revealed && option === question.correctAnswer ? 'correct' : '';
                  return `<div class="option ${revealedClass}"><strong>•</strong><span>${escapeHtml(option)}</span></div>`;
                }).join('')}
              </div>
              ${currentStudy.revealed ? `
                <div class="answer-panel">
                  <p><strong>Correct Answer:</strong> ${escapeHtml(question.correctAnswer)}</p>
                  <p><strong>Explanation:</strong> ${escapeHtml(question.explanation)}</p>
                </div>
              ` : ''}
            </div>
          </article>

          <aside class="sidebar-stack">
            <article class="card">
              <h3>Study Controls</h3>
              <div style="display:grid; gap:10px; margin-top:16px;">
                <button class="primary-btn" ${currentStudy.revealed ? 'disabled' : ''} data-study-action="reveal" data-subject-id="${subjectId}" data-topic-id="${topicId}">Reveal Answer</button>
                <button class="ghost-btn" ${currentStudy.index === 0 ? 'disabled' : ''} data-study-action="prev" data-subject-id="${subjectId}" data-topic-id="${topicId}">Previous Question</button>
                <button class="secondary-btn" ${currentStudy.index >= questions.length - 1 ? 'disabled' : ''} data-study-action="next" data-subject-id="${subjectId}" data-topic-id="${topicId}">Next Question</button>
                <button class="ghost-btn" data-goto="topic" data-subject-id="${subjectId}" data-topic-id="${topicId}">Back to Topic</button>
              </div>
            </article>
            <article class="card">
              <h3>Topic Breakdown</h3>
              <div class="progress-list">${renderProgressBreakdown(questions)}</div>
            </article>
          </aside>
        </div>
      </section>
    `;
  }

  function renderFinalExamBuilder() {
    const subjectsOptions = state.subjects.map(subject => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join('');
    app.innerHTML = `
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>Final Exam</h2>
              <p>Two modes only: multiple-subject final or single-subject final with topic checkboxes.</p>
            </div>
          </div>
          <article class="card exam-builder">
            <div class="form-grid">
              <div>
                <label class="helper">Mode</label>
                <select class="select" id="examMode">
                  <option value="multiple">Multiple Subjects Final</option>
                  <option value="single">Single Subject Final</option>
                </select>
              </div>
              <div>
                <label class="helper">Subject</label>
                <select class="select" id="examSubject">
                  <option value="all">All Subjects</option>
                  ${subjectsOptions}
                </select>
              </div>
              <div>
                <label class="helper">Difficulty</label>
                <select class="select" id="examDifficulty">
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label class="helper">Number of Questions</label>
                <input class="input" id="examCount" type="number" min="1" max="100" value="10" />
              </div>
              <div>
                <label class="helper">Time Limit (minutes)</label>
                <input class="input" id="examTime" type="number" min="1" max="180" value="20" />
              </div>
              <div id="topicSelectionContainer" class="full"></div>
            </div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="secondary-btn" type="button" id="buildExamBtn">Start Final Exam</button>
              <button class="ghost-btn" type="button" id="refreshTopicsBtn">Refresh Topic Selection</button>
            </div>
            <div class="hint-box">
              <strong>Important:</strong> this final exam works from the topic question pools only. Question Bank and Quiz systems are intentionally removed.
            </div>
          </article>
        </div>
      </section>
    `;
    updateExamTopicSelection();
    document.getElementById('examMode').addEventListener('change', updateExamTopicSelection);
    document.getElementById('examSubject').addEventListener('change', updateExamTopicSelection);
    document.getElementById('refreshTopicsBtn').addEventListener('click', updateExamTopicSelection);
    document.getElementById('buildExamBtn').addEventListener('click', startExamFromBuilder);
  }

  function updateExamTopicSelection() {
    const mode = document.getElementById('examMode').value;
    const subjectId = document.getElementById('examSubject').value;
    const container = document.getElementById('topicSelectionContainer');
    if (mode !== 'single') {
      container.innerHTML = '<div class="hint-box">Multiple-subject mode does not require topic checkboxes.</div>';
      return;
    }
    const subject = getSubject(subjectId);
    if (!subject) {
      container.innerHTML = '<div class="notice error">Please choose one subject to enable topic selection.</div>';
      return;
    }
    container.innerHTML = `
      <label class="helper">Select Topics</label>
      <div class="checkbox-grid">
        ${subject.topics.map(topic => `
          <label class="checkbox-item">
            <input type="checkbox" name="examTopic" value="${topic.id}" checked>
            <span>
              <strong>${escapeHtml(topic.name)}</strong><br>
              <small>${getQuestionsByFile(topic.file).length} questions</small>
            </span>
          </label>
        `).join('')}
      </div>
    `;
  }

  function startExamFromBuilder() {
    const mode = document.getElementById('examMode').value;
    const subjectId = document.getElementById('examSubject').value;
    const difficulty = document.getElementById('examDifficulty').value;
    const count = Math.max(1, Number(document.getElementById('examCount').value || 10));
    const timeLimit = Math.max(1, Number(document.getElementById('examTime').value || 20));

    let pool = [];

    if (mode === 'multiple') {
      const subjects = subjectId === 'all' ? state.subjects : state.subjects.filter(s => s.id === subjectId);
      subjects.forEach(subject => subject.topics.forEach(topic => {
        pool.push(...getQuestionsByFile(topic.file));
      }));
    } else {
      const subject = getSubject(subjectId);
      if (!subject) return alert('Please choose one subject for single-subject final exam.');
      const selectedTopics = Array.from(document.querySelectorAll('input[name="examTopic"]:checked')).map(el => el.value);
      if (!selectedTopics.length) return alert('Select at least one topic.');
      subject.topics.filter(topic => selectedTopics.includes(topic.id)).forEach(topic => {
        pool.push(...getQuestionsByFile(topic.file));
      });
    }

    if (difficulty !== 'all') pool = pool.filter(question => question.difficulty === difficulty);
    if (!pool.length) return alert('No questions match your exam settings.');

    const selectedQuestions = shuffle(pool).slice(0, Math.min(count, pool.length));
    currentExam = {
      id: `exam-${Date.now()}`,
      mode,
      subjectId,
      difficulty,
      timeLimit,
      questions: selectedQuestions,
      answers: {},
      index: 0,
      startedAt: Date.now(),
      endsAt: Date.now() + timeLimit * 60 * 1000,
      finished: false,
      score: null,
      timerHandle: null
    };
    go('exam-session');
  }

  function renderExamSession() {
    if (!currentExam || !currentExam.questions.length) {
      return renderNotFound('No active exam found. Build a final exam first.');
    }

    if (currentExam.finished) {
      return renderExamResults();
    }

    const question = currentExam.questions[currentExam.index];
    const progress = ((currentExam.index + 1) / currentExam.questions.length) * 100;
    const selectedAnswer = currentExam.answers[question.id] || '';

    app.innerHTML = `
      <section class="page">
        <div class="container exam-layout">
          <article class="card exam-question">
            <div class="question-meta">
              <span class="pill">Final Exam</span>
              <span class="pill gold">${escapeHtml(question.difficulty)}</span>
              <span class="pill">Question ${currentExam.index + 1} of ${currentExam.questions.length}</span>
            </div>
            <div style="margin:16px 0 22px;">
              <div class="progress-bar"><span style="width:${progress}%"></span></div>
            </div>
            ${question.caseScenario ? `<div class="answer-panel"><strong>Case Scenario</strong><p>${escapeHtml(question.caseScenario)}</p></div>` : ''}
            <h2>${escapeHtml(question.question)}</h2>
            ${question.imageUrl ? `<div class="question-image"><img src="${escapeAttribute(question.imageUrl)}" alt="Question visual" loading="lazy"></div>` : ''}
            <div class="options">
              ${question.options.map(option => `
                <label class="option ${selectedAnswer === option ? 'selected' : ''}">
                  <input type="radio" name="examAnswer" value="${escapeAttribute(option)}" ${selectedAnswer === option ? 'checked' : ''}>
                  <span>${escapeHtml(option)}</span>
                </label>
              `).join('')}
            </div>
          </article>
          <aside class="sidebar-stack">
            <article class="card">
              <h3>Exam Controls</h3>
              <p id="examTimerText">Time remaining: ${formatRemainingTime(currentExam.endsAt - Date.now())}</p>
              <div style="display:grid; gap:10px; margin-top:16px;">
                <button class="ghost-btn" ${currentExam.index === 0 ? 'disabled' : ''} data-exam-action="prev">Previous</button>
                <button class="secondary-btn" ${currentExam.index >= currentExam.questions.length - 1 ? 'disabled' : ''} data-exam-action="next">Next</button>
                <button class="primary-btn" data-exam-action="submit">Submit Exam</button>
              </div>
            </article>
            <article class="card">
              <h3>Overview</h3>
              <div class="progress-list">
                <div class="progress-item"><span>Answered</span><div class="bar"><span style="width:${Object.keys(currentExam.answers).length / currentExam.questions.length * 100}%"></span></div></div>
                <div class="progress-item"><span>Remaining</span><div class="bar"><span style="width:${100 - (Object.keys(currentExam.answers).length / currentExam.questions.length * 100)}%"></span></div></div>
              </div>
            </article>
          </aside>
        </div>
      </section>
    `;

    document.querySelectorAll('input[name="examAnswer"]').forEach(input => {
      input.addEventListener('change', event => {
        currentExam.answers[question.id] = event.target.value;
        renderExamSession();
      });
    });
    startExamTimer();
  }

  function startExamTimer() {
    stopExamTimer();
    currentExam.timerHandle = setInterval(() => {
      const remaining = currentExam.endsAt - Date.now();
      const timerNode = document.getElementById('examTimerText');
      if (timerNode) timerNode.textContent = `Time remaining: ${formatRemainingTime(remaining)}`;
      if (remaining <= 0) {
        stopExamTimer();
        finishExam();
      }
    }, 1000);
  }

  function stopExamTimer() {
    if (currentExam && currentExam.timerHandle) {
      clearInterval(currentExam.timerHandle);
      currentExam.timerHandle = null;
    }
  }

  function finishExam() {
    if (!currentExam) return;
    stopExamTimer();
    const correct = currentExam.questions.filter(question => currentExam.answers[question.id] === question.correctAnswer).length;
    const percentage = Math.round((correct / currentExam.questions.length) * 100);
    currentExam.finished = true;
    currentExam.score = percentage;
    tracking.finalExams.unshift({
      id: currentExam.id,
      date: new Date().toISOString(),
      mode: currentExam.mode,
      total: currentExam.questions.length,
      correct,
      score: percentage
    });
    tracking.finalExams = tracking.finalExams.slice(0, 25);
    saveTracking();
    renderExamResults();
  }

  function renderExamResults() {
    const exam = currentExam;
    if (!exam) return renderNotFound('No exam result available.');
    const correct = exam.questions.filter(question => exam.answers[question.id] === question.correctAnswer).length;
    app.innerHTML = `
      <section class="page">
        <div class="container">
          <div class="page-head">
            <div>
              <h2>Final Exam Results</h2>
              <p>Score: ${exam.score}% • ${correct}/${exam.questions.length} correct</p>
            </div>
            <button class="secondary-btn" data-goto="final-exam">Build Another Exam</button>
          </div>
          <div class="kv">
            <article class="card"><strong>${exam.score}%</strong><span>Score Percentage</span></article>
            <article class="card"><strong>${correct}</strong><span>Correct Answers</span></article>
          </div>
          <div class="grid" style="margin-top:18px;">
            ${exam.questions.map((question, index) => {
              const isCorrect = exam.answers[question.id] === question.correctAnswer;
              return `
                <article class="card">
                  <div class="question-meta">
                    <span class="pill">Q${index + 1}</span>
                    <span class="pill ${isCorrect ? 'success' : 'danger'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </div>
                  <h3>${escapeHtml(question.question)}</h3>
                  <p><strong>Your answer:</strong> ${escapeHtml(exam.answers[question.id] || 'Not answered')}</p>
                  <p><strong>Correct answer:</strong> ${escapeHtml(question.correctAnswer)}</p>
                  <p><strong>Explanation:</strong> ${escapeHtml(question.explanation)}</p>
                </article>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderDashboard() {
    const metrics = getDashboardMetrics();
    app.innerHTML = `
      <section class="page">
        <div class="container dashboard-layout">
          <div class="page-head">
            <div>
              <h2>Student Dashboard</h2>
              <p>Tracked locally with localStorage only.</p>
            </div>
          </div>

          <div class="grid metric-grid">
            <article class="card metric-card"><h3>${metrics.overallSuccessRate}%</h3><p>Overall Success Rate</p></article>
            <article class="card metric-card"><h3>${metrics.totalSolvedQuestions}</h3><p>Total Solved Questions</p></article>
            <article class="card metric-card"><h3>${metrics.totalStudySessions}</h3><p>Total Study Sessions</p></article>
            <article class="card metric-card"><h3>${metrics.finalExamsCompleted}</h3><p>Final Exams Completed</p></article>
          </div>

          <div class="grid" style="grid-template-columns: 1.1fr .9fr; gap: 20px;">
            <article class="card">
              <h3>Subject Progress</h3>
              <div class="progress-list">${renderSubjectProgress(metrics.subjectProgress)}</div>
            </article>
            <article class="card">
              <h3>Recommendation</h3>
              <p>${escapeHtml(metrics.recommendation)}</p>
              <div class="notice">Based on weak or less-visited areas.</div>
            </article>
          </div>

          <div class="grid" style="grid-template-columns: 1fr 1fr; gap:20px;">
            <article class="card">
              <h3>Strength Areas</h3>
              ${renderSimpleList(metrics.strengthAreas, 'No strong areas yet.')}
            </article>
            <article class="card">
              <h3>Weak Areas</h3>
              ${renderSimpleList(metrics.weakAreas, 'No weak areas yet.')}
            </article>
          </div>

          <article class="card">
            <h3>Recent Activity</h3>
            ${renderRecentActivity(metrics.recentActivity)}
          </article>

          <article class="card">
            <h3>Achievements</h3>
            <div class="grid badge-grid">${metrics.achievements.map(item => `
              <div class="achievement-card card">
                <span class="pill gold">Badge</span>
                <strong>${escapeHtml(item.title)}</strong>
                <p class="muted">${escapeHtml(item.description)}</p>
              </div>
            `).join('')}</div>
          </article>
        </div>
      </section>
    `;
  }

  function getDashboardMetrics() {
    const revealEntries = Object.values(tracking.questionReveals);
    const totalSolvedQuestions = revealEntries.length;
    const correctCount = revealEntries.filter(item => item.correct !== false).length;
    const overallSuccessRate = totalSolvedQuestions ? Math.round((correctCount / totalSolvedQuestions) * 100) : 0;
    const totalStudySessions = tracking.studySessions.length;
    const finalExamsCompleted = tracking.finalExams.length;

    const subjectProgress = state.subjects.map(subject => {
      const totalQuestions = subject.topics.reduce((sum, topic) => sum + getQuestionsByFile(topic.file).length, 0);
      const solvedForSubject = revealEntries.filter(item => item.subjectId === subject.id).length;
      return {
        subjectName: subject.name,
        percentage: totalQuestions ? Math.min(100, Math.round((solvedForSubject / totalQuestions) * 100)) : 0
      };
    });

    const topicStats = [];
    state.subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        const questions = getQuestionsByFile(topic.file);
        const reveals = revealEntries.filter(entry => entry.topicId === topic.id);
        const score = reveals.length ? Math.round((reveals.filter(entry => entry.correct !== false).length / reveals.length) * 100) : 0;
        const visits = tracking.topicVisits[`${subject.id}:${topic.id}`] || 0;
        topicStats.push({ name: topic.name, score, visits, questionCount: questions.length, subjectName: subject.name });
      });
    });

    const strengthAreas = topicStats.filter(item => item.score >= 80).sort((a, b) => b.score - a.score).slice(0, 3).map(item => `${item.name} (${item.score}%)`);
    const weakAreas = topicStats.filter(item => (item.visits > 0 && item.score < 60) || (item.visits === 0 && item.questionCount > 0)).sort((a, b) => a.score - b.score).slice(0, 3).map(item => `${item.name} (${item.score || 0}%)`);

    const recommendationSource = weakAreas[0] || topicStats.sort((a, b) => (a.visits || 0) - (b.visits || 0))[0];
    const recommendation = typeof recommendationSource === 'string'
      ? `Review ${recommendationSource.split(' (')[0]} next.`
      : recommendationSource
        ? `Review ${recommendationSource.name} from ${recommendationSource.subjectName}.`
        : 'Start studying a topic to generate recommendations.';

    const recentActivity = tracking.studySessions.slice(0, 5);
    const achievements = buildAchievements();

    return { overallSuccessRate, totalSolvedQuestions, totalStudySessions, finalExamsCompleted, subjectProgress, strengthAreas, weakAreas, recentActivity, recommendation, achievements };
  }

  function buildAchievements() {
    const achievements = [];
    const pharmacologyQuestions = Object.values(tracking.questionReveals).filter(item => item.subjectId === 'pharmacology').length;
    if (pharmacologyQuestions >= 100) achievements.push({ title: 'Solved 100 Pharmacology Questions', description: 'Strong repetition in Pharmacology.' });
    if (tracking.studySessions.length >= 5) achievements.push({ title: 'Completed 5 Study Sessions', description: 'You are building consistent study momentum.' });
    const clinicalProgress = getDashboardMetricsLite().find(item => item.subjectId === 'clinical-pharmacy');
    if (clinicalProgress && clinicalProgress.percentage >= 80) achievements.push({ title: 'Achieved 80%+ in Clinical Pharmacy', description: 'Excellent progress in Clinical Pharmacy.' });
    if (!achievements.length) achievements.push({ title: 'Getting Started', description: 'Complete a few study sessions to unlock more badges.' });
    return achievements;
  }

  function getDashboardMetricsLite() {
    const revealEntries = Object.values(tracking.questionReveals);
    return state.subjects.map(subject => {
      const totalQuestions = subject.topics.reduce((sum, topic) => sum + getQuestionsByFile(topic.file).length, 0);
      const solvedForSubject = revealEntries.filter(item => item.subjectId === subject.id).length;
      return { subjectId: subject.id, percentage: totalQuestions ? Math.min(100, Math.round((solvedForSubject / totalQuestions) * 100)) : 0 };
    });
  }

  function renderSubjectProgress(items) {
    return items.map(item => `
      <div class="progress-item">
        <div style="display:flex; justify-content:space-between; gap:12px;"><span>${escapeHtml(item.subjectName)} Progress</span><strong>${item.percentage}%</strong></div>
        <div class="bar"><span style="width:${item.percentage}%"></span></div>
      </div>
    `).join('');
  }

  function renderSimpleList(items, fallback) {
    if (!items.length) return `<p class="muted">${escapeHtml(fallback)}</p>`;
    return `<div class="progress-list">${items.map(item => `<div class="pill">${escapeHtml(item)}</div>`).join('')}</div>`;
  }

  function renderRecentActivity(items) {
    if (!items.length) return '<p class="muted">No recent study activity yet.</p>';
    return `<div class="grid activity-list">${items.map(item => `
      <article class="activity-card card">
        <div class="activity-meta">
          <span class="pill">${escapeHtml(item.topicName)}</span>
          <span class="pill gold">${escapeHtml(item.subjectName)}</span>
        </div>
        <strong>${item.questionsReviewed} questions reviewed</strong>
        <p class="muted">${formatDate(item.date)}</p>
      </article>
    `).join('')}</div>`;
  }

  function renderProgressBreakdown(questions) {
    const breakdown = getDifficultyBreakdown(questions);
    const total = Math.max(questions.length, 1);
    return ['easy', 'medium', 'hard'].map(level => `
      <div class="progress-item">
        <div style="display:flex; justify-content:space-between;"><span>${capitalize(level)}</span><strong>${breakdown[level]}</strong></div>
        <div class="bar"><span style="width:${breakdown[level] / total * 100}%"></span></div>
      </div>
    `).join('');
  }

  function renderNotFound(message) {
    app.innerHTML = `
      <section class="page">
        <div class="container">
          <article class="card empty-state">
            <h2>Oops</h2>
            <p>${escapeHtml(message)}</p>
            <button class="secondary-btn" data-goto="home">Go Home</button>
          </article>
        </div>
      </section>
    `;
  }

  function handleDelegatedClicks(event) {
    const target = event.target.closest('[data-goto], [data-filter-subjects], [data-filter-topics], [data-study-action], [data-exam-action], [data-route], .brand');
    if (!target) return;

    if (target.matches('[data-route], .brand')) {
      const route = target.dataset.route || 'home';
      go(route);
      return;
    }

    if (target.hasAttribute('data-goto')) {
      const route = target.getAttribute('data-goto');
      if (route === 'subject') return go('subject', { id: target.dataset.subjectId });
      if (route === 'topic') return go('topic', { subject: target.dataset.subjectId, topic: target.dataset.topicId });
      if (route === 'study') return go('study', { subject: target.dataset.subjectId, topic: target.dataset.topicId });
      return go(route);
    }

    if (target.hasAttribute('data-filter-subjects')) {
      const value = document.getElementById('subjectSearch').value.trim().toLowerCase();
      const filtered = state.subjects.filter(subject => subject.name.toLowerCase().includes(value));
      document.getElementById('subjectResults').innerHTML = renderSubjectCards(filtered);
      return;
    }

    if (target.hasAttribute('data-filter-topics')) {
      const subject = getSubject(target.dataset.subjectId);
      if (!subject) return;
      const value = document.getElementById('topicSearch').value.trim().toLowerCase();
      const filtered = subject.topics.filter(topic => topic.name.toLowerCase().includes(value));
      document.getElementById('topicResults').innerHTML = renderTopicCards(subject, filtered);
      return;
    }

    if (target.hasAttribute('data-study-action')) {
      const action = target.dataset.studyAction;
      const subjectId = target.dataset.subjectId;
      const topicId = target.dataset.topicId;
      const topic = getTopic(subjectId, topicId);
      if (!topic) return;
      const questions = getQuestionsByFile(topic.file);
      if (action === 'reveal') {
        currentStudy.revealed = true;
        recordReveal(subjectId, topicId, questions[currentStudy.index], true);
      }
      if (action === 'prev' && currentStudy.index > 0) {
        currentStudy.index -= 1;
        currentStudy.revealed = false;
      }
      if (action === 'next' && currentStudy.index < questions.length - 1) {
        recordStudySession(subjectId, topicId, topic.name, getSubject(subjectId).name, 1);
        currentStudy.index += 1;
        currentStudy.revealed = false;
      }
      renderStudyPage(subjectId, topicId);
      return;
    }

    if (target.hasAttribute('data-exam-action')) {
      if (!currentExam) return;
      if (target.dataset.examAction === 'prev' && currentExam.index > 0) currentExam.index -= 1;
      if (target.dataset.examAction === 'next' && currentExam.index < currentExam.questions.length - 1) currentExam.index += 1;
      if (target.dataset.examAction === 'submit') finishExam();
      if (!currentExam.finished) renderExamSession();
    }
  }

  function handleDelegatedSubmit(event) {
    const form = event.target;
    if (!form.matches('[data-admin-form]')) return;
    event.preventDefault();
    const type = form.dataset.adminForm;

    if (type === 'settings') return saveGithubSettings(form);
    if (type === 'subject') return addSubject(form);
    if (type === 'topic') return addTopic(form);
    if (type === 'question') return addQuestion(form);
  }

  function handleKeyboardShortcuts(event) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      openAdminPanel();
    }
    if (event.key === 'Escape' && adminDialog.open) {
      adminDialog.close();
    }
  }

  function openAdminPanel() {
    adminDialog.showModal();
    renderAdminPanel();
  }

  function renderAdminPanel() {
    adminRoot.innerHTML = `
      <div class="admin-tabs">
        <button class="small-btn ${adminTab === 'settings' ? 'active' : ''}" data-admin-tab="settings">GitHub Settings</button>
        <button class="small-btn ${adminTab === 'subject' ? 'active' : ''}" data-admin-tab="subject">Subjects</button>
        <button class="small-btn ${adminTab === 'topic' ? 'active' : ''}" data-admin-tab="topic">Topics</button>
        <button class="small-btn ${adminTab === 'question' ? 'active' : ''}" data-admin-tab="question">Questions</button>
        <button class="small-btn ${adminTab === 'sync' ? 'active' : ''}" data-admin-tab="sync">Sync JSON</button>
      </div>
      <div id="adminContent">${renderAdminTab()}</div>
    `;
    adminRoot.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        adminTab = btn.dataset.adminTab;
        renderAdminPanel();
      });
    });
    const syncBtn = adminRoot.querySelector('#syncGithubBtn');
    if (syncBtn) syncBtn.addEventListener('click', syncAllDataToGithub);
  }

  function renderAdminTab() {
    if (adminTab === 'settings') return `
      <form data-admin-form="settings" class="admin-stack">
        <div class="form-grid">
          <div><label class="helper">GitHub Owner</label><input class="input" name="owner" value="${escapeAttribute(state.github.owner)}" required></div>
          <div><label class="helper">Repository Name</label><input class="input" name="repo" value="${escapeAttribute(state.github.repo)}" required></div>
          <div><label class="helper">Branch</label><input class="input" name="branch" value="${escapeAttribute(state.github.branch || 'main')}" required></div>
          <div><label class="helper">Personal Access Token (Classic)</label><input class="input" name="token" value="${escapeAttribute(state.github.token)}" required></div>
        </div>
        <div class="hint-box">These values are stored locally in localStorage and used for GitHub API PUT requests.</div>
        <button class="secondary-btn" type="submit">Save Settings</button>
      </form>
    `;
    if (adminTab === 'subject') return `
      <form data-admin-form="subject" class="admin-stack">
        <div class="form-grid">
          <div class="full"><label class="helper">Subject Name</label><input class="input" name="subjectName" placeholder="e.g. Pharmacology" required></div>
        </div>
        <button class="secondary-btn" type="submit">Add Subject</button>
      </form>
      <div class="grid topic-grid" style="margin-top:18px;">
        ${state.subjects.map(subject => `<div class="card"><strong>${escapeHtml(subject.name)}</strong><p class="muted">ID: ${subject.id}</p></div>`).join('')}
      </div>
    `;
    if (adminTab === 'topic') return `
      <form data-admin-form="topic" class="admin-stack">
        <div class="form-grid">
          <div><label class="helper">Subject</label>${subjectSelect('subjectId')}</div>
          <div><label class="helper">Topic Name</label><input class="input" name="topicName" placeholder="e.g. Sedatives & Hypnotics" required></div>
        </div>
        <button class="secondary-btn" type="submit">Add Topic</button>
      </form>
    `;
    if (adminTab === 'question') return `
      <form data-admin-form="question" class="admin-stack">
        <div class="form-grid">
          <div><label class="helper">Subject</label>${subjectSelect('subjectId', 'adminSubjectSelect')}</div>
          <div><label class="helper">Topic</label>${topicSelect('topicId', 'adminTopicSelect')}</div>
          <div><label class="helper">Question Type</label>
            <select class="select" name="type">
              <option value="mcq">MCQ</option>
              <option value="true-false">True / False</option>
              <option value="image-question">Image Question</option>
              <option value="clinical-case">Clinical Case Question</option>
            </select>
          </div>
          <div><label class="helper">Difficulty</label>
            <select class="select" name="difficulty">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div class="full"><label class="helper">Question Text</label><textarea class="textarea" name="question" required></textarea></div>
          <div class="full"><label class="helper">Options (one per line)</label><textarea class="textarea" name="options" required></textarea></div>
          <div><label class="helper">Correct Answer</label><input class="input" name="correctAnswer" required></div>
          <div><label class="helper">Image URL (optional)</label><input class="input" name="imageUrl"></div>
          <div class="full"><label class="helper">Explanation</label><textarea class="textarea" name="explanation" required></textarea></div>
          <div class="full"><label class="helper">Case Scenario (optional)</label><textarea class="textarea" name="caseScenario"></textarea></div>
        </div>
        <button class="secondary-btn" type="submit">Add Question</button>
      </form>
    `;
    if (adminTab === 'sync') return `
      <div class="admin-stack">
        <div class="hint-box">
          <strong>What will be synced</strong>
          <ul>
            <li>data/index.json</li>
            <li>One JSON file per topic inside each subject folder</li>
          </ul>
          <p class="muted">This uses GitHub API PUT requests and keeps your repository structure lightweight.</p>
        </div>
        <button class="secondary-btn" id="syncGithubBtn" type="button">Sync All JSON Files to GitHub</button>
        <div id="syncNotice"></div>
      </div>
    `;
    return '';
  }

  function saveGithubSettings(form) {
    const formData = new FormData(form);
    state.github.owner = String(formData.get('owner') || '').trim();
    state.github.repo = String(formData.get('repo') || '').trim();
    state.github.branch = String(formData.get('branch') || 'main').trim();
    state.github.token = String(formData.get('token') || '').trim();
    saveState();
    alert('GitHub settings saved locally.');
  }

  function addSubject(form) {
    const formData = new FormData(form);
    const name = String(formData.get('subjectName') || '').trim();
    if (!name) return;
    const id = slugify(name);
    if (state.subjects.some(subject => subject.id === id)) return alert('Subject already exists.');
    state.subjects.push({ id, name, topics: [] });
    saveState();
    form.reset();
    renderAdminPanel();
    render();
  }

  function addTopic(form) {
    const formData = new FormData(form);
    const subjectId = String(formData.get('subjectId') || '').trim();
    const topicName = String(formData.get('topicName') || '').trim();
    const subject = getSubject(subjectId);
    if (!subject || !topicName) return;
    const topicId = slugify(topicName);
    if (subject.topics.some(topic => topic.id === topicId)) return alert('Topic already exists in this subject.');
    const file = `data/${subject.id}/${topicId}.json`;
    subject.topics.push({ id: topicId, name: topicName, file, questionCount: 0 });
    state.topicQuestions[file] = { questions: [] };
    saveState();
    form.reset();
    renderAdminPanel();
    render();
  }

  function addQuestion(form) {
    const formData = new FormData(form);
    const subjectId = String(formData.get('subjectId') || '').trim();
    const topicId = String(formData.get('topicId') || '').trim();
    const topic = getTopic(subjectId, topicId);
    const subject = getSubject(subjectId);
    if (!topic || !subject) return alert('Choose a valid subject and topic.');

    const options = String(formData.get('options') || '').split('\n').map(item => item.trim()).filter(Boolean);
    const type = String(formData.get('type') || 'mcq');
    if (type === 'true-false' && !options.length) options.push('True', 'False');
    if (!options.length) return alert('Please add options.');

    const nextId = `${subjectId.slice(0, 4)}-${topicId.slice(0, 6)}-${String(getQuestionsByFile(topic.file).length + 1).padStart(3, '0')}`;
    const question = {
      id: nextId,
      type,
      subject: subjectId,
      topic: topicId,
      question: String(formData.get('question') || '').trim(),
      options,
      correctAnswer: String(formData.get('correctAnswer') || '').trim(),
      explanation: String(formData.get('explanation') || '').trim(),
      difficulty: String(formData.get('difficulty') || 'easy').trim(),
      caseScenario: String(formData.get('caseScenario') || '').trim(),
      imageUrl: String(formData.get('imageUrl') || '').trim()
    };

    state.topicQuestions[topic.file] = state.topicQuestions[topic.file] || { questions: [] };
    state.topicQuestions[topic.file].questions.push(question);
    topic.questionCount = state.topicQuestions[topic.file].questions.length;
    saveState();
    form.reset();
    renderAdminPanel();
    render();
  }

  async function syncAllDataToGithub() {
    const notice = document.getElementById('syncNotice');
    if (notice) notice.innerHTML = '<div class="notice">Sync in progress...</div>';
    try {
      validateGithubSettings();
      const indexPayload = buildIndexJson();
      await putGithubFile('data/index.json', indexPayload, 'Update Pharmacy Nexus index.json');
      for (const subject of state.subjects) {
        for (const topic of subject.topics) {
          const payload = state.topicQuestions[topic.file] || { questions: [] };
          await putGithubFile(topic.file, payload, `Update ${topic.file}`);
        }
      }
      if (notice) notice.innerHTML = '<div class="notice success">All JSON files synced successfully to GitHub.</div>';
    } catch (error) {
      if (notice) notice.innerHTML = `<div class="notice error">${escapeHtml(error.message)}</div>`;
    }
  }

  function buildIndexJson() {
    return {
      subjects: state.subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        topics: subject.topics.map(topic => ({
          id: topic.id,
          name: topic.name,
          file: topic.file,
          questionCount: getQuestionsByFile(topic.file).length
        }))
      }))
    };
  }

  function validateGithubSettings() {
    if (!state.github.owner || !state.github.repo || !state.github.branch || !state.github.token) {
      throw new Error('Missing GitHub owner, repo, branch, or PAT in Admin Settings.');
    }
  }

  async function putGithubFile(path, contentObject, message) {
    const owner = state.github.owner;
    const repo = state.github.repo;
    const branch = state.github.branch;
    const token = state.github.token;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const bodyText = JSON.stringify(contentObject, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(bodyText)));

    let sha = undefined;
    const existing = await fetch(url + `?ref=${encodeURIComponent(branch)}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (existing.ok) {
      const existingJson = await existing.json();
      sha = existingJson.sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`
      },
      body: JSON.stringify({ message, content: encoded, branch, sha })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error for ${path}: ${errorText}`);
    }
    return response.json();
  }

  function getSubject(subjectId) {
    return state.subjects.find(subject => subject.id === subjectId);
  }

  function getTopic(subjectId, topicId) {
    const subject = getSubject(subjectId);
    if (!subject) return null;
    return subject.topics.find(topic => topic.id === topicId) || null;
  }

  function getQuestionsByFile(file) {
    return (state.topicQuestions[file] && state.topicQuestions[file].questions) || [];
  }

  function getAllQuestions() {
    return Object.values(state.topicQuestions).flatMap(item => item.questions || []);
  }

  function getDifficultyBreakdown(questions) {
    return questions.reduce((acc, question) => {
      const level = ['easy', 'medium', 'hard'].includes(question.difficulty) ? question.difficulty : 'easy';
      acc[level] += 1;
      return acc;
    }, { easy: 0, medium: 0, hard: 0 });
  }

  function recordReveal(subjectId, topicId, question, assumedCorrect) {
    tracking.questionReveals[question.id] = {
      subjectId,
      topicId,
      correct: assumedCorrect,
      date: new Date().toISOString()
    };
    saveTracking();
  }

  function recordStudySession(subjectId, topicId, topicName, subjectName, questionsReviewed) {
    tracking.studySessions.unshift({
      subjectId, topicId, topicName, subjectName, questionsReviewed,
      date: new Date().toISOString()
    });
    tracking.studySessions = tracking.studySessions.slice(0, 20);
    saveTracking();
  }

  function recordTopicVisit(subjectId, topicId) {
    const key = `${subjectId}:${topicId}`;
    tracking.topicVisits[key] = (tracking.topicVisits[key] || 0) + 1;
    saveTracking();
  }

  function slugify(value) {
    return value.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatDate(value) {
    return new Date(value).toLocaleString();
  }

  function formatRemainingTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function subjectSelect(name, id) {
    return `<select class="select" name="${name}" ${id ? `id="${id}"` : ''}>${state.subjects.map(subject => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join('')}</select>`;
  }

  function topicSelect(name, id) {
    const firstSubject = state.subjects[0];
    const topics = firstSubject ? firstSubject.topics : [];
    return `<select class="select" name="${name}" ${id ? `id="${id}"` : ''}>${topics.map(topic => `<option value="${topic.id}">${escapeHtml(topic.name)}</option>`).join('')}</select>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  adminRoot.addEventListener('change', event => {
    if (event.target && event.target.name === 'subjectId' && adminTab === 'question') {
      const topicSelectNode = adminRoot.querySelector('select[name="topicId"]');
      const subject = getSubject(event.target.value);
      if (!topicSelectNode || !subject) return;
      topicSelectNode.innerHTML = subject.topics.map(topic => `<option value="${topic.id}">${escapeHtml(topic.name)}</option>`).join('');
    }
  });
})();
