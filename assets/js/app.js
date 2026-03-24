
const App = (() => {
  const STORAGE_KEYS = {
    github: 'pn_github_config',
    progress: 'pn_progress_v1',
    adminPassword: 'pn_admin_password_v1',
  };

  const state = {
    index: null,
    topicCache: new Map(),
    adminUnlocked: false,
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);

  const slugify = (value = '') => value.toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const uniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function showMainError(message) {
    const root = document.querySelector('main');
    if (root) root.insertAdjacentHTML('afterbegin', `<div class="container"><div class="empty-state">${escapeHtml(message)}</div></div>`);
  }

  function getProgress() {
    return readStorage(STORAGE_KEYS.progress, {
      studyHistory: [],
      examHistory: [],
      questionStats: {},
      topicCompletion: {},
      savedBank: {},
      savedNotes: {},
    });
  }

  function saveProgress(progress) {
    writeStorage(STORAGE_KEYS.progress, progress);
  }

  function isQuestionSaved(questionId) {
    const progress = getProgress();
    return !!progress.savedBank?.[questionId];
  }

  function toggleQuestionSaved(question) {
    const progress = getProgress();
    progress.savedBank = progress.savedBank || {};
    if (progress.savedBank[question.id]) {
      delete progress.savedBank[question.id];
      saveProgress(progress);
      return false;
    }
    progress.savedBank[question.id] = {
      id: question.id,
      subject: question.subject,
      topic: question.topic,
      question: question.question,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      caseScenario: question.caseScenario || '',
      imageUrl: question.imageUrl || '',
    };
    saveProgress(progress);
    return true;
  }

  function getQuestionNote(questionId) {
    const progress = getProgress();
    return progress.savedNotes?.[questionId]?.note || '';
  }

  function setQuestionNote(question, note) {
    const progress = getProgress();
    progress.savedNotes = progress.savedNotes || {};
    const clean = String(note || '').trim();

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
        note: clean,
      };
    }

    saveProgress(progress);
    return clean;
  }

  function hasQuestionNote(questionId) {
    return !!getQuestionNote(questionId).trim();
  }


  function recordStudyEvent({ question, correct, revealed = true }) {
    const progress = getProgress();
    const entry = progress.questionStats[question.id] || {
      id: question.id,
      subject: question.subject,
      topic: question.topic,
      attempts: 0,
      correct: 0,
      reveals: 0,
      lastSeen: null,
    };
    entry.attempts += 1;
    if (correct) entry.correct += 1;
    if (revealed) entry.reveals += 1;
    entry.lastSeen = new Date().toISOString();
    progress.questionStats[question.id] = entry;
    saveProgress(progress);
  }

  function recordStudySession(session) {
    const progress = getProgress();
    progress.studyHistory.unshift({ id: uniqueId('study'), ...session });
    progress.studyHistory = progress.studyHistory.slice(0, 50);
    const key = `${session.subject}|${session.topic}`;
    progress.topicCompletion[key] = {
      subject: session.subject,
      topic: session.topic,
      percent: session.percent,
      completedQuestions: session.completedQuestions,
      totalQuestions: session.totalQuestions,
      updatedAt: new Date().toISOString(),
    };
    saveProgress(progress);
  }

  function recordExamSession(session) {
    const progress = getProgress();
    progress.examHistory.unshift({ id: uniqueId('exam'), ...session });
    progress.examHistory = progress.examHistory.slice(0, 50);
    saveProgress(progress);
  }

  async function loadIndex(force = false) {
    if (state.index && !force) return state.index;
    const response = await fetch('data/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data/index.json');
    state.index = await response.json();
    return state.index;
  }

  async function loadTopicFile(path, force = false) {
    if (state.topicCache.has(path) && !force) return state.topicCache.get(path);
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const data = await response.json();
    state.topicCache.set(path, data);
    return data;
  }

  function getSubject(subjectId) {
    return state.index?.subjects?.find((item) => item.id === subjectId) || null;
  }

  function getTopic(subjectId, topicId) {
    return getSubject(subjectId)?.topics?.find((item) => item.id === topicId) || null;
  }

  function getTopicByFilePath(path) {
    for (const subject of state.index?.subjects || []) {
      const match = subject.topics.find((topic) => topic.file === path);
      if (match) return { subject, topic: match };
    }
    return null;
  }

  function renderSubjectsGrid(container, subjects) {
    if (!container) return;
    if (!subjects.length) {
      container.innerHTML = '<div class="empty-state">No subjects found.</div>';
      return;
    }
    container.innerHTML = subjects.map((subject) => `
      <article class="surface card">
        <div class="card-top">
          <div>
            <span class="badge">${subject.topics.length} Topics</span>
            <h3>${escapeHtml(subject.name)}</h3>
          </div>
        </div>
        <p class="text-muted">Organized study topics for ${escapeHtml(subject.name)}.</p>
        <a class="btn btn-primary" href="topics.html?subject=${encodeURIComponent(subject.id)}">Open Topics</a>
      </article>
    `).join('');
  }

  function renderTopicCards(container, subject, topics) {
    if (!container) return;
    if (!topics.length) {
      container.innerHTML = '<div class="empty-state">No topics match your search.</div>';
      return;
    }
    container.innerHTML = topics.map((topic) => `
      <article class="surface card">
        <div class="card-top">
          <div>
            <span class="badge">${topic.questionCount} Questions</span>
            <h3>${escapeHtml(topic.name)}</h3>
          </div>
        </div>
        <p class="text-muted">Open this topic and start focused study.</p>
        <div class="question-actions">
          <a class="btn btn-primary" href="topic.html?subject=${encodeURIComponent(subject.id)}&topic=${encodeURIComponent(topic.id)}">Open Topic</a>
          <a class="btn btn-soft" href="study.html?subject=${encodeURIComponent(subject.id)}&topic=${encodeURIComponent(topic.id)}">Study</a>
        </div>
      </article>
    `).join('');
  }

  async function initHome() {
    const { subjects } = await loadIndex();
    const container = byId('subjectsGrid');
    renderSubjectsGrid(container, subjects);
    const search = byId('subjectSearch');
    if (search) {
      search.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();
        renderSubjectsGrid(container, subjects.filter((subject) => subject.name.toLowerCase().includes(value)));
      });
    }
    const subjectStat = qs('[data-stat="subjects"]');
    const topicStat = qs('[data-stat="topics"]');
    if (subjectStat) subjectStat.textContent = String(subjects.length);
    if (topicStat) topicStat.textContent = String(subjects.reduce((sum, subject) => sum + subject.topics.length, 0));
  }

  async function initSubjectsPage() {
    const { subjects } = await loadIndex();
    const container = byId('allSubjectsGrid');
    renderSubjectsGrid(container, subjects);
    const search = byId('subjectsPageSearch');
    if (search) {
      search.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();
        renderSubjectsGrid(container, subjects.filter((subject) => subject.name.toLowerCase().includes(value)));
      });
    }
  }

  async function initTopicsPage() {
    await loadIndex();
    const subjectId = new URLSearchParams(location.search).get('subject');
    const subject = getSubject(subjectId);
    const title = byId('topicsTitle');
    const description = byId('topicsDescription');
    const container = byId('topicsGrid');
    if (!subject) {
      if (title) title.textContent = 'Subject not found';
      if (description) description.textContent = 'Please return to Subjects and choose a valid subject.';
      if (container) container.innerHTML = '<div class="empty-state">This subject does not exist.</div>';
      return;
    }
    title.textContent = `${subject.name} Topics`;
    description.textContent = 'Choose a topic to open its details or go directly into study mode.';
    renderTopicCards(container, subject, subject.topics);
    const search = byId('topicSearch');
    if (search) {
      search.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();
        renderTopicCards(container, subject, subject.topics.filter((topic) => topic.name.toLowerCase().includes(value)));
      });
    }
  }

  async function initTopicDetailPage() {
    await loadIndex();
    const params = new URLSearchParams(location.search);
    const subjectId = params.get('subject');
    const topicId = params.get('topic');
    const subject = getSubject(subjectId);
    const topic = getTopic(subjectId, topicId);
    const root = byId('topicDetailRoot');
    if (!subject || !topic) {
      if (root) root.innerHTML = '<div class="empty-state">Topic not found. Return to the subject list and try again.</div>';
      return;
    }
    const { questions } = await loadTopicFile(topic.file);
    byId('topicName').textContent = topic.name;
    byId('topicSubject').textContent = subject.name;
    byId('topicQuestionCount').textContent = String(questions.length);
    byId('diffEasy').textContent = String(questions.filter((q) => q.difficulty === 'easy').length);
    byId('diffMedium').textContent = String(questions.filter((q) => q.difficulty === 'medium').length);
    byId('diffHard').textContent = String(questions.filter((q) => q.difficulty === 'hard').length);
    byId('studyTopicButton').href = `study.html?subject=${encodeURIComponent(subject.id)}&topic=${encodeURIComponent(topic.id)}`;
    byId('backToTopics').href = `topics.html?subject=${encodeURIComponent(subject.id)}`;
  }

  async function initStudyPage() {
    await loadIndex();
    const params = new URLSearchParams(location.search);
    const subjectId = params.get('subject');
    const topicId = params.get('topic');
    const root = byId('studyRoot');
    const subject = getSubject(subjectId);
    const topic = getTopic(subjectId, topicId);

    if (!subject || !topic) {
      if (root) root.innerHTML = `
        <div class="empty-state">
          Select a subject and topic first.
          <div class="question-actions" style="justify-content:center;">
            <a class="btn btn-primary" href="subjects.html">Go to Subjects</a>
          </div>
        </div>`;
      return;
    }

    const { questions } = await loadTopicFile(topic.file);
    let currentIndex = 0;
    let selectedAnswer = null;
    let revealed = false;
    const seen = new Set();

    byId('studyTitle').textContent = topic.name;
    byId('studySubtitle').textContent = `${subject.name} • Focused Study`;

    function renderQuestionTools(question) {
      let tools = byId('questionTools');
      if (!tools) {
        tools = document.createElement('div');
        tools.id = 'questionTools';
        tools.className = 'question-actions';
        byId('questionText')?.insertAdjacentElement('afterend', tools);
      }

      const note = getQuestionNote(question.id);
      tools.innerHTML = `
        <button type="button" class="btn btn-soft" id="studyStarBtn">${isQuestionSaved(question.id) ? '★ Saved' : '☆ Save'}</button>
        <button type="button" class="btn btn-soft" id="studyNoteBtn">${note ? 'Edit Note' : 'Add Note'}</button>
        ${note ? '<span class="badge">Noted</span>' : ''}
      `;

      byId('studyStarBtn').onclick = () => {
        const saved = toggleQuestionSaved(question);
        byId('studyStarBtn').textContent = saved ? '★ Saved' : '☆ Save';
      };

      byId('studyNoteBtn').onclick = () => {
        let panel = byId('studyNotePanel');
        if (!panel) {
          panel = document.createElement('div');
          panel.id = 'studyNotePanel';
          panel.className = 'surface';
          panel.style.marginTop = '16px';
          panel.style.padding = '18px';
          panel.innerHTML = `
            <div class="card-top"><strong>Question Note</strong></div>
            <textarea id="studyNoteInput" class="textarea" placeholder="Write your note here..."></textarea>
            <div class="question-actions">
              <button type="button" class="btn btn-primary" id="saveStudyNoteBtn">Save Note</button>
              <button type="button" class="btn btn-soft" id="cancelStudyNoteBtn">Cancel</button>
            </div>
          `;
          byId('answerBox')?.insertAdjacentElement('afterend', panel);
        }
        panel.classList.remove('hidden');
        byId('studyNoteInput').value = getQuestionNote(question.id);
        byId('saveStudyNoteBtn').onclick = () => {
          setQuestionNote(question, byId('studyNoteInput').value);
          panel.classList.add('hidden');
          renderQuestion();
        };
        byId('cancelStudyNoteBtn').onclick = () => panel.classList.add('hidden');
      };
    }

    const updateProgressDisplay = () => {
      const percent = questions.length ? Math.round((seen.size / questions.length) * 100) : 0;
      byId('studyProgressText').textContent = `${percent}%`;
      byId('studyProgressBar').style.width = `${percent}%`;
      if (seen.size === questions.length && questions.length) {
        byId('studyFinishNotice').classList.remove('hidden');
        recordStudySession({
          date: new Date().toISOString(),
          subject: subject.id,
          subjectName: subject.name,
          topic: topic.id,
          topicName: topic.name,
          percent,
          completedQuestions: seen.size,
          totalQuestions: questions.length,
        });
      }
    };

    const renderQuestion = () => {
      const question = questions[currentIndex];
      seen.add(question.id);
      selectedAnswer = null;
      revealed = false;

      byId('questionType').textContent = question.type;
      byId('questionDifficulty').textContent = question.difficulty;
      byId('questionCounter').textContent = `Question ${currentIndex + 1} of ${questions.length}`;
      byId('questionText').textContent = question.question;
      byId('answerBox').classList.add('hidden');
      byId('correctAnswer').textContent = question.correctAnswer;
      byId('explanation').textContent = question.explanation;

      const notePanel = byId('studyNotePanel');
      if (notePanel) notePanel.classList.add('hidden');

      const caseBox = byId('caseBox');
      if (question.caseScenario) {
        caseBox.classList.remove('hidden');
        byId('caseText').textContent = question.caseScenario;
      } else {
        caseBox.classList.add('hidden');
      }

      const imageWrap = byId('imageWrap');
      if (question.imageUrl) {
        imageWrap.classList.remove('hidden');
        byId('questionImage').src = question.imageUrl;
      } else {
        imageWrap.classList.add('hidden');
        byId('questionImage').removeAttribute('src');
      }

      renderQuestionTools(question);

      const optionsRoot = byId('optionsRoot');
      optionsRoot.innerHTML = '';
      question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option';
        button.innerHTML = `<span class="option-index">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span>`;
        button.addEventListener('click', () => {
          selectedAnswer = option;
          qsa('.option', optionsRoot).forEach((item) => item.classList.remove('selected'));
          button.classList.add('selected');
        });
        optionsRoot.appendChild(button);
      });

      updateProgressDisplay();
    };

    byId('revealAnswerBtn').onclick = () => {
      const question = questions[currentIndex];
      if (revealed) return;
      revealed = true;
      qsa('.option', byId('optionsRoot')).forEach((button, index) => {
        const value = question.options[index];
        if (value === question.correctAnswer) button.classList.add('correct');
        if (selectedAnswer && value === selectedAnswer && value !== question.correctAnswer) button.classList.add('incorrect');
      });
      byId('answerBox').classList.remove('hidden');
      recordStudyEvent({
        question,
        correct: selectedAnswer === question.correctAnswer,
        revealed: true,
      });
    };

    byId('prevQuestionBtn').onclick = () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderQuestion();
      }
    };

    byId('nextQuestionBtn').onclick = () => {
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        renderQuestion();
      } else {
        byId('studyFinishNotice').classList.remove('hidden');
        updateProgressDisplay();
      }
    };

    renderQuestion();
  }

  async function initFinalExamPage() {
    await loadIndex();
    const configRoot = byId('examConfigRoot');
    const liveRoot = byId('examLiveRoot');
    const reviewRoot = byId('examReviewRoot');
    const subjectSelect = byId('examSubject');
    const modeSelect = byId('examMode');
    const topicCheckboxes = byId('topicCheckboxes');
    const difficultySelect = byId('examDifficulty');
    const countInput = byId('examQuestionCount');
    const minutesInput = byId('examTimeLimit');

    if (!subjectSelect) return;
    subjectSelect.innerHTML = '<option value="all">All Subjects</option>';
    state.index.subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = subject.name;
      subjectSelect.appendChild(option);
    });

    function renderTopicCheckboxes() {
      topicCheckboxes.innerHTML = '';
      if (modeSelect.value !== 'single') {
        topicCheckboxes.classList.add('hidden');
        return;
      }
      const subject = getSubject(subjectSelect.value);
      topicCheckboxes.classList.remove('hidden');
      if (!subject) {
        topicCheckboxes.innerHTML = '<div class="empty-state">Choose one subject first.</div>';
        return;
      }
      subject.topics.forEach((topic) => {
        const label = document.createElement('label');
        label.className = 'option';
        label.innerHTML = `<input type="checkbox" value="${topic.id}" checked><div><strong>${escapeHtml(topic.name)}</strong><div class="small text-muted">${topic.questionCount} questions</div></div>`;
        topicCheckboxes.appendChild(label);
      });
    }

    modeSelect.addEventListener('change', renderTopicCheckboxes);
    subjectSelect.addEventListener('change', renderTopicCheckboxes);
    renderTopicCheckboxes();

    byId('startExamBtn').onclick = async () => {
      const mode = modeSelect.value;
      const selectedSubjectId = subjectSelect.value;
      const difficulty = difficultySelect.value;
      const requestedCount = Math.max(1, Number(countInput.value || 10));
      const minutes = Math.max(1, Number(minutesInput.value || 30));

      if (mode === 'single' && selectedSubjectId === 'all') {
        alert('Choose one subject for Single Subject Final mode.');
        return;
      }

      let topics = [];
      if (mode === 'multiple') {
        topics = selectedSubjectId === 'all'
          ? state.index.subjects.flatMap((subject) => subject.topics)
          : (getSubject(selectedSubjectId)?.topics || []);
      } else {
        const subject = getSubject(selectedSubjectId);
        const chosenTopics = qsa('input[type="checkbox"]:checked', topicCheckboxes).map((input) => input.value);
        topics = (subject?.topics || []).filter((topic) => chosenTopics.includes(topic.id));
      }

      if (!topics.length) {
        alert('No topics selected.');
        return;
      }

      const pool = [];
      for (const topic of topics) {
        const data = await loadTopicFile(topic.file);
        pool.push(...data.questions);
      }

      const filtered = difficulty === 'all' ? pool : pool.filter((question) => question.difficulty === difficulty);
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      const questions = shuffled.slice(0, requestedCount);

      if (!questions.length) {
        alert('No questions found for this configuration.');
        return;
      }

      startExamSession(questions, minutes, { mode, subject: selectedSubjectId, difficulty });
    };

    function startExamSession(questions, minutes, meta) {
      configRoot.classList.add('hidden');
      reviewRoot.classList.add('hidden');
      liveRoot.classList.remove('hidden');

      let currentIndex = 0;
      const answers = {};
      const finishAt = Date.now() + minutes * 60 * 1000;
      let timerId = null;

      const counter = byId('examCounter');
      const timer = byId('examTimer');
      const questionText = byId('examQuestionText');
      const optionsRoot = byId('examOptionsRoot');
      const progressBar = byId('examProgressBar');
      const caseBox = byId('examCaseBox');
      const caseText = byId('examCaseText');

      function renderExamQuestion() {
        const question = questions[currentIndex];
        counter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
        progressBar.style.width = `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`;
        questionText.textContent = question.question;

        if (question.caseScenario) {
          caseBox.classList.remove('hidden');
          caseText.textContent = question.caseScenario;
        } else {
          caseBox.classList.add('hidden');
        }

        optionsRoot.innerHTML = '';
        question.options.forEach((option, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'option';
          if (answers[question.id] === option) button.classList.add('selected');
          button.innerHTML = `<span class="option-index">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span>`;
          button.onclick = () => {
            answers[question.id] = option;
            renderExamQuestion();
          };
          optionsRoot.appendChild(button);
        });
      }

      function submitExam() {
        clearInterval(timerId);
        liveRoot.classList.add('hidden');
        reviewRoot.classList.remove('hidden');

        const correctCount = questions.reduce((sum, question) => sum + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
        const percent = Math.round((correctCount / questions.length) * 100);

        byId('examResultScore').textContent = `${percent}%`;
        byId('examResultMeta').textContent = `${correctCount} correct out of ${questions.length}`;

        byId('examReviewList').innerHTML = questions.map((question, index) => {
          const userAnswer = answers[question.id] || 'No answer';
          const isCorrect = userAnswer === question.correctAnswer;
          const noted = hasQuestionNote(question.id);
          const saved = isQuestionSaved(question.id);
          return `
            <article class="review-item" data-review-question-id="${escapeHtml(question.id)}">
              <div class="meta"><span>Question ${index + 1}</span><span>${escapeHtml(question.subject)}</span><span>${escapeHtml(question.topic)}</span>${noted ? '<span>Noted</span>' : ''}</div>
              <h4>${escapeHtml(question.question)}</h4>
              ${question.caseScenario ? `<div class="case-box">${escapeHtml(question.caseScenario)}</div>` : ''}
              <p class="review-answer ${isCorrect ? 'correct' : 'incorrect'}"><strong>Your answer:</strong> ${escapeHtml(userAnswer)}</p>
              <p><strong>Correct answer:</strong> ${escapeHtml(question.correctAnswer)}</p>
              <p class="text-muted">${escapeHtml(question.explanation)}</p>
              <div class="question-actions">
                <button type="button" class="btn btn-soft exam-save-btn" data-question-id="${escapeHtml(question.id)}">${saved ? '★ Saved' : '☆ Save'}</button>
                <button type="button" class="btn btn-soft exam-note-btn" data-question-id="${escapeHtml(question.id)}">${noted ? 'Edit Note' : 'Add Note'}</button>
              </div>
              <div class="surface exam-note-panel hidden" style="padding:16px; margin-top:12px;">
                <strong>Question Note</strong>
                <textarea class="textarea exam-note-input" style="margin-top:10px;">${escapeHtml(getQuestionNote(question.id))}</textarea>
                <div class="question-actions">
                  <button type="button" class="btn btn-primary exam-note-save-btn" data-question-id="${escapeHtml(question.id)}">Save Note</button>
                  <button type="button" class="btn btn-soft exam-note-cancel-btn">Cancel</button>
                </div>
              </div>
            </article>
          `;
        }).join('');

        qsa('.exam-save-btn').forEach((button) => {
          button.addEventListener('click', () => {
            const question = questions.find((item) => item.id === button.dataset.questionId);
            const saved = toggleQuestionSaved(question);
            button.textContent = saved ? '★ Saved' : '☆ Save';
          });
        });

        qsa('.exam-note-btn').forEach((button) => {
          button.addEventListener('click', () => {
            const card = button.closest('.review-item');
            qs('.exam-note-panel', card)?.classList.remove('hidden');
          });
        });

        qsa('.exam-note-cancel-btn').forEach((button) => {
          button.addEventListener('click', () => {
            button.closest('.exam-note-panel')?.classList.add('hidden');
          });
        });

        qsa('.exam-note-save-btn').forEach((button) => {
          button.addEventListener('click', () => {
            const question = questions.find((item) => item.id === button.dataset.questionId);
            const card = button.closest('.review-item');
            const value = qs('.exam-note-input', card)?.value || '';
            setQuestionNote(question, value);
            const noteBtn = qs('.exam-note-btn', card);
            if (noteBtn) noteBtn.textContent = value.trim() ? 'Edit Note' : 'Add Note';
            qs('.exam-note-panel', card)?.classList.add('hidden');
          });
        });

        recordExamSession({
          date: new Date().toISOString(),
          mode: meta.mode,
          subject: meta.subject,
          difficulty: meta.difficulty,
          totalQuestions: questions.length,
          score: correctCount,
          percent,
        });
      }

      timerId = setInterval(() => {
        const remaining = Math.max(0, finishAt - Date.now());
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (remaining <= 0) submitExam();
      }, 1000);

      byId('examPrevBtn').onclick = () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderExamQuestion();
        }
      };
      byId('examNextBtn').onclick = () => {
        if (currentIndex < questions.length - 1) {
          currentIndex += 1;
          renderExamQuestion();
        }
      };
      byId('examSubmitBtn').onclick = submitExam;

      renderExamQuestion();
    }
  }

  async function initDashboardPage() {
    await loadIndex();
    const progress = getProgress();
    const allQuestionStats = Object.values(progress.questionStats);
    const attempts = allQuestionStats.reduce((sum, item) => sum + item.attempts, 0);
    const correct = allQuestionStats.reduce((sum, item) => sum + item.correct, 0);
    const successRate = attempts ? Math.round((correct / attempts) * 100) : 0;

    byId('metricSuccessRate').textContent = `${successRate}%`;
    byId('metricSolved').textContent = String(attempts);
    byId('metricSessions').textContent = String(progress.studyHistory.length);
    byId('metricExams').textContent = String(progress.examHistory.length);

    const subjectProgress = state.index.subjects.map((subject) => {
      const entries = Object.values(progress.topicCompletion).filter((item) => item.subject === subject.id);
      const percent = entries.length ? Math.round(entries.reduce((sum, item) => sum + item.percent, 0) / entries.length) : 0;
      return { name: subject.name, percent };
    });

    byId('subjectProgressList').innerHTML = subjectProgress.map((item) => `
      <div class="progress-item">
        <div class="card-top"><strong>${escapeHtml(item.name)} Progress</strong><span>${item.percent}%</span></div>
        <div class="progress-track"><div class="progress-bar" style="width:${item.percent}%"></div></div>
      </div>
    `).join('');

    const topicScores = {};
    Object.values(progress.questionStats).forEach((entry) => {
      const key = `${entry.subject}|${entry.topic}`;
      if (!topicScores[key]) topicScores[key] = { ...entry, attempts: 0, correct: 0 };
      topicScores[key].attempts += entry.attempts;
      topicScores[key].correct += entry.correct;
    });

    const sortedTopics = Object.values(topicScores).map((item) => ({
      ...item,
      percent: item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0,
      subjectName: getSubject(item.subject)?.name || item.subject,
      topicName: getTopic(item.subject, item.topic)?.name || item.topic,
    })).sort((a, b) => b.percent - a.percent);

    const strengths = sortedTopics.slice(0, 3);
    const weaknesses = [...sortedTopics].reverse().slice(0, 3);

    byId('strengthAreas').innerHTML = strengths.length ? strengths.map((item) => `
      <div class="activity-item"><strong>${escapeHtml(item.topicName)}</strong><div class="text-muted">${escapeHtml(item.subjectName)} • ${item.percent}% success</div></div>
    `).join('') : '<div class="empty-state">No enough study data yet.</div>';

    byId('weakAreas').innerHTML = weaknesses.length ? weaknesses.map((item) => `
      <div class="activity-item"><strong>${escapeHtml(item.topicName)}</strong><div class="text-muted">${escapeHtml(item.subjectName)} • ${item.percent}% success</div></div>
    `).join('') : '<div class="empty-state">No weak areas identified yet.</div>';

    const recent = [...progress.studyHistory, ...progress.examHistory]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    byId('recentActivity').innerHTML = recent.length ? recent.map((item) => `
      <div class="activity-item">
        <strong>${escapeHtml(item.topicName || (getSubject(item.subject)?.name || item.subject))}${item.mode ? ' Final Exam' : ''}</strong>
        <div class="text-muted">${escapeHtml(item.subjectName || getSubject(item.subject)?.name || '')} • ${formatDate(item.date)}</div>
        <div class="small text-muted">${item.totalQuestions ? `${item.totalQuestions} questions` : `${item.completedQuestions} reviewed`}</div>
      </div>
    `).join('') : '<div class="empty-state">Your last 5 study or exam sessions will appear here.</div>';

    const recommendation = weaknesses[0];
    byId('recommendationCard').innerHTML = recommendation ? `
      <strong>Recommended Review</strong>
      <h3>${escapeHtml(recommendation.topicName)}</h3>
      <p class="text-muted">This topic currently has your lowest success rate. Review it again to strengthen retention.</p>
      <a class="btn btn-primary" href="study.html?subject=${encodeURIComponent(recommendation.subject)}&topic=${encodeURIComponent(recommendation.topic)}">Review Topic</a>
    ` : '<strong>Recommended Review</strong><p class="text-muted">Start a few study sessions and your recommendation will appear here.</p>';

    const badges = [
      {
        title: 'Studied 100 Pharmacology Questions',
        earned: Object.values(progress.questionStats).filter((item) => item.subject === 'pharmacology').reduce((sum, item) => sum + item.attempts, 0) >= 100,
      },
      { title: 'Completed 5 Study Sessions', earned: progress.studyHistory.length >= 5 },
      { title: 'Achieved 80%+ in Clinical Pharmacy', earned: sortedTopics.some((item) => item.subject === 'clinical-pharmacy' && item.percent >= 80) },
    ];
    byId('badgeList').innerHTML = badges.map((badge) => `
      <div class="badge-item ${badge.earned ? 'earned' : ''}"><strong>${escapeHtml(badge.title)}</strong><div class="text-muted">${badge.earned ? 'Unlocked' : 'Not unlocked yet'}</div></div>
    `).join('');
  }

  function getGithubConfig() {
    return readStorage(STORAGE_KEYS.github, { owner: '', repo: '', branch: 'main', token: '' });
  }

  function saveGithubConfig() {
    const config = {
      owner: byId('ghOwner')?.value.trim() || '',
      repo: byId('ghRepo')?.value.trim() || '',
      branch: byId('ghBranch')?.value.trim() || 'main',
      token: byId('ghToken')?.value.trim() || '',
    };
    writeStorage(STORAGE_KEYS.github, config);
    return config;
  }

  function populateGithubFields() {
    const config = getGithubConfig();
    if (byId('ghOwner')) byId('ghOwner').value = config.owner || '';
    if (byId('ghRepo')) byId('ghRepo').value = config.repo || '';
    if (byId('ghBranch')) byId('ghBranch').value = config.branch || 'main';
    if (byId('ghToken')) byId('ghToken').value = config.token || '';
  }

  async function githubRequest(path, options = {}) {
    const config = getGithubConfig();
    if (!config.owner || !config.repo || !config.branch || !config.token) {
      throw new Error('Save GitHub owner, repo, branch, and PAT first.');
    }
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    const method = options.method || 'GET';
    const finalUrl = method === 'GET' ? `${url}?ref=${encodeURIComponent(config.branch)}` : url;
    const response = await fetch(finalUrl, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `GitHub request failed for ${path}`);
    }
    return text ? JSON.parse(text) : {};
  }

  async function githubGetFile(path) {
    try {
      const data = await githubRequest(path, { method: 'GET' });
      const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
      return { sha: data.sha, json: JSON.parse(content), raw: content };
    } catch (error) {
      if (String(error.message).includes('Not Found') || String(error.message).includes('"status":"404"') || String(error.message).includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async function githubPutJson(path, jsonContent, message) {
    const config = getGithubConfig();
    const existing = await githubGetFile(path);
    const body = {
      message,
      branch: config.branch,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(jsonContent, null, 2)))),
    };
    if (existing?.sha) body.sha = existing.sha;
    return githubRequest(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  function setNotice(id, type, message) {
    const el = byId(id);
    if (!el) return;
    el.className = `notice ${type}`;
    el.textContent = message;
  }

  function getAdminPassword() {
    return localStorage.getItem(STORAGE_KEYS.adminPassword) || '';
  }

  function setAdminPassword(password) {
    localStorage.setItem(STORAGE_KEYS.adminPassword, password);
  }

  function populateSubjectSelects() {
    if (!state.index?.subjects) return;
    const topicSubjectSelect = byId('topicSubjectSelect');
    const questionSubjectSelect = byId('questionSubjectSelect');
    const questionTopicSelect = byId('questionTopicSelect');

    if (topicSubjectSelect) {
      topicSubjectSelect.innerHTML = '<option value="">Choose subject</option>' + state.index.subjects.map((subject) =>
        `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join('');
    }

    if (questionSubjectSelect) {
      questionSubjectSelect.innerHTML = '<option value="">Choose subject</option>' + state.index.subjects.map((subject) =>
        `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join('');
    }

    function syncQuestionTopics() {
      const subject = getSubject(questionSubjectSelect?.value);
      if (!questionTopicSelect) return;
      if (!subject) {
        questionTopicSelect.innerHTML = '<option value="">Choose topic</option>';
        return;
      }
      questionTopicSelect.innerHTML = '<option value="">Choose topic</option>' + subject.topics.map((topic) =>
        `<option value="${topic.id}">${escapeHtml(topic.name)}</option>`).join('');
    }

    if (questionSubjectSelect) questionSubjectSelect.onchange = syncQuestionTopics;
    syncQuestionTopics();
  }

  async function createSubject() {
    const name = byId('newSubjectName').value.trim();
    if (!name) return setNotice('subjectNotice', 'error', 'Enter a subject name.');
    const subjectId = slugify(name);
    if (!subjectId) return setNotice('subjectNotice', 'error', 'Enter a valid subject name.');
    if (state.index.subjects.some((subject) => subject.id === subjectId)) {
      return setNotice('subjectNotice', 'error', 'This subject already exists.');
    }
    state.index.subjects.push({ id: subjectId, name, topics: [] });
    await githubPutJson('data/index.json', state.index, `Add subject: ${name}`);
    byId('newSubjectName').value = '';
    populateSubjectSelects();
    setNotice('subjectNotice', 'success', `Subject "${name}" added successfully.`);
  }

  async function createTopic() {
    const subjectId = byId('topicSubjectSelect').value;
    const name = byId('newTopicName').value.trim();
    if (!subjectId || !name) return setNotice('topicNotice', 'error', 'Choose a subject and enter a topic name.');
    const subject = getSubject(subjectId);
    if (!subject) return setNotice('topicNotice', 'error', 'Subject not found.');
    const topicId = slugify(name);
    if (!topicId) return setNotice('topicNotice', 'error', 'Enter a valid topic name.');
    if (subject.topics.some((topic) => topic.id === topicId)) return setNotice('topicNotice', 'error', 'This topic already exists.');
    const path = `data/${subjectId}/${topicId}.json`;
    subject.topics.push({ id: topicId, name, file: path, questionCount: 0 });
    await githubPutJson(path, { questions: [] }, `Create topic: ${name}`);
    await githubPutJson('data/index.json', state.index, `Add topic: ${name}`);
    byId('newTopicName').value = '';
    populateSubjectSelects();
    setNotice('topicNotice', 'success', `Topic "${name}" created successfully.`);
  }

  function getQuestionOptionsFromForm() {
    const type = byId('questionType').value;
    if (type === 'true-false') return ['True', 'False'];
    const options = ['A', 'B', 'C', 'D']
      .map((label) => byId(`option${label}`)?.value.trim() || '')
      .filter(Boolean);
    return options;
  }

  function syncQuestionFormForType() {
    const type = byId('questionType')?.value;
    const optionsGrid = byId('questionOptionsGrid');
    const correctSelect = byId('questionCorrectAnswer');
    if (!optionsGrid || !correctSelect) return;
    if (type === 'true-false') {
      optionsGrid.classList.add('hidden');
      correctSelect.innerHTML = '<option value="True">True</option><option value="False">False</option>';
    } else {
      optionsGrid.classList.remove('hidden');
      const options = getQuestionOptionsFromForm();
      correctSelect.innerHTML = '<option value="">Choose correct answer</option>' + options.map((option) =>
        `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
    }
  }

  function bindOptionInputs() {
    ['A', 'B', 'C', 'D'].forEach((label) => {
      const input = byId(`option${label}`);
      if (input) input.oninput = syncQuestionFormForType;
    });
  }

  async function createQuestion() {
    const subjectId = byId('questionSubjectSelect').value;
    const topicId = byId('questionTopicSelect').value;
    const type = byId('questionType').value;
    const difficulty = byId('questionDifficulty').value;
    const questionText = byId('questionTextInput').value.trim();
    const explanation = byId('questionExplanation').value.trim();
    const caseScenario = byId('questionCaseScenario').value.trim();
    const imageUrl = byId('questionImageUrl').value.trim();
    const options = getQuestionOptionsFromForm();
    const correctAnswer = byId('questionCorrectAnswer').value.trim();

    if (!subjectId || !topicId) return setNotice('questionNotice', 'error', 'Choose the subject and topic first.');
    if (!questionText || !explanation) return setNotice('questionNotice', 'error', 'Question text and explanation are required.');
    if (options.length < 2) return setNotice('questionNotice', 'error', 'Add at least two options.');
    if (!correctAnswer || !options.includes(correctAnswer)) return setNotice('questionNotice', 'error', 'Choose the correct answer from the list.');

    const topicMeta = getTopic(subjectId, topicId);
    if (!topicMeta) return setNotice('questionNotice', 'error', 'Topic not found.');

    const file = await githubGetFile(topicMeta.file);
    const topicJson = file?.json || { questions: [] };
    topicJson.questions.push({
      id: uniqueId(topicId),
      type,
      subject: subjectId,
      topic: topicId,
      question: questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      caseScenario,
      imageUrl,
    });
    topicMeta.questionCount = topicJson.questions.length;
    await githubPutJson(topicMeta.file, topicJson, `Add question to ${topicMeta.name}`);
    await githubPutJson('data/index.json', state.index, `Update count for ${topicMeta.name}`);

    ['questionTextInput', 'questionExplanation', 'questionCaseScenario', 'questionImageUrl', 'optionA', 'optionB', 'optionC', 'optionD'].forEach((id) => {
      const field = byId(id);
      if (field) field.value = '';
    });
    byId('questionType').value = 'mcq';
    syncQuestionFormForType();
    setNotice('questionNotice', 'success', `Question added to ${topicMeta.name}.`);
  }

  async function testGithubAccess() {
    saveGithubConfig();
    await githubGetFile('data/index.json');
  }

  function injectSharedAdminDialog() {
    if (byId('adminDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.id = 'adminDialog';
    dialog.innerHTML = `
      <div class="admin-lock" id="adminLockPanel">
        <div class="surface admin-lock-card">
          <span class="badge">Hidden Admin Access</span>
          <h2 id="adminLockTitle">Admin Password</h2>
          <p class="text-muted" id="adminLockText">Enter the admin password to open the control panel.</p>
          <input id="adminPasswordInput" class="text-input full-width" type="password" placeholder="Admin password">
          <input id="adminPasswordConfirm" class="text-input full-width hidden" type="password" placeholder="Confirm password">
          <div class="question-actions">
            <button class="btn btn-primary" id="adminUnlockBtn">Open Admin Panel</button>
            <button class="btn btn-soft" id="adminCloseFromLockBtn">Cancel</button>
          </div>
          <div id="adminLockNotice" class="notice hidden"></div>
        </div>
      </div>

      <div class="admin-shell hidden" id="adminShell">
        <aside class="admin-sidebar">
          <div class="brand">
            <div class="brand-mark">PN</div>
            <div>
              <div>Admin Panel</div>
              <div class="small" style="opacity:.85;">Manage subjects, topics, and questions</div>
            </div>
          </div>
          <div class="admin-menu">
            <button class="btn admin-tab active" data-admin-tab="settings">1. GitHub</button>
            <button class="btn admin-tab" data-admin-tab="subjects">2. Add Subject</button>
            <button class="btn admin-tab" data-admin-tab="topics">3. Add Topic</button>
            <button class="btn admin-tab" data-admin-tab="questions">4. Add Question</button>
            <button class="btn btn-danger" id="closeAdminBtn">Close</button>
          </div>
        </aside>

        <section class="admin-body">
          <div data-admin-panel="settings">
            <h2>GitHub Settings</h2>
            <p class="text-muted">Save these once in this browser. After that, subject, topic, and question updates will go directly to your GitHub repository.</p>
            <div class="form-grid">
              <input id="ghOwner" class="text-input" placeholder="GitHub username / owner">
              <input id="ghRepo" class="text-input" placeholder="Repository name">
              <input id="ghBranch" class="text-input" placeholder="Branch name (example: main)">
              <input id="ghToken" class="text-input" type="password" placeholder="GitHub PAT (Classic)">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="saveGithubConfigBtn">Save Settings</button>
              <button class="btn btn-soft" id="testGithubBtn">Test Connection</button>
            </div>
            <div id="githubNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="subjects" class="hidden">
            <h2>Add Subject</h2>
            <p class="text-muted">Type the subject name only. The slug ID will be created automatically.</p>
            <div class="form-grid">
              <input id="newSubjectName" class="text-input full" placeholder="Example: Pharmacology">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="createSubjectBtn">Create Subject</button>
            </div>
            <div id="subjectNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="topics" class="hidden">
            <h2>Add Topic</h2>
            <p class="text-muted">Choose the subject first, then type the topic name. The topic JSON file will be created automatically.</p>
            <div class="form-grid">
              <select id="topicSubjectSelect" class="select-box"></select>
              <input id="newTopicName" class="text-input" placeholder="Example: Sedatives & Hypnotics">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="createTopicBtn">Create Topic</button>
            </div>
            <div id="topicNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="questions" class="hidden">
            <h2>Add Question</h2>
            <p class="text-muted">Choose the topic, enter the question, fill the options, then pick the correct answer from the dropdown.</p>
            <div class="form-grid">
              <select id="questionSubjectSelect" class="select-box"></select>
              <select id="questionTopicSelect" class="select-box"></select>
              <select id="questionType" class="select-box">
                <option value="mcq">MCQ</option>
                <option value="true-false">True / False</option>
                <option value="image-question">Image Question</option>
                <option value="clinical-case">Clinical Case Question</option>
              </select>
              <select id="questionDifficulty" class="select-box">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <textarea id="questionTextInput" class="textarea full" placeholder="Question text"></textarea>

              <div id="questionOptionsGrid" class="form-grid full">
                <input id="optionA" class="text-input" placeholder="Option A">
                <input id="optionB" class="text-input" placeholder="Option B">
                <input id="optionC" class="text-input" placeholder="Option C">
                <input id="optionD" class="text-input" placeholder="Option D">
              </div>

              <select id="questionCorrectAnswer" class="select-box full">
                <option value="">Choose correct answer</option>
              </select>

              <textarea id="questionExplanation" class="textarea full" placeholder="Explanation"></textarea>
              <textarea id="questionCaseScenario" class="textarea full" placeholder="Case scenario (optional)"></textarea>
              <input id="questionImageUrl" class="text-input full" placeholder="Image URL (optional)">
            </div>

            <div class="question-actions">
              <button class="btn btn-primary" id="createQuestionBtn">Save Question</button>
            </div>
            <div id="questionNotice" class="notice hidden"></div>
          </div>
        </section>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  function prepareAdminLock() {
    const hasPassword = !!getAdminPassword();
    byId('adminPasswordInput').value = '';
    byId('adminPasswordConfirm').value = '';
    byId('adminLockNotice').className = 'notice hidden';
    byId('adminLockTitle').textContent = hasPassword ? 'Admin Password' : 'Create Admin Password';
    byId('adminLockText').textContent = hasPassword
      ? 'Enter the admin password to open the control panel.'
      : 'First time only: create an admin password for this browser.';
    byId('adminPasswordConfirm').classList.toggle('hidden', hasPassword);
    byId('adminUnlockBtn').textContent = hasPassword ? 'Open Admin Panel' : 'Save Password & Open';
    byId('adminLockPanel').classList.remove('hidden');
    byId('adminShell').classList.add('hidden');
  }

  async function unlockAdmin() {
    const password = byId('adminPasswordInput').value.trim();
    const confirm = byId('adminPasswordConfirm').value.trim();
    const current = getAdminPassword();

    if (!current) {
      if (!password || password.length < 4) return setNotice('adminLockNotice', 'error', 'Use a password with at least 4 characters.');
      if (password !== confirm) return setNotice('adminLockNotice', 'error', 'Passwords do not match.');
      setAdminPassword(password);
    } else if (password !== current) {
      return setNotice('adminLockNotice', 'error', 'Wrong password.');
    }

    await loadIndex();
    state.adminUnlocked = true;
    populateGithubFields();
    populateSubjectSelects();
    bindOptionInputs();
    syncQuestionFormForType();
    byId('adminLockPanel').classList.add('hidden');
    byId('adminShell').classList.remove('hidden');
  }

  function openAdminDialog() {
    const dialog = byId('adminDialog');
    if (!dialog) return;
    prepareAdminLock();
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }

  function closeAdminDialog() {
    const dialog = byId('adminDialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function initAdminEvents() {
    injectSharedAdminDialog();

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        openAdminDialog();
      }
    });

    byId('adminUnlockBtn').addEventListener('click', () => {
      unlockAdmin().catch((error) => setNotice('adminLockNotice', 'error', error.message));
    });
    byId('adminCloseFromLockBtn').addEventListener('click', closeAdminDialog);
    byId('closeAdminBtn').addEventListener('click', closeAdminDialog);

    qsa('.admin-tab', byId('adminDialog')).forEach((button) => {
      button.addEventListener('click', () => {
        qsa('.admin-tab', byId('adminDialog')).forEach((item) => item.classList.remove('active'));
        qsa('[data-admin-panel]', byId('adminDialog')).forEach((panel) => panel.classList.add('hidden'));
        button.classList.add('active');
        qs(`[data-admin-panel="${button.dataset.adminTab}"]`, byId('adminDialog')).classList.remove('hidden');
      });
    });

    byId('saveGithubConfigBtn').addEventListener('click', () => {
      saveGithubConfig();
      setNotice('githubNotice', 'success', 'GitHub settings saved in this browser.');
    });

    byId('testGithubBtn').addEventListener('click', () => {
      testGithubAccess()
        .then(() => setNotice('githubNotice', 'success', 'GitHub connection is working.'))
        .catch((error) => setNotice('githubNotice', 'error', error.message));
    });

    byId('createSubjectBtn').addEventListener('click', () => {
      createSubject().catch((error) => setNotice('subjectNotice', 'error', error.message));
    });

    byId('createTopicBtn').addEventListener('click', () => {
      createTopic().catch((error) => setNotice('topicNotice', 'error', error.message));
    });

    byId('createQuestionBtn').addEventListener('click', () => {
      createQuestion().catch((error) => setNotice('questionNotice', 'error', error.message));
    });

    byId('questionType').addEventListener('change', syncQuestionFormForType);
  }


  async function initSavedPage() {
    await loadIndex();
    const root = byId('savedPageRoot');
    if (!root) return;

    const progress = getProgress();
    const savedMap = progress.savedBank || {};
    const notesMap = progress.savedNotes || {};
    const mergedMap = {};

    Object.values(savedMap).forEach((q) => {
      mergedMap[q.id] = { ...q, isSaved: true, note: notesMap[q.id]?.note || '' };
    });

    Object.values(notesMap).forEach((q) => {
      mergedMap[q.id] = { ...(mergedMap[q.id] || q), ...q, isSaved: !!savedMap[q.id], note: q.note || '' };
    });

    const allItems = Object.values(mergedMap);
    const subjects = [...new Set(allItems.map((q) => q.subject).filter(Boolean))];
    const topics = [...new Set(allItems.map((q) => q.topic).filter(Boolean))];

    root.innerHTML = `
      <section class="page-hero">
        <div class="container">
          <span class="badge">Saved Questions</span>
          <h1>Saved & Notes</h1>
          <p>Review starred questions, notes you wrote, and quickly jump back to the original topic.</p>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="surface" style="padding:22px;">
            <div class="question-actions" style="margin-top:0;">
              <button type="button" class="btn btn-primary saved-filter-btn active" data-filter="all">All</button>
              <button type="button" class="btn btn-soft saved-filter-btn" data-filter="starred">Starred</button>
              <button type="button" class="btn btn-soft saved-filter-btn" data-filter="notes">Notes</button>
              <button type="button" class="btn btn-soft saved-filter-btn" data-filter="both">Starred + Notes</button>
            </div>
            <div class="toolbar" style="margin-top:16px;">
              <select class="select-box" id="savedSubjectFilter">
                <option value="all">All Subjects</option>
                ${subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(getSubject(s)?.name || s)}</option>`).join('')}
              </select>
              <select class="select-box" id="savedTopicFilter">
                <option value="all">All Topics</option>
                ${topics.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
              </select>
              <input class="text-input" id="savedSearchInput" placeholder="Search saved questions..." />
            </div>
          </div>

          <div class="grid" id="savedCardsGrid" style="margin-top:22px;"></div>
        </div>
      </section>
    `;

    const grid = byId('savedCardsGrid');
    const subjectFilter = byId('savedSubjectFilter');
    const topicFilter = byId('savedTopicFilter');
    const searchInput = byId('savedSearchInput');
    const filterButtons = qsa('.saved-filter-btn', root);
    let activeFilter = 'all';

    function drawSavedCards() {
      let rows = [...allItems];
      const subjectValue = subjectFilter.value;
      const topicValue = topicFilter.value;
      const term = searchInput.value.trim().toLowerCase();

      if (activeFilter === 'starred') rows = rows.filter((q) => q.isSaved);
      if (activeFilter === 'notes') rows = rows.filter((q) => (q.note || '').trim());
      if (activeFilter === 'both') rows = rows.filter((q) => q.isSaved && (q.note || '').trim());

      if (subjectValue !== 'all') rows = rows.filter((q) => q.subject === subjectValue);
      if (topicValue !== 'all') rows = rows.filter((q) => q.topic === topicValue);
      if (term) {
        rows = rows.filter((q) =>
          (q.question || '').toLowerCase().includes(term) ||
          (q.note || '').toLowerCase().includes(term) ||
          (q.explanation || '').toLowerCase().includes(term)
        );
      }

      if (!rows.length) {
        grid.innerHTML = '<div class="empty-state">No matching saved questions or notes found.</div>';
        return;
      }

      grid.innerHTML = rows.map((q) => `
        <article class="surface card">
          <div class="card-top">
            <div>
              <div class="meta">
                <span>${escapeHtml(getSubject(q.subject)?.name || q.subject)}</span>
                <span>${escapeHtml(getTopic(q.subject, q.topic)?.name || q.topic)}</span>
                ${q.note ? '<span>Noted</span>' : ''}
              </div>
              <h3>${escapeHtml(q.question)}</h3>
            </div>
            <button type="button" class="btn btn-soft saved-card-star-btn" data-question-id="${escapeHtml(q.id)}">${q.isSaved ? '★ Saved' : '☆ Save'}</button>
          </div>
          <p><strong>Correct answer:</strong> ${escapeHtml(q.correctAnswer || '')}</p>
          <p class="text-muted">${escapeHtml(q.explanation || '')}</p>
          ${q.note ? `<div class="case-box"><strong>Your note</strong><div class="text-muted" style="margin-top:8px;">${escapeHtml(q.note)}</div></div>` : ''}
          <div class="question-actions">
            <a class="btn btn-primary" href="topic.html?subject=${encodeURIComponent(q.subject)}&topic=${encodeURIComponent(q.topic)}">Open Topic</a>
            <button type="button" class="btn btn-soft saved-card-note-btn" data-question-id="${escapeHtml(q.id)}">${q.note ? 'Edit Note' : 'Add Note'}</button>
          </div>
          <div class="surface saved-note-panel hidden" style="padding:16px; margin-top:12px;">
            <strong>Question Note</strong>
            <textarea class="textarea saved-note-input" style="margin-top:10px;">${escapeHtml(q.note || '')}</textarea>
            <div class="question-actions">
              <button type="button" class="btn btn-primary saved-note-save-btn" data-question-id="${escapeHtml(q.id)}">Save Note</button>
              <button type="button" class="btn btn-soft saved-note-cancel-btn">Cancel</button>
            </div>
          </div>
        </article>
      `).join('');

      qsa('.saved-card-star-btn', grid).forEach((button) => {
        button.addEventListener('click', () => {
          const question = mergedMap[button.dataset.questionId];
          const saved = toggleQuestionSaved(question);
          mergedMap[question.id].isSaved = saved;
          drawSavedCards();
        });
      });

      qsa('.saved-card-note-btn', grid).forEach((button) => {
        button.addEventListener('click', () => {
          const panel = qs('.saved-note-panel', button.closest('.card'));
          if (panel) panel.classList.remove('hidden');
        });
      });

      qsa('.saved-note-cancel-btn', grid).forEach((button) => {
        button.addEventListener('click', () => {
          button.closest('.saved-note-panel')?.classList.add('hidden');
        });
      });

      qsa('.saved-note-save-btn', grid).forEach((button) => {
        button.addEventListener('click', () => {
          const question = mergedMap[button.dataset.questionId];
          const card = button.closest('.card');
          const value = qs('.saved-note-input', card)?.value || '';
          setQuestionNote(question, value);
          mergedMap[question.id].note = value.trim();
          drawSavedCards();
        });
      });
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        filterButtons.forEach((item) => {
          item.classList.remove('active', 'btn-primary');
          if (!item.classList.contains('btn-soft')) item.classList.add('btn-soft');
        });
        button.classList.add('active');
        button.classList.remove('btn-soft');
        button.classList.add('btn-primary');
        drawSavedCards();
      });
    });

    subjectFilter.addEventListener('change', drawSavedCards);
    topicFilter.addEventListener('change', drawSavedCards);
    searchInput.addEventListener('input', drawSavedCards);

    drawSavedCards();
  }

  function initNavigation() {
    const toggle = byId('navToggle');
    const links = byId('navLinks');
    if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));
    const page = document.body.dataset.page;
    qsa('.nav-link').forEach((link) => {
      if (link.dataset.page === page) link.classList.add('active');
    });
  }

  async function init() {
    initNavigation();
    initAdminEvents();

    const page = document.body.dataset.page;
    if (page === 'home') await initHome();
    if (page === 'subjects') await initSubjectsPage();
    if (page === 'topics') await initTopicsPage();
    if (page === 'topic-detail') await initTopicDetailPage();
    if (page === 'study') await initStudyPage();
    if (page === 'final-exam') await initFinalExamPage();
    if (page === 'dashboard') await initDashboardPage();
    if (page === 'saved') await initSavedPage();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch((error) => {
    console.error(error);
    const root = document.querySelector('main');
    if (root) root.insertAdjacentHTML('afterbegin', `<div class="container"><div class="empty-state">${error.message}</div></div>`);
  });
});
