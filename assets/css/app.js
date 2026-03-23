const App = (() => {
  const STORAGE_KEYS = {
    github: 'pn_github_config',
    progress: 'pn_progress_v1',
  };

  const state = {
    index: null,
    topicCache: new Map(),
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const slugify = (value = '') => value.toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const uniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const byId = (id) => document.getElementById(id);

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

  function getProgress() {
    return readStorage(STORAGE_KEYS.progress, {
      studyHistory: [],
      examHistory: [],
      questionStats: {},
      topicCompletion: {},
    });
  }

  function saveProgress(progress) {
    writeStorage(STORAGE_KEYS.progress, progress);
  }

  function recordStudyEvent({ question, selectedAnswer, correct, revealed = true }) {
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
    if (!response.ok) throw new Error('Failed to load index.json');
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
    return state.index?.subjects?.find((subject) => subject.id === subjectId) || null;
  }

  function getTopic(subjectId, topicId) {
    const subject = getSubject(subjectId);
    return subject?.topics?.find((topic) => topic.id === topicId) || null;
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
            <h3>${subject.name}</h3>
          </div>
          <span class="pill">${subject.id}</span>
        </div>
        <p class="text-muted">Structured study content for ${subject.name} with topic-based JSON files.</p>
        <div class="meta">
          <span>Topic-based loading</span>
          <span>Static JSON</span>
        </div>
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
            <h3>${topic.name}</h3>
          </div>
          <span class="pill">${subject.name}</span>
        </div>
        <p class="text-muted">Study this topic in focused mode with reveal-answer workflow and progress tracking.</p>
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
        const filtered = subjects.filter((subject) => subject.name.toLowerCase().includes(value));
        renderSubjectsGrid(container, filtered);
      });
    }
    qs('[data-stat="subjects"]').textContent = subjects.length;
    qs('[data-stat="topics"]').textContent = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  }

  async function initSubjectsPage() {
    const { subjects } = await loadIndex();
    renderSubjectsGrid(byId('allSubjectsGrid'), subjects);
    const search = byId('subjectsPageSearch');
    if (search) {
      search.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();
        renderSubjectsGrid(byId('allSubjectsGrid'), subjects.filter((subject) => subject.name.toLowerCase().includes(value)));
      });
    }
  }

  async function initTopicsPage() {
    await loadIndex();
    const params = new URLSearchParams(location.search);
    const subjectId = params.get('subject');
    const subject = getSubject(subjectId);
    const title = byId('topicsTitle');
    const desc = byId('topicsDescription');
    const container = byId('topicsGrid');
    if (!subject) {
      title.textContent = 'Subject not found';
      desc.textContent = 'Choose a valid subject from the homepage.';
      container.innerHTML = '<div class="empty-state">This subject does not exist in data/index.json.</div>';
      return;
    }
    title.textContent = `${subject.name} Topics`;
    desc.textContent = 'Browse topic cards, review question counts, and open a focused study session.';
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
    if (!subject || !topic) {
      byId('topicDetailRoot').innerHTML = '<div class="empty-state">Topic not found. Return to subjects and try again.</div>';
      return;
    }
    const { questions } = await loadTopicFile(topic.file);
    const counts = {
      easy: questions.filter((item) => item.difficulty === 'easy').length,
      medium: questions.filter((item) => item.difficulty === 'medium').length,
      hard: questions.filter((item) => item.difficulty === 'hard').length,
    };
    byId('topicName').textContent = topic.name;
    byId('topicSubject').textContent = subject.name;
    byId('topicQuestionCount').textContent = String(questions.length);
    byId('diffEasy').textContent = counts.easy;
    byId('diffMedium').textContent = counts.medium;
    byId('diffHard').textContent = counts.hard;
    byId('studyTopicButton').href = `study.html?subject=${encodeURIComponent(subject.id)}&topic=${encodeURIComponent(topic.id)}`;
    byId('backToTopics').href = `topics.html?subject=${encodeURIComponent(subject.id)}`;
  }

  async function initStudyPage() {
    await loadIndex();
    const params = new URLSearchParams(location.search);
    const subjectId = params.get('subject');
    const topicId = params.get('topic');
    const subject = getSubject(subjectId);
    const topic = getTopic(subjectId, topicId);
    if (!subject || !topic) {
      byId('studyRoot').innerHTML = '<div class="empty-state">Choose a topic first before entering study mode.</div>';
      return;
    }
    const { questions } = await loadTopicFile(topic.file);
    const session = {
      subject: subject.id,
      subjectName: subject.name,
      topic: topic.id,
      topicName: topic.name,
      startedAt: new Date().toISOString(),
      viewed: new Set(),
      answered: new Set(),
      correct: 0,
      questionIds: questions.map((item) => item.id),
    };

    let currentIndex = 0;
    let selectedAnswer = null;
    let revealedForCurrent = false;

    const title = byId('studyTitle');
    const sub = byId('studySubtitle');
    const counter = byId('questionCounter');
    const type = byId('questionType');
    const diff = byId('questionDifficulty');
    const text = byId('questionText');
    const caseBox = byId('caseBox');
    const caseText = byId('caseText');
    const image = byId('questionImage');
    const imageWrap = byId('imageWrap');
    const optionsRoot = byId('optionsRoot');
    const answerBox = byId('answerBox');
    const correctAnswer = byId('correctAnswer');
    const explanation = byId('explanation');
    const progressBar = byId('studyProgressBar');
    const progressText = byId('studyProgressText');

    function renderQuestion() {
      const question = questions[currentIndex];
      title.textContent = topic.name;
      sub.textContent = `${subject.name} • Focused Study Mode`;
      counter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
      type.textContent = question.type.replace('-', ' ');
      diff.textContent = question.difficulty;
      text.textContent = question.question;
      session.viewed.add(question.id);
      if (question.caseScenario) {
        caseBox.classList.remove('hidden');
        caseText.textContent = question.caseScenario;
      } else {
        caseBox.classList.add('hidden');
      }
      if (question.imageUrl) {
        imageWrap.classList.remove('hidden');
        image.src = question.imageUrl;
        image.alt = question.question;
      } else {
        imageWrap.classList.add('hidden');
        image.removeAttribute('src');
      }
      optionsRoot.innerHTML = '';
      selectedAnswer = null;
      revealedForCurrent = false;
      answerBox.classList.add('hidden');
      question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option';
        button.innerHTML = `<span class="option-index">${String.fromCharCode(65 + index)}</span><span>${option}</span>`;
        button.addEventListener('click', () => {
          selectedAnswer = option;
          qsa('.option', optionsRoot).forEach((node) => node.classList.remove('selected'));
          button.classList.add('selected');
        });
        optionsRoot.appendChild(button);
      });
      updateProgress();
    }

    function updateProgress() {
      const percent = Math.round((session.viewed.size / questions.length) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}% topic coverage`;
    }

    function revealAnswerNow() {
      const question = questions[currentIndex];
      revealedForCurrent = true;
      answerBox.classList.remove('hidden');
      correctAnswer.textContent = question.correctAnswer;
      explanation.textContent = question.explanation;
      const correct = selectedAnswer === question.correctAnswer;
      if (selectedAnswer) {
        qsa('.option', optionsRoot).forEach((node) => {
          const optionValue = node.dataset.option;
          if (optionValue === question.correctAnswer) node.classList.add('correct');
          if (optionValue === selectedAnswer && selectedAnswer !== question.correctAnswer) node.classList.add('incorrect');
        });
      }
      if (!session.answered.has(question.id)) {
        session.answered.add(question.id);
        if (correct) session.correct += 1;
        recordStudyEvent({ question, selectedAnswer, correct, revealed: true });
      }
    }

    function finalizeSession() {
      recordStudySession({
        subject: subject.id,
        subjectName: subject.name,
        topic: topic.id,
        topicName: topic.name,
        date: new Date().toISOString(),
        completedQuestions: session.viewed.size,
        totalQuestions: questions.length,
        percent: Math.round((session.viewed.size / questions.length) * 100),
        successRate: session.answered.size ? Math.round((session.correct / session.answered.size) * 100) : 0,
      });
    }

    byId('revealAnswerBtn').addEventListener('click', revealAnswerNow);
    byId('prevQuestionBtn').addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderQuestion();
      }
    });
    byId('nextQuestionBtn').addEventListener('click', () => {
      if (!revealedForCurrent) revealAnswerNow();
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        renderQuestion();
      } else {
        finalizeSession();
        byId('studyFinishNotice').classList.remove('hidden');
      }
    });

    renderQuestion();
    window.addEventListener('beforeunload', finalizeSession, { once: true });
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

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Subjects';
    subjectSelect.appendChild(allOption);
    state.index.subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = subject.name;
      subjectSelect.appendChild(option);
    });

    function renderTopicCheckboxes() {
      const subject = getSubject(subjectSelect.value);
      topicCheckboxes.innerHTML = '';
      if (modeSelect.value !== 'single') {
        topicCheckboxes.classList.add('hidden');
        return;
      }
      topicCheckboxes.classList.remove('hidden');
      if (!subject) return;
      subject.topics.forEach((topic) => {
        const label = document.createElement('label');
        label.className = 'option';
        label.innerHTML = `<input type="checkbox" value="${topic.id}" checked><div><strong>${topic.name}</strong><div class="small text-muted">${topic.questionCount} questions</div></div>`;
        topicCheckboxes.appendChild(label);
      });
    }

    subjectSelect.addEventListener('change', renderTopicCheckboxes);
    modeSelect.addEventListener('change', renderTopicCheckboxes);
    renderTopicCheckboxes();

    byId('startExamBtn').addEventListener('click', async () => {
      const questionPool = [];
      const chosenDifficulty = difficultySelect.value;
      const selectedSubjectId = subjectSelect.value;
      const subject = selectedSubjectId === 'all' ? null : getSubject(selectedSubjectId);
      if (modeSelect.value === 'single' && !subject) {
        alert('Choose one subject for Single Subject Final mode.');
        return;
      }
      let topics = subject ? subject.topics : [];
      if (modeSelect.value === 'single') {
        const chosen = qsa('input[type="checkbox"]:checked', topicCheckboxes).map((input) => input.value);
        topics = subject.topics.filter((topic) => chosen.includes(topic.id));
      } else if (selectedSubjectId === 'all') {
        topics = state.index.subjects.flatMap((item) => item.topics);
      }
      if (selectedSubjectId === 'all') {
        topics = state.index.subjects.flatMap((item) => item.topics);
      }
      for (const topic of topics) {
        const data = await loadTopicFile(topic.file);
        questionPool.push(...data.questions);
      }
      let filtered = chosenDifficulty === 'all' ? questionPool : questionPool.filter((question) => question.difficulty === chosenDifficulty);
      filtered = [...filtered].sort(() => Math.random() - 0.5);
      const examQuestions = filtered.slice(0, Number(countInput.value || 10));
      if (!examQuestions.length) {
        alert('No questions available for this exam configuration.');
        return;
      }
      startExamSession(examQuestions, Number(minutesInput.value || 30), {
        mode: modeSelect.value,
        subject: subjectSelect.value,
        difficulty: chosenDifficulty,
      });
    });

    function startExamSession(questions, minutes, meta) {
      configRoot.classList.add('hidden');
      reviewRoot.classList.add('hidden');
      liveRoot.classList.remove('hidden');
      let currentIndex = 0;
      const answers = {};
      let endAt = Date.now() + minutes * 60 * 1000;
      let timerId;

      const counter = byId('examCounter');
      const timer = byId('examTimer');
      const questionText = byId('examQuestionText');
      const optionsRoot = byId('examOptionsRoot');
      const progress = byId('examProgressBar');
      const caseBox = byId('examCaseBox');
      const caseText = byId('examCaseText');

      function renderExamQuestion() {
        const question = questions[currentIndex];
        counter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
        questionText.textContent = question.question;
        progress.style.width = `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`;
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
          button.innerHTML = `<span class="option-index">${String.fromCharCode(65 + index)}</span><span>${option}</span>`;
          button.addEventListener('click', () => {
            answers[question.id] = option;
            renderExamQuestion();
          });
          optionsRoot.appendChild(button);
        });
      }

      function submitExam() {
        clearInterval(timerId);
        liveRoot.classList.add('hidden');
        reviewRoot.classList.remove('hidden');
        const score = questions.reduce((total, question) => total + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
        const percent = Math.round((score / questions.length) * 100);
        byId('examResultScore').textContent = `${percent}%`;
        byId('examResultMeta').textContent = `${score} correct out of ${questions.length}`;
        const reviewList = byId('examReviewList');
        reviewList.innerHTML = questions.map((question, index) => {
          const userAnswer = answers[question.id] || 'No answer';
          const isCorrect = userAnswer === question.correctAnswer;
          return `
            <article class="review-item">
              <div class="meta"><span>Question ${index + 1}</span><span>${question.subject}</span><span>${question.topic}</span></div>
              <h4>${question.question}</h4>
              ${question.caseScenario ? `<div class="case-box">${question.caseScenario}</div>` : ''}
              <p class="review-answer ${isCorrect ? 'correct' : 'incorrect'}"><strong>Your answer:</strong> ${userAnswer}</p>
              <p><strong>Correct answer:</strong> ${question.correctAnswer}</p>
              <p class="text-muted">${question.explanation}</p>
            </article>
          `;
        }).join('');
        recordExamSession({
          date: new Date().toISOString(),
          mode: meta.mode,
          subject: meta.subject,
          difficulty: meta.difficulty,
          totalQuestions: questions.length,
          score,
          percent,
        });
      }

      timerId = setInterval(() => {
        const remaining = Math.max(0, endAt - Date.now());
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
    byId('metricSolved').textContent = attempts;
    byId('metricSessions').textContent = progress.studyHistory.length;
    byId('metricExams').textContent = progress.examHistory.length;

    const subjectProgress = state.index.subjects.map((subject) => {
      const keys = Object.values(progress.topicCompletion).filter((item) => item.subject === subject.id);
      const percent = keys.length ? Math.round(keys.reduce((sum, item) => sum + item.percent, 0) / keys.length) : 0;
      return { name: subject.name, percent };
    });
    byId('subjectProgressList').innerHTML = subjectProgress.map((item) => `
      <div class="progress-item">
        <div class="card-top"><strong>${item.name} Progress</strong><span>${item.percent}%</span></div>
        <div class="progress-track"><div class="progress-bar" style="width:${item.percent}%"></div></div>
      </div>
    `).join('');

    const topicScores = {};
    Object.values(progress.questionStats).forEach((entry) => {
      const key = `${entry.subject}|${entry.topic}`;
      if (!topicScores[key]) topicScores[key] = { key, attempts: 0, correct: 0, subject: entry.subject, topic: entry.topic };
      topicScores[key].attempts += entry.attempts;
      topicScores[key].correct += entry.correct;
    });
    const sortedTopics = Object.values(topicScores).map((item) => ({
      ...item,
      percent: item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0,
      topicName: getTopic(item.subject, item.topic)?.name || item.topic,
      subjectName: getSubject(item.subject)?.name || item.subject,
    })).sort((a, b) => b.percent - a.percent);

    const strengths = sortedTopics.slice(0, 3);
    const weaknesses = [...sortedTopics].reverse().slice(0, 3);
    byId('strengthAreas').innerHTML = strengths.length ? strengths.map((item) => `
      <div class="activity-item"><strong>${item.topicName}</strong><div class="text-muted">${item.subjectName} • ${item.percent}% success</div></div>
    `).join('') : '<div class="empty-state">No enough study data yet.</div>';
    byId('weakAreas').innerHTML = weaknesses.length ? weaknesses.map((item) => `
      <div class="activity-item"><strong>${item.topicName}</strong><div class="text-muted">${item.subjectName} • ${item.percent}% success</div></div>
    `).join('') : '<div class="empty-state">No weak areas identified yet.</div>';

    const recent = [...progress.studyHistory, ...progress.examHistory]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    byId('recentActivity').innerHTML = recent.length ? recent.map((item) => `
      <div class="activity-item">
        <strong>${item.topicName || (getSubject(item.subject)?.name || item.subject)}${item.mode ? ' Final Exam' : ''}</strong>
        <div class="text-muted">${item.subjectName || getSubject(item.subject)?.name || ''} • ${formatDate(item.date)}</div>
        <div class="small text-muted">${item.totalQuestions ? `${item.totalQuestions} questions` : `${item.completedQuestions} reviewed`}</div>
      </div>
    `).join('') : '<div class="empty-state">Your last 5 study or exam sessions will appear here.</div>';

    const recommendation = weaknesses[0];
    byId('recommendationCard').innerHTML = recommendation ? `
      <strong>Recommended Review</strong>
      <h3>${recommendation.topicName}</h3>
      <p class="text-muted">This topic currently has your lowest success rate. A focused review may strengthen retention.</p>
      <a class="btn btn-primary" href="study.html?subject=${encodeURIComponent(recommendation.subject)}&topic=${encodeURIComponent(recommendation.topic)}">Review Topic</a>
    ` : '<strong>Recommended Review</strong><p class="text-muted">Start a few study sessions and your personalized recommendation will appear here.</p>';

    const badges = [
      {
        title: 'Studied 100 Pharmacology Questions',
        earned: Object.values(progress.questionStats).filter((item) => item.subject === 'pharmacology').reduce((sum, item) => sum + item.attempts, 0) >= 100,
      },
      {
        title: 'Completed 5 Study Sessions',
        earned: progress.studyHistory.length >= 5,
      },
      {
        title: 'Achieved 80%+ in Clinical Pharmacy',
        earned: sortedTopics.some((item) => item.subject === 'clinical-pharmacy' && item.percent >= 80),
      },
    ];
    byId('badgeList').innerHTML = badges.map((badge) => `
      <div class="badge-item ${badge.earned ? 'earned' : ''}"><strong>${badge.title}</strong><div class="text-muted">${badge.earned ? 'Unlocked' : 'Not unlocked yet'}</div></div>
    `).join('');
  }

  function injectSharedAdminDialog() {
    if (byId('adminDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.id = 'adminDialog';
    dialog.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="brand"><div class="brand-mark">PN</div><div><div>Admin Panel</div><div class="small" style="opacity:.8;">Ctrl + Shift + A</div></div></div>
          <div class="admin-menu">
            <button class="btn admin-tab active" data-admin-tab="settings">GitHub Settings</button>
            <button class="btn admin-tab" data-admin-tab="subjects">Subjects</button>
            <button class="btn admin-tab" data-admin-tab="topics">Topics</button>
            <button class="btn admin-tab" data-admin-tab="questions">Questions</button>
            <button class="btn btn-danger" id="closeAdminBtn">Close</button>
          </div>
        </aside>
        <section class="admin-body">
          <div data-admin-panel="settings">
            <h2>GitHub Repository Settings</h2>
            <p class="text-muted">Store your PAT (Classic) and repository target locally in this browser. Admin actions will push JSON updates directly to GitHub via the API.</p>
            <div class="form-grid">
              <input id="ghOwner" class="text-input" placeholder="GitHub owner / username">
              <input id="ghRepo" class="text-input" placeholder="Repository name">
              <input id="ghBranch" class="text-input" placeholder="Branch (example: main)">
              <input id="ghToken" class="text-input" placeholder="Personal Access Token (Classic)">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="saveGithubConfigBtn">Save Settings</button>
              <button class="btn btn-soft" id="testGithubBtn">Test Repository Access</button>
            </div>
            <div id="githubNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="subjects" class="hidden">
            <h2>Subject Management</h2>
            <p class="text-muted">Add a subject. Subject IDs are generated automatically in slug format.</p>
            <div class="form-grid">
              <input id="newSubjectName" class="text-input full" placeholder="Subject name">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="createSubjectBtn">Create Subject</button>
            </div>
            <div id="subjectNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="topics" class="hidden">
            <h2>Topic Management</h2>
            <p class="text-muted">Add a topic under a subject. Topic JSON files are created automatically.</p>
            <div class="form-grid">
              <select id="topicSubjectSelect" class="select-box"></select>
              <input id="newTopicName" class="text-input" placeholder="Topic name">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="createTopicBtn">Create Topic</button>
            </div>
            <div id="topicNotice" class="notice hidden"></div>
          </div>

          <div data-admin-panel="questions" class="hidden">
            <h2>Question Management</h2>
            <p class="text-muted">Create a question and save it directly into the correct topic JSON file on GitHub.</p>
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
              <textarea id="questionOptionsInput" class="textarea full" placeholder="Options, one per line"></textarea>
              <input id="questionCorrectAnswer" class="text-input full" placeholder="Correct answer (must match one option exactly)">
              <textarea id="questionExplanation" class="textarea full" placeholder="Explanation"></textarea>
              <textarea id="questionCaseScenario" class="textarea full" placeholder="Case scenario (optional)"></textarea>
              <input id="questionImageUrl" class="text-input full" placeholder="Image URL (optional)">
            </div>
            <div class="question-actions">
              <button class="btn btn-primary" id="createQuestionBtn">Save Question to GitHub</button>
            </div>
            <div id="questionNotice" class="notice hidden"></div>
          </div>
        </section>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  function setNotice(id, type, message) {
    const element = byId(id);
    if (!element) return;
    element.className = `notice ${type}`;
    element.textContent = message;
  }

  function getGithubConfig() {
    return readStorage(STORAGE_KEYS.github, { owner: '', repo: '', branch: 'main', token: '' });
  }

  function saveGithubConfig() {
    const config = {
      owner: byId('ghOwner').value.trim(),
      repo: byId('ghRepo').value.trim(),
      branch: byId('ghBranch').value.trim() || 'main',
      token: byId('ghToken').value.trim(),
    };
    writeStorage(STORAGE_KEYS.github, config);
    return config;
  }

  function populateGithubFields() {
    const config = getGithubConfig();
    ['Owner', 'Repo', 'Branch', 'Token'].forEach((key) => {
      const input = byId(`gh${key}`);
      if (input) input.value = config[key.toLowerCase()] || '';
    });
  }

  async function githubRequest(path, options = {}) {
    const config = getGithubConfig();
    if (!config.owner || !config.repo || !config.token) throw new Error('Missing GitHub settings. Save owner, repo, branch, and token first.');
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    const response = await fetch(url + (options.method === 'GET' || !options.method ? `?ref=${encodeURIComponent(config.branch)}` : ''), {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `GitHub API request failed for ${path}`);
    }
    return response.json();
  }

  async function githubGetFile(path) {
    try {
      const data = await githubRequest(path, { method: 'GET' });
      const content = atob(data.content.replace(/\n/g, ''));
      return { sha: data.sha, json: JSON.parse(content), raw: content };
    } catch (error) {
      if (String(error.message).includes('404')) return null;
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

  function populateSubjectSelects() {
    const subjectSelectIds = ['topicSubjectSelect', 'questionSubjectSelect', 'examSubject'];
    subjectSelectIds.forEach((id) => {
      const select = byId(id);
      if (!select || select.dataset.bound === 'true') return;
      if (id === 'examSubject') return;
      select.innerHTML = '';
      state.index.subjects.forEach((subject) => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        select.appendChild(option);
      });
      select.dataset.bound = 'true';
    });

    const questionSubjectSelect = byId('questionSubjectSelect');
    const questionTopicSelect = byId('questionTopicSelect');
    if (questionSubjectSelect && questionTopicSelect) {
      const syncTopics = () => {
        const subject = getSubject(questionSubjectSelect.value);
        questionTopicSelect.innerHTML = '';
        if (!subject) return;
        subject.topics.forEach((topic) => {
          const option = document.createElement('option');
          option.value = topic.id;
          option.textContent = topic.name;
          questionTopicSelect.appendChild(option);
        });
      };
      questionSubjectSelect.onchange = syncTopics;
      syncTopics();
    }
  }

  async function createSubject() {
    const name = byId('newSubjectName').value.trim();
    if (!name) return setNotice('subjectNotice', 'error', 'Enter a subject name.');
    const subjectId = slugify(name);
    const existing = state.index.subjects.find((subject) => subject.id === subjectId);
    if (existing) return setNotice('subjectNotice', 'error', 'Subject already exists.');
    state.index.subjects.push({ id: subjectId, name, topics: [] });
    await githubPutJson('data/index.json', state.index, `Add subject: ${name}`);
    setNotice('subjectNotice', 'success', `Subject "${name}" created and pushed to GitHub.`);
    byId('newSubjectName').value = '';
    populateSubjectSelects();
  }

  async function createTopic() {
    const subjectId = byId('topicSubjectSelect').value;
    const name = byId('newTopicName').value.trim();
    if (!subjectId || !name) return setNotice('topicNotice', 'error', 'Select a subject and enter a topic name.');
    const subject = getSubject(subjectId);
    const topicId = slugify(name);
    if (subject.topics.some((topic) => topic.id === topicId)) return setNotice('topicNotice', 'error', 'Topic already exists in this subject.');
    const path = `data/${subjectId}/${topicId}.json`;
    subject.topics.push({ id: topicId, name, file: path, questionCount: 0 });
    await githubPutJson('data/index.json', state.index, `Add topic: ${name}`);
    await githubPutJson(path, { questions: [] }, `Create topic file: ${name}`);
    setNotice('topicNotice', 'success', `Topic "${name}" created and pushed to GitHub.`);
    byId('newTopicName').value = '';
    populateSubjectSelects();
  }

  async function createQuestion() {
    const subjectId = byId('questionSubjectSelect').value;
    const topicId = byId('questionTopicSelect').value;
    const type = byId('questionType').value;
    const difficulty = byId('questionDifficulty').value;
    const questionText = byId('questionTextInput').value.trim();
    const options = byId('questionOptionsInput').value.split('\n').map((item) => item.trim()).filter(Boolean);
    const correctAnswer = byId('questionCorrectAnswer').value.trim();
    const explanation = byId('questionExplanation').value.trim();
    const caseScenario = byId('questionCaseScenario').value.trim();
    const imageUrl = byId('questionImageUrl').value.trim();

    if (!subjectId || !topicId || !questionText || !correctAnswer || !explanation || !options.length) {
      return setNotice('questionNotice', 'error', 'Complete all required question fields.');
    }
    if (!options.includes(correctAnswer)) {
      return setNotice('questionNotice', 'error', 'Correct answer must match one option exactly.');
    }
    const topicMeta = getTopic(subjectId, topicId);
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
    await githubPutJson('data/index.json', state.index, `Update question count for ${topicMeta.name}`);
    setNotice('questionNotice', 'success', `Question saved to ${topicMeta.file} and index.json updated.`);
    ['questionTextInput', 'questionOptionsInput', 'questionCorrectAnswer', 'questionExplanation', 'questionCaseScenario', 'questionImageUrl'].forEach((id) => {
      byId(id).value = '';
    });
  }

  function initAdminEvents() {
    injectSharedAdminDialog();
    const dialog = byId('adminDialog');
    document.addEventListener('keydown', async (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        await loadIndex();
        populateGithubFields();
        populateSubjectSelects();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', 'open');
      }
    });
    byId('closeAdminBtn').addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));
    qsa('.admin-tab', dialog).forEach((button) => {
      button.addEventListener('click', () => {
        qsa('.admin-tab', dialog).forEach((item) => item.classList.remove('active'));
        qsa('[data-admin-panel]', dialog).forEach((panel) => panel.classList.add('hidden'));
        button.classList.add('active');
        qs(`[data-admin-panel="${button.dataset.adminTab}"]`, dialog).classList.remove('hidden');
      });
    });

    byId('saveGithubConfigBtn').addEventListener('click', () => {
      saveGithubConfig();
      setNotice('githubNotice', 'success', 'GitHub settings saved locally in this browser.');
    });
    byId('testGithubBtn').addEventListener('click', async () => {
      try {
        saveGithubConfig();
        await githubGetFile('data/index.json');
        setNotice('githubNotice', 'success', 'GitHub repository access is working.');
      } catch (error) {
        setNotice('githubNotice', 'error', error.message);
      }
    });
    byId('createSubjectBtn').addEventListener('click', () => createSubject().catch((error) => setNotice('subjectNotice', 'error', error.message)));
    byId('createTopicBtn').addEventListener('click', () => createTopic().catch((error) => setNotice('topicNotice', 'error', error.message)));
    byId('createQuestionBtn').addEventListener('click', () => createQuestion().catch((error) => setNotice('questionNotice', 'error', error.message)));
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
