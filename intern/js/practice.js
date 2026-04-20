(function () {
  'use strict';

  const practiceState = {
  topics: [],
  questions: [],
  answers: {},
  currentIndex: 0,
  autoNextEnabled: false,
  autoNextSeconds: 3,
  autoNextTimerId: null
};

  function renderSetupPage() {
    const root = InternCore.qs('#internPageRoot');

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Practice Mode</h2>
          <p>Select topics and number of questions, then start a mock exam with instant feedback and summaries.</p>
        </div>
      </section>

      <section class="card">
        <div class="input-row two">
          <div>
            <label class="muted">Search topics</label>
            <input class="input" id="topicSearchInput" placeholder="Type to search topics..." />
          </div>
          <div>
            <label class="muted">Number of questions</label>
            <input class="input" id="questionCountInput" type="number" min="1" value="10" />
          </div>
        </div>

        <div class="action-row" style="justify-content:flex-start; margin-top:16px;">
          <button class="btn btn-light" id="selectAllTopicsBtn" type="button">Select All</button>
          <button class="btn btn-light" id="clearAllTopicsBtn" type="button">Clear All</button>
        </div>

        <div style="margin-top:18px;">
          <div class="meta-row">
            <span class="badge" id="selectedTopicsCountBadge">0 Selected</span>
            <span class="tag" id="availableTopicsCountBadge">0 Topics Available</span>
          </div>
        </div>

        <div id="practiceTopicsArea" style="margin-top:18px;"></div>

        <div id="practiceSetupMessage"></div>

        <div class="action-row" style="justify-content:flex-start; margin-top:22px;">
          <button class="btn btn-primary" id="startPracticeBtn" type="button">Start Practice Exam</button>
          <a class="btn btn-light" href="../index.html">Back</a>
        </div>
      </section>
    `;

    bindSetupEvents();
    drawTopics('');
  }

  function drawTopics(searchTerm) {
    const area = InternCore.qs('#practiceTopicsArea');
    const selectedIds = new Set(
      practiceState.topics.filter((topic) => topic.selected).map((topic) => topic.id)
    );

    const filtered = practiceState.topics.filter((topic) => {
      return topic.title.toLowerCase().includes((searchTerm || '').toLowerCase());
    });

    InternCore.qs('#selectedTopicsCountBadge').textContent = `${selectedIds.size} Selected`;
    InternCore.qs('#availableTopicsCountBadge').textContent = `${practiceState.topics.length} Topics Available`;

    if (!filtered.length) {
      area.innerHTML = `<div class="intern-empty">No topics matched your search.</div>`;
      return;
    }

area.innerHTML = `
  <div class="topic-choice-grid">
    ${filtered.map((topic) => `
      <label class="topic-choice-card ${topic.selected ? 'is-selected' : ''}">
        <input
          type="checkbox"
          class="practice-topic-checkbox"
          value="${topic.id}"
          ${topic.selected ? 'checked' : ''}
        />

        <div class="topic-choice-main">
          <div class="topic-choice-top">
            <strong class="topic-choice-title">${topic.title}</strong>
            <span class="topic-choice-count">${InternCore.formatNumber(topic.questions_count)} Qs</span>
          </div>

          <p class="topic-choice-desc">
            ${topic.description || 'No description available yet.'}
          </p>
        </div>
      </label>
    `).join('')}
  </div>
`;
    InternCore.qsa('.practice-topic-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const topic = practiceState.topics.find((item) => item.id === event.target.value);
        if (topic) topic.selected = event.target.checked;
        drawTopics(InternCore.qs('#topicSearchInput').value);
      });
    });
  }

  function bindSetupEvents() {
    InternCore.qs('#topicSearchInput').addEventListener('input', (event) => {
      drawTopics(event.target.value);
    });

    InternCore.qs('#selectAllTopicsBtn').addEventListener('click', () => {
      practiceState.topics.forEach((topic) => {
        topic.selected = true;
      });
      drawTopics(InternCore.qs('#topicSearchInput').value);
    });

    InternCore.qs('#clearAllTopicsBtn').addEventListener('click', () => {
      practiceState.topics.forEach((topic) => {
        topic.selected = false;
      });
      drawTopics(InternCore.qs('#topicSearchInput').value);
    });

    InternCore.qs('#startPracticeBtn').addEventListener('click', startPracticeSession);
  }

  async function startPracticeSession() {
    const selectedTopicIds = practiceState.topics
      .filter((topic) => topic.selected)
      .map((topic) => topic.id);

    const count = Number(InternCore.qs('#questionCountInput').value || '10');
    const msg = InternCore.qs('#practiceSetupMessage');

    if (!selectedTopicIds.length) {
      msg.innerHTML = `<div class="message error">Please select at least one topic.</div>`;
      return;
    }

    if (!count || count < 1) {
      msg.innerHTML = `<div class="message error">Please enter a valid number of questions.</div>`;
      return;
    }

    try {
      const questions = await InternAPI.getPracticeQuestions({
        topicIds: selectedTopicIds,
        count
      });

      if (!questions.length) {
        msg.innerHTML = `<div class="message error">No questions were found for the selected topics.</div>`;
        return;
      }

      const session = await InternAPI.createExamSession({
        mode: 'practice',
        selectedTopicIds,
        questionCount: questions.length,
        timerMinutes: null
      });

      InternCore.setSession({
        type: 'practice',
        sessionId: session.id
      });

      practiceState.questions = questions;
      practiceState.answers = {};
      practiceState.currentIndex = 0;

      renderQuestionScreen();
    } catch (error) {
      console.error(error);
      msg.innerHTML = `<div class="message error">Failed to start practice session.</div>`;
    }
  }

  function loadRetrySessionIfExists() {
    const params = new URLSearchParams(window.location.search);
    const isRetryMode = params.get('retry') === '1';

    if (!isRetryMode) return false;

    const retryData = InternCore.readStore(InternCore.config.storageKeys.practiceRetry, null);
    if (!retryData || !Array.isArray(retryData.questions) || !retryData.questions.length) {
      return false;
    }

    practiceState.questions = retryData.questions;
    practiceState.answers = {};
    practiceState.currentIndex = 0;

    renderQuestionScreen();
    return true;
  }

  function getCorrectOption(question) {
    return question.options.find((option) => option.is_correct) || null;
  }

  function renderQuestionScreen() {
    const root = InternCore.qs('#internPageRoot');
    const question = practiceState.questions[practiceState.currentIndex];
    const answer = practiceState.answers[question.id];

    root.innerHTML = `
      <div class="study-shell">
        <aside class="side-panel">
          <div class="sidebar-card">
            <div class="tag">Practice Mode</div>
            <h3 style="margin:10px 0 12px;">Question ${practiceState.currentIndex + 1}</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${((practiceState.currentIndex + 1) / practiceState.questions.length) * 100}%"></div>
            </div>
            <div class="muted" style="margin-top:10px;">
              ${practiceState.currentIndex + 1} of ${practiceState.questions.length}
            </div>
            <div class="meta-row" style="margin-top:14px;">
              <span class="badge">${question.difficulty.toUpperCase()}</span>
              <span class="tag">${question.type}</span>
            </div>
          </div>

          <div class="sidebar-card">
            <h4 style="margin-top:0;">Topic</h4>
            <p class="muted">${question.topic_title}</p>
            <a class="btn btn-light" href="./practice.html">Back to setup</a>
          </div>
        </aside>

        <section class="question-card">
          <div class="question-top">
            <div>
              <div class="meta-row">
                <span class="badge">${question.topic_title}</span>
                <span class="tag">${question.type}</span>
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

          <div class="option-list" id="practiceOptionList"></div>

          <div class="explanation-box ${answer ? 'is-visible' : ''}" id="practiceExplanationBox">
            <strong>Explanation</strong>
            <div class="muted" style="margin-top:8px;">${answer ? question.explanation : ''}</div>
          </div>

          <div class="note-panel" id="summaryPanel" style="display:${answer && answer.showSummary ? 'block' : 'none'}; margin-top:18px;">
            <strong>Summary</strong>
            <div class="muted" style="margin-top:8px;">${question.summary}</div>
          </div>

          <div class="action-row">
            <button class="btn btn-light" id="prevQuestionBtn" ${practiceState.currentIndex === 0 ? 'disabled' : ''}>Previous</button>

            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-secondary" id="toggleSummaryBtn" ${answer ? '' : 'disabled'}>Summary</button>
              <button class="btn btn-dark" id="nextQuestionBtn">${practiceState.currentIndex === practiceState.questions.length - 1 ? 'Finish Practice' : 'Next'}</button>
            </div>
          </div>
        </section>
      </div>
    `;

    const optionList = InternCore.qs('#practiceOptionList');

    question.options.forEach((option) => {
      const button = InternCore.el('button', 'option-btn');
      button.type = 'button';
      button.textContent = option.text;

      if (answer) {
        button.classList.add('locked');

        if (option.is_correct) {
          button.classList.add('correct');
        }

        if (answer.selectedOptionId === option.id && !option.is_correct) {
          button.classList.add('wrong');
        }
      }

      button.addEventListener('click', () => {
        if (practiceState.answers[question.id]) return;

        practiceState.answers[question.id] = {
          selectedOptionId: option.id,
          selectedText: option.text,
          isCorrect: !!option.is_correct,
          showSummary: false
        };

        renderQuestionScreen();
      });

      optionList.appendChild(button);
    });

    InternCore.qs('#prevQuestionBtn').addEventListener('click', () => {
      if (practiceState.currentIndex > 0) {
        practiceState.currentIndex -= 1;
        renderQuestionScreen();
      }
    });

    InternCore.qs('#nextQuestionBtn').addEventListener('click', async () => {
      if (practiceState.currentIndex === practiceState.questions.length - 1) {
        await finishPracticeSession();
      } else {
        practiceState.currentIndex += 1;
        renderQuestionScreen();
      }
    });

    InternCore.qs('#toggleSummaryBtn').addEventListener('click', () => {
      if (!practiceState.answers[question.id]) return;
      practiceState.answers[question.id].showSummary = !practiceState.answers[question.id].showSummary;
      renderQuestionScreen();
    });
  }

  async function finishPracticeSession() {
    const rows = practiceState.questions.map((question) => {
      const answer = practiceState.answers[question.id] || null;
      const correctOption = getCorrectOption(question);

      return {
        question,
        selected: answer ? answer.selectedText : 'No answer selected',
        selectedOptionId: answer ? answer.selectedOptionId : null,
        correct: correctOption ? correctOption.text : '',
        isCorrect: answer ? answer.isCorrect : false,
        explanation: question.explanation,
        summary: question.summary
      };
    });

    const score = rows.filter((row) => row.isCorrect).length;
    InternCore.updateDashboardFromSession({
  mode: 'practice',
  rows,
  score,
  total: rows.length
});
    const currentSession = InternCore.getSession();

    try {
      if (currentSession?.sessionId) {
        await InternAPI.saveExamAnswers({
          sessionId: currentSession.sessionId,
          rows: rows.map((row) => ({
            question: row.question,
            selectedOptionId: row.selectedOptionId,
            selected: row.selected,
            isCorrect: row.isCorrect
          }))
        });

        await InternAPI.completeExamSession({
          sessionId: currentSession.sessionId,
          score,
          totalQuestions: rows.length
        });
      }
    } catch (error) {
      console.error('Failed to save practice session to Supabase:', error);
    }

    InternCore.writeStore(InternCore.config.storageKeys.practiceReview, {
      title: 'Intern Practice Review',
      score,
      total: rows.length,
      rows,
      createdAt: new Date().toISOString()
    });

    window.location.href = './practice-review.html';
  }

  async function initPracticePage() {
    InternCore.createShell();

    if (loadRetrySessionIfExists()) return;

    try {
      const topics = await InternAPI.getTopics();
      practiceState.topics = topics.map((topic) => ({
        ...topic,
        selected: false
      }));

      renderSetupPage();
    } catch (error) {
      console.error(error);
      const root = InternCore.qs('#internPageRoot');
      root.innerHTML = `
        <section class="card center">
          <div class="meta-row" style="justify-content:center;">
            <span class="badge">Error</span>
          </div>
          <h2>Failed to load topics.</h2>
          <p class="muted">Please check your Supabase connection and try again.</p>
          <div class="action-row" style="justify-content:center; margin-top:24px;">
            <a class="btn btn-light" href="../index.html">Back</a>
          </div>
        </section>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', initPracticePage);
})();
