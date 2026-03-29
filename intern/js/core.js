(function () {
  'use strict';

  const InternCore = {
    config: {
      appName: 'Pharmacy Nexus Intern',
      setSizeDefault: 20,
      storageKeys: {
        config: 'pn_intern_config_v1',
        topicsCache: 'pn_intern_topics_cache_v1',
        session: 'pn_intern_session_v1',
        practiceReview: 'pn_intern_practice_review_v1',
        practiceRetry: 'pn_intern_practice_retry_v1',
        examReview: 'pn_intern_exam_review_v1',
        examRetry: 'pn_intern_exam_retry_v1'
      }
    },

    state: {
      topics: [],
      topicMap: new Map(),
      selectedTopics: [],
      currentSession: null
    },

    el(tag, cls, html) {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (html !== undefined) node.innerHTML = html;
      return node;
    },

    qs(selector, scope = document) {
      return scope.querySelector(selector);
    },

    qsa(selector, scope = document) {
      return [...scope.querySelectorAll(selector)];
    },

    readStore(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch (_) {
        return fallback;
      }
    },

    writeStore(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },

    formatNumber(value) {
      return new Intl.NumberFormat('en-US').format(value || 0);
    },

    setTopics(topics) {
      this.state.topics = Array.isArray(topics) ? topics : [];
      this.state.topicMap.clear();
      this.state.topics.forEach((topic) => {
        this.state.topicMap.set(topic.id, topic);
      });
    },

    getTopicById(id) {
      return this.state.topicMap.get(id) || null;
    },

    setSession(data) {
      this.state.currentSession = data || null;
      this.writeStore(this.config.storageKeys.session, data || null);
    },

    getSession() {
      if (this.state.currentSession) return this.state.currentSession;
      const saved = this.readStore(this.config.storageKeys.session, null);
      this.state.currentSession = saved;
      return saved;
    },

    getInternHomeLink() {
      return window.location.pathname.includes('/intern/pages/') ? '../index.html' : './index.html';
    },

    getMainHomeLink() {
      return window.location.pathname.includes('/intern/pages/') ? '../../index.html' : '../index.html';
    },

    getMainDashboardLink() {
      return window.location.pathname.includes('/intern/pages/') ? '../../dashboard.html' : '../dashboard.html';
    },

    getMainSavedLink() {
      return window.location.pathname.includes('/intern/pages/') ? '../../saved.html' : '../saved.html';
    },

    getAdminLink() {
      return window.location.pathname.includes('/intern/pages/') ? './admin.html' : './pages/admin.html';
    },

    bindAdminShortcut() {
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === '9') {
          event.preventDefault();
          window.location.href = this.getAdminLink();
        }
      });
    },

    createShell() {
      const root = document.getElementById('intern-shell');
      root.innerHTML = `
        <header class="site-header">
          <div class="container navbar">
            <a class="brand" href="${this.getMainHomeLink()}">
              <span class="brand-mark">PN</span>
              <span>Pharmacy Nexus</span>
            </a>

            <nav class="nav-menu" style="display:flex;">
              <a class="nav-link" href="${this.getMainHomeLink()}">Home</a>
              <a class="nav-link is-active" href="${this.getInternHomeLink()}">Intern</a>
              <a class="nav-link" href="${this.getMainDashboardLink()}">Dashboard</a>
              <a class="nav-link" href="${this.getMainSavedLink()}">Saved</a>
            </nav>
          </div>
        </header>

        <main class="main-section">
          <div class="container">
            <div class="intern-topbar">
              <a class="intern-back-link" href="${this.getMainHomeLink()}">← Back to main platform</a>
            </div>
            <div id="internPageRoot"></div>
          </div>
        </main>
      `;

      this.bindAdminShortcut();
    }
  };

  window.InternCore = InternCore;
})();
