(function () {
  'use strict';

  const examState = {
    topics: [],
    questions: [],
    answers: {},
    currentIndex: 0,
    remainingSeconds: 0,
    timerId: null
  };

  function renderSetupPage() {
    const root = InternCore.qs('#internPageRoot');

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Real Exam Mode</h2>
          <p>Build a timed exam using many selected topics, then review your score and performance by topic.</p>
        </div>
      </section>

      <section class="card">
        <div class="input-row three">
          <div>
            <label class="muted">Search topics</label>
            <input class="input" id="examTopicSearchInput" placeholder="Type to search topics..." />
          </div>
          <div>
            <label class="muted">Number of questions</label>
            <input class="input" id="examQuestionCountInput" type="number" min="1" value="10" />
          </div>
          <div>
            <label class="muted">Timer (minutes)</label>
            <input class="input" id="examTimerMinutesInput" type="number" min="1" value="20" />
          </div>
        </div>

        <div class="action-row" style="justify-content:flex-start; margin-top:16px;">
          <button class="btn btn-light" id="examSelectAllTopicsBtn" type="button">Select All</button>
          <button class="btn btn-light" id="examClearAllTopicsBtn" type="button">Clear All</button>
        </div>

        <div style="margin-top:18px;">
          <div class="meta-row">
            <span class="badge" id="examSelectedTopicsCountBadge">0 Selected</span>
            <span class="tag" id="examAvailableTopicsCountBadge">0 Topics Available</span>
          </div>
        </div>

        <div id="examTopicsArea" style="margin-top:18px;"></div>

        <div id="examSetupMessage"></div>

        <div class="action-row" style="justify-content:flex-start; margin-top:22px;">
          <button class="btn btn-primary" id="startRealExamBtn" type="button">Start Real Exam</button>
          <a class="btn btn-light" href="../index.html">Back</a>
        </div>
      </section>
    `;

    bindSetupEvents();
    drawTopics('');
  }

  function drawTopics(searchTerm) {
    const area = InternCore.qs('#examTopicsArea');
    const selectedIds = new Set(examState.topics.filter((topic) => topic.selected).map((topic) => topic.id));

    const filtered = examState.topics.filter((topic) => {
      return topic.title.toLowerCase().includes((searchTerm || '').toLowerCase());
    });

    InternCore.qs('#examSelectedTopicsCountBadge').textContent = `${selectedIds.size} Selected`;
    InternCore.qs('#examAvailableTopicsCountBadge').textContent = `${examState.topics.length} Topics Available`;

    if (!filtered.length) {
      area.innerHTML = `<div class="intern-empty">No topics matched your search.</div>`;
      return;
    }

    area.innerHTML = `
      <div class="analysis-grid">
        ${filtered.map((topic) => `
          <label class="panel" style="cursor:pointer;">
            <div style="display:flex; align-items:flex-start; gap:12px;">
              <input type="checkbox" class="exam-topic-checkbox" value="${topic.id}" ${topic.selected ? 'checked' : ''} />
              <div>
                <strong>${topic.title}</strong>
                <div class="muted" style="margin-top:6px;">${topic.description}</div>
                <div class="meta-row" style="margin-top:10px;">
                  <span class="tag">${InternCore.formatNumber(topic.questions_count)} Questions</span>
                </div>
              </div>
            </div>
          </label>
        `).join('')}
      </div>
    `;

    InternCore.qsa('.exam-topic-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const topic = examState.topics.find((item) => item.id === event.target.value);
        if (topic) topic.selected = event.target.checked;
        drawTopics(InternCore.qs('#examTopicSearchInput').value);
      });
    });
  }

  function bindSetupEvents() {
    InternCore.qs('#examTopicSearchInput').addEventListener('input', (event) => {
      drawTopics(event.target.value);
    });

    InternCore.qs('#examSelectAllTopicsBtn').addEventListener('click', () => {
      examState.topics.forEach((topic) => { topic.selected = true; });
      drawTopics(InternCore.qs('#examTopicSearchInput').value);
    });

    InternCore.qs('#examClearAllTopicsBtn').addEventListener('click', () => {
      examState.topics.forEach((topic) => { topic.selected = false; });
      drawTopics(InternCore.qs('#examTopicSearchInput').value);
    });

    InternCore.qs('#startRealExamBtn').addEventListener('click', startRealExam);
  }

  async function startRealExam() {
    const selectedTopicIds = examState.topics
      .filter((topic) => topic.selected)
      .map((topic) => topic.id);

    const count = Number(InternCore.qs('#examQuestionCountInput').value || '10');
    const minutes = Number(InternCore.qs('#examTimerMinutesInput').value || '20');
    const msg = InternCore.qs('#examSetupMessage');

    if (!selectedTopicIds.length) {
      msg.innerHTML = `<div class="message error">Please select at least one topic.</div>`;
      return;
    }

    if (!count || count < 1) {
      msg.innerHTML = `<div class="message error">Please enter a valid number of questions.</div>`;
      return;
    }

    if (!minutes || minutes < 1) {
      msg.innerHTML = `<div class="message error">Please enter a valid timer in minutes.</div>`;
      return;
    }

    const questions = await InternAPI.getExamQuestions({
      topicIds: selectedTopicIds,
      count
    });

    if (!questions.length) {
      msg.innerHTML = `<div class="message error">No questions were found for the selected topics.</div>`;
      return;
    }

    examState.questions = questions;
    examState.answers = {};
    examState.currentIndex = 0;
    examState.remainingSeconds = minutes * 60;

    renderExamScreen();
    startTimer();
  }

  function loadRetryExamIfExists() {
    const params = new URLSearchParams(window.location.search);
    const isRetryMode = params.get('retry') === '1';
    if (!isRetryMode) return false;

    const retryData = InternCore.readStore(InternCore.config.storageKeys.examRetry, null);
    if (!retryData || !Array.isArray(retryData.questions) || !retryData.questions.length) {
      return false;
    }

    examState.questions = retryData.questions;
    examState.answers = {};
    examState.currentIndex = 0;
    examState.remainingSeconds = 15 * 60;

    renderExamScreen();
    startTimer();
    return true;
  }

  function formatTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function startTimer() {
    clearInterval(examState.timerId);

    examState.timerId = setInterval(() => {
      examState.remainingSeconds -= 1;
      const timerEl = InternCore.qs('#examTimerValue');
      if (timerEl) timerEl.textContent = formatTimer(Math.max(examState.remainingSeconds, 0));

      if (examState.remainingSeconds <= 0) {
        clearInterval(examState.timerId);
        finishExam();
      }
    }, 1000);
  }

  function renderExamScreen() {
    const root = InternCore.qs('#internPageRoot');
    const question = examState.questions[examState.currentIndex];
    const selectedOptionId = examState.answers[question.id] || null;

    root.innerHTML = `
      <div class="study-shell">
        <aside class="side-panel">
          <div class="sidebar-card">
            <div class="tag">Real Exam</div>
            <div class="timer" id="examTimerValue">${formatTimer(examState.remainingSeconds)}</div>
            <div class="muted">Time remaining</div>
          </div>

          <div class="sidebar-card">
            <h4 style="margin-top:0;">Progress</h4>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${((examState.currentIndex + 1) / examState.questions.length) * 100}%"></div>
            </div>
            <div class="muted" style="margin-top:10px;">
              Question ${examState.currentIndex + 1} of ${examState.questions.length}
            </div>
            <div class="meta-row" style="margin-top:14px;">
              <span class="badge">${question.topic_title}</span>
              <span class="tag">${question.type}</span>
            </div>
          </div>

          <div class="sidebar-card">
            <div class="action-row" style="margin-top:0; justify-content:flex-start;">
              <button class="btn btn-danger" id="submitExamNowBtn" type="button">Submit Exam</button>
            </div>
          </div>
        </aside>

        <section class="question-card">
          <div class="question-top">
            <div>
              <div class="meta-row">
                <span class="badge">${question.topic_title}</span>
                <span class="tag">${question.type}</span>
                <span class="tag">${question.difficulty}</span>
              </div>
              <h2 class="question-title">${question.question_text}</h2>
            </div>
          </div>

          ${question.case_text ? `
            <div class="case-box">
              <strong>Case</strong>
              <div class="muted" style="margin-top:8px;">${question.case_text}</div>
            </div>
          ` : ''}

          ${question.image_url ? `
            <div style="margin-top:18px;">
              <img src="${question.image_url}" alt="Question visual" style="border-radius:22px; border:1px solid var(--border);" />
            </div>
          ` : ''}

          <div class="option-list" id="examOptionList"></div>

          <div class="action-row">
            <button class="btn btn-light" id="examPrevBtn" ${examState.currentIndex === 0 ? 'disabled' : ''}>Previous</button>
            <button class="btn btn-dark" id="examNextBtn">${examState.currentIndex === examState.questions.length - 1 ? 'Last Question' : 'Next'}</button>
          </div>
        </section>
      </div>
    `;

    const optionList = InternCore.qs('#examOptionList');

    question.options.forEach((option) => {
      const button = InternCore.el('button', `option-btn ${selectedOptionId === option.id ? 'ghost-correct' : ''}`);
      button.type = 'button';
      button.textContent = option.text;

      button.addEventListener('click', () => {
        examState.answers[question.id] = option.id;
        renderExamScreen();
      });

      optionList.appendChild(button);
    });

    InternCore.qs('#examPrevBtn').addEventListener('click', () => {
      if (examState.currentIndex > 0) {
        examState.currentIndex -= 1;
        renderExamScreen();
      }
    });

    InternCore.qs('#examNextBtn').addEventListener('click', () => {
      if (examState.currentIndex < examState.questions.length - 1) {
        examState.currentIndex += 1;
        renderExamScreen();
      }
    });

    InternCore.qs('#submitExamNowBtn').addEventListener('click', () => {
      const ok = window.confirm('Submit the exam now?');
      if (ok) finishExam();
    });
  }

  function finishExam() {
    clearInterval(examState.timerId);

    const rows = examState.questions.map((question) => {
      const selectedOptionId = examState.answers[question.id] || null;
      const selectedOption = question.options.find((option) => option.id === selectedOptionId) || null;
      const correctOption = question.options.find((option) => option.is_correct) || null;

      return {
        question,
        selected: selectedOption ? selectedOption.text : 'No answer selected',
        selectedOptionId,
        correct: correctOption ? correctOption.text : '',
        isCorrect: selectedOption ? !!selectedOption.is_correct : false,
        explanation: question.explanation,
        summary: question.summary
      };
    });

    const score = rows.filter((row) => row.isCorrect).length;

    const byTopic = {};
    rows.forEach((row) => {
      const key = row.question.topic_title;
      byTopic[key] = byTopic[key] || { total: 0, correct: 0, wrong: 0 };
      byTopic[key].total += 1;
      if (row.isCorrect) byTopic[key].correct += 1;
      else byTopic[key].wrong += 1;
    });

    const topicStats = Object.entries(byTopic).map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      wrong: stats.wrong,
      accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
    }));

    const strongest = [...topicStats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
    const weakest = [...topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

    InternCore.writeStore(InternCore.config.storageKeys.examReview, {
      title: 'Intern Real Exam Review',
      score,
      total: rows.length,
      rows,
      topicStats,
      strongest,
      weakest,
      createdAt: new Date().toISOString()
    });

    window.location.href = './exam-review.html';
  }

  async function initExamPage() {
    InternCore.createShell();

    if (loadRetryExamIfExists()) return;

    const topics = await InternAPI.getTopics();
    examState.topics = topics.map((topic) => ({
      ...topic,
      selected: false
    }));

    renderSetupPage();
  }

  document.addEventListener('DOMContentLoaded', initExamPage);
})();
