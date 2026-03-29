(function () {
  'use strict';

  function percent(score, total) {
    if (!total) return 0;
    return Math.round((score / total) * 100);
  }

  function groupByTopic(answers) {
    const map = new Map();

    answers.forEach((item) => {
      const topicName = item.intern_topics?.title || 'Unknown Topic';
      if (!map.has(topicName)) {
        map.set(topicName, { topic: topicName, total: 0, correct: 0, wrong: 0 });
      }

      const row = map.get(topicName);
      row.total += 1;
      if (item.is_correct) row.correct += 1;
      else row.wrong += 1;
    });

    return [...map.values()].map((row) => ({
      ...row,
      accuracy: percent(row.correct, row.total)
    }));
  }

  async function loadDashboardData() {
    const [sessions, answers, topics] = await Promise.all([
      InternAPI.getDashboardSessions(),
      InternAPI.getDashboardAnswers(),
      InternAPI.getAllTopics()
    ]);

    return { sessions, answers, topics };
  }

  function renderDashboard({ sessions, answers, topics }) {
    const root = InternCore.qs('#internPageRoot');

    const completedSessions = sessions.filter((session) => session.status === 'completed');
    const totalAttempts = completedSessions.length;
    const practiceAttempts = completedSessions.filter((s) => s.mode === 'practice').length;
    const realAttempts = completedSessions.filter((s) => s.mode === 'real').length;
    const totalSolved = answers.length;
    const totalCorrect = answers.filter((a) => a.is_correct).length;
    const avgAccuracy = percent(totalCorrect, totalSolved);

    const topicStats = groupByTopic(answers).sort((a, b) => b.accuracy - a.accuracy);
    const strongest = topicStats.slice(0, 5);
    const weakest = [...topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Dashboard</h2>
          <p>Track total attempts, solved questions, and topic-by-topic performance from Supabase.</p>
        </div>
      </section>

      <section class="summary-grid four" style="margin-bottom:24px;">
        <div class="card summary-card">
          <div class="muted">Total Attempts</div>
          <div class="big">${InternCore.formatNumber(totalAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Practice Attempts</div>
          <div class="big">${InternCore.formatNumber(practiceAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Real Exam Attempts</div>
          <div class="big">${InternCore.formatNumber(realAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Average Accuracy</div>
          <div class="big">${avgAccuracy}%</div>
        </div>
      </section>

      <section class="summary-grid four" style="margin-bottom:24px;">
        <div class="card summary-card">
          <div class="muted">Topics in Database</div>
          <div class="big">${InternCore.formatNumber(topics.length)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Solved Questions</div>
          <div class="big">${InternCore.formatNumber(totalSolved)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Correct Answers</div>
          <div class="big">${InternCore.formatNumber(totalCorrect)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Wrong Answers</div>
          <div class="big">${InternCore.formatNumber(totalSolved - totalCorrect)}</div>
        </div>
      </section>

      <section class="analysis-grid">
        <article class="card">
          <h3 style="margin-top:0;">Strongest Topics</h3>
          ${strongest.length ? strongest.map((row) => `
            <div class="metric-row">
              <span>${row.topic}</span>
              <strong>${row.accuracy}%</strong>
            </div>
          `).join('') : '<div class="muted">No data yet.</div>'}
        </article>

        <article class="card">
          <h3 style="margin-top:0;">Weakest Topics</h3>
          ${weakest.length ? weakest.map((row) => `
            <div class="metric-row">
              <span>${row.topic}</span>
              <strong>${row.accuracy}%</strong>
            </div>
          `).join('') : '<div class="muted">No data yet.</div>'}
        </article>
      </section>

      <section class="intern-section">
        <div class="section-header">
          <div>
            <h2>Topic Performance</h2>
            <p>Accuracy by topic based on saved answers.</p>
          </div>
        </div>

        ${
          topicStats.length
            ? `
              <div class="review-list">
                ${topicStats.map((row) => `
                  <article class="review-card">
                    <div class="question-top">
                      <div>
                        <h3 style="margin:0 0 8px;">${row.topic}</h3>
                        <div class="meta-row">
                          <span class="badge">${row.accuracy}% Accuracy</span>
                          <span class="tag">${row.total} Answers</span>
                          <span class="tag">${row.correct} Correct</span>
                          <span class="tag">${row.wrong} Wrong</span>
                        </div>
                      </div>
                    </div>
                  </article>
                `).join('')}
              </div>
            `
            : '<div class="intern-empty">No topic performance data yet.</div>'
        }
      </section>

      <section class="intern-section">
        <div class="section-header">
          <div>
            <h2>Recent Sessions</h2>
            <p>Latest completed practice and real exam sessions.</p>
          </div>
        </div>

        ${
          completedSessions.length
            ? `
              <div class="review-list">
                ${completedSessions.slice().reverse().slice(0, 10).map((session) => `
                  <article class="review-card">
                    <div class="question-top">
                      <div>
                        <div class="meta-row">
                          <span class="badge">${session.mode}</span>
                          <span class="tag">${session.score}/${session.total_questions}</span>
                          <span class="tag">${percent(session.score, session.total_questions)}%</span>
                          <span class="tag">${session.question_count} Questions</span>
                        </div>
                        <div class="muted" style="margin-top:10px;">
                          ${new Date(session.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </article>
                `).join('')}
              </div>
            `
            : '<div class="intern-empty">No completed sessions yet.</div>'
        }
      </section>
    `;
  }

  async function initInternDashboard() {
    InternCore.createShell();

    try {
      const data = await loadDashboardData();
      renderDashboard(data);
    } catch (error) {
      console.error(error);
      const root = InternCore.qs('#internPageRoot');
      root.innerHTML = `
        <section class="card center">
          <div class="meta-row" style="justify-content:center;">
            <span class="badge">Error</span>
          </div>
          <h2>Failed to load intern dashboard.</h2>
          <p class="muted">Please check Supabase permissions and data access.</p>
        </section>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', initInternDashboard);
})();
