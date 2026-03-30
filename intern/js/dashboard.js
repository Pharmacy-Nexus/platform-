(function () {
  'use strict';

  function percent(correct, total) {
    if (!total) return 0;
    return Math.round((correct / total) * 100);
  }

  function renderDashboard() {
    const root = InternCore.qs('#internPageRoot');
    const dashboard = InternCore.getDashboardData();

    const topicStats = Object.values(dashboard.topicStats || {}).map((row) => ({
      ...row,
      accuracy: percent(row.correct, row.total)
    }));

    const strongest = [...topicStats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
    const weakest = [...topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
    const averageAccuracy = percent(dashboard.totalCorrect, dashboard.totalSolved);

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Dashboard</h2>
          <p>Track your local progress across practice and real exams.</p>
        </div>
      </section>

      <section class="card" style="margin-bottom:24px;">
        <div class="meta-row">
          <span class="badge">Dashboard Notice</span>
        </div>
        <p class="muted" style="margin-top:12px;">
          Your dashboard is stored locally on your browser only.
          This helps keep the platform faster and lighter.
          To avoid losing your progress, you can export your dashboard as a PDF backup from time to time.
        </p>
      </section>

      <section class="summary-grid four" style="margin-bottom:24px;">
        <div class="card summary-card">
          <div class="muted">Total Attempts</div>
          <div class="big">${InternCore.formatNumber(dashboard.totalAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Practice Attempts</div>
          <div class="big">${InternCore.formatNumber(dashboard.practiceAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Real Exam Attempts</div>
          <div class="big">${InternCore.formatNumber(dashboard.realExamAttempts)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Average Accuracy</div>
          <div class="big">${averageAccuracy}%</div>
        </div>
      </section>

      <section class="summary-grid four" style="margin-bottom:24px;">
        <div class="card summary-card">
          <div class="muted">Solved Questions</div>
          <div class="big">${InternCore.formatNumber(dashboard.totalSolved)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Correct Answers</div>
          <div class="big">${InternCore.formatNumber(dashboard.totalCorrect)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Wrong Answers</div>
          <div class="big">${InternCore.formatNumber(dashboard.totalWrong)}</div>
        </div>
        <div class="card summary-card">
          <div class="muted">Tracked Topics</div>
          <div class="big">${InternCore.formatNumber(topicStats.length)}</div>
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
            <p>Performance is stored on this browser only.</p>
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
                          <span class="tag">${row.total} Questions</span>
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
            <h2>Recent Activity</h2>
            <p>Your latest local sessions on this browser.</p>
          </div>
        </div>

        ${
          dashboard.recentSessions?.length
            ? `
              <div class="review-list">
                ${dashboard.recentSessions.map((session) => `
                  <article class="review-card">
                    <div class="question-top">
                      <div>
                        <div class="meta-row">
                          <span class="badge">${session.mode}</span>
                          <span class="tag">${session.score}/${session.total}</span>
                          <span class="tag">${session.percent}%</span>
                        </div>
                        <div class="muted" style="margin-top:10px;">
                          ${new Date(session.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </article>
                `).join('')}
              </div>
            `
            : '<div class="intern-empty">No recent activity yet.</div>'
        }
      </section>
    `;
  }

  function initLocalDashboard() {
    InternCore.createShell();
    renderDashboard();
  }

  document.addEventListener('DOMContentLoaded', initLocalDashboard);
})();
