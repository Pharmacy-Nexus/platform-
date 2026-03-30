(function () {
  'use strict';

  const InternCore = {
    config: {
      appName: 'Pharmacy Nexus Intern',
      setSizeDefault: 20,
      allowedAdminEmail: 'pharmacynexusofficial@gmail.com',
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

    removeStore(key) {
      localStorage.removeItem(key);
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

    getAdminLoginLink() {
      return window.location.pathname.includes('/intern/pages/') ? './admin-login.html' : './pages/admin-login.html';
    },

    getInternDashboardLink() {
      return window.location.pathname.includes('/intern/pages/') ? './dashboard.html' : './pages/dashboard.html';
    },

    async getCurrentUser() {
      try {
        const { data, error } = await InternSupabase.auth.getUser();
        if (error) return null;
        return data?.user || null;
      } catch (_) {
        return null;
      }
    },

    async isAllowedAdmin() {
      const user = await this.getCurrentUser();
      if (!user?.email) return false;
      return user.email.toLowerCase() === this.config.allowedAdminEmail.toLowerCase();
    },

    bindAdminShortcut() {
      document.addEventListener('keydown', async (event) => {
        const shortcut =
          event.ctrlKey &&
          event.shiftKey &&
          (event.code === 'Digit9' || event.code === 'Numpad9');

        if (!shortcut) return;

        event.preventDefault();

        const isAdmin = await this.isAllowedAdmin();
        window.location.href = isAdmin ? this.getAdminLink() : this.getAdminLoginLink();
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
              <a class="nav-link" href="${this.getInternDashboardLink()}">Intern Dashboard</a>
              <a class="nav-link" href="${this.getMainDashboardLink()}">Dashboard</a>
              <a class="nav-link" href="${this.getMainSavedLink()}">Saved</a>
            </nav>
          </div>
        </header>

        <main class="main-section">
          <div class="container">
            <div class="intern-topbar" style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
              <a class="intern-back-link" href="${this.getMainHomeLink()}">← Back to main platform</a>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <a class="btn btn-light" href="${this.getInternDashboardLink()}">Intern Dashboard</a>
                <button class="btn btn-light" id="adminLogoutBtn" type="button">Logout</button>
              </div>
            </div>
            <div id="internPageRoot"></div>
          </div>
        </main>
      `;

      const logoutBtn = this.qs('#adminLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await InternSupabase.auth.signOut();
          } catch (_) {}
          window.location.href = this.getAdminLoginLink();
        });
      }

      this.bindAdminShortcut();
    }
  };

  window.InternCore = InternCore;
})();
