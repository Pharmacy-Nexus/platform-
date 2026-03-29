(function () {
  'use strict';

  const adminState = {
    topics: []
  };

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function renderAdminPage() {
    const root = InternCore.qs('#internPageRoot');

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Admin Panel</h2>
          <p>Manage internship topics and questions from one place.</p>
        </div>
      </section>

      <section class="analysis-grid">
        <article class="card">
          <h3 style="margin-top:0;">Add Topic</h3>
          <div class="input-row two">
            <div>
              <label class="muted">Topic title</label>
              <input class="input" id="adminTopicTitle" placeholder="e.g. Hypertension" />
            </div>
            <div>
              <label class="muted">Slug</label>
              <input class="input" id="adminTopicSlug" placeholder="auto-generated or custom" />
            </div>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Description</label>
            <textarea class="textarea" id="adminTopicDescription" placeholder="Short topic description"></textarea>
          </div>

          <div class="input-row two" style="margin-top:16px;">
            <div>
              <label class="muted">Sort order</label>
              <input class="input" id="adminTopicSortOrder" type="number" value="0" />
            </div>
            <div>
              <label class="muted">Status</label>
              <select class="select" id="adminTopicStatus">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div id="adminTopicMessage"></div>

          <div class="action-row" style="justify-content:flex-start;">
            <button class="btn btn-primary" id="createTopicBtn" type="button">Create Topic</button>
          </div>
        </article>

        <article class="card">
          <h3 style="margin-top:0;">Add Question</h3>

          <div class="input-row two">
            <div>
              <label class="muted">Topic</label>
              <select class="select" id="adminQuestionTopic"></select>
            </div>
            <div>
              <label class="muted">Question type</label>
              <select class="select" id="adminQuestionType">
                <option value="mcq">MCQ</option>
                <option value="true_false">True / False</option>
                <option value="image_mcq">Image with MCQ</option>
                <option value="case">Case</option>
              </select>
            </div>
          </div>

          <div class="input-row two" style="margin-top:16px;">
            <div>
              <label class="muted">Difficulty</label>
              <select class="select" id="adminQuestionDifficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label class="muted">Status</label>
              <select class="select" id="adminQuestionStatus">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Question text</label>
            <textarea class="textarea" id="adminQuestionText" placeholder="Write the question here"></textarea>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Case text (optional)</label>
            <textarea class="textarea" id="adminCaseText" placeholder="Case scenario if question type is case"></textarea>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Image URL (optional)</label>
            <input class="input" id="adminImageUrl" placeholder="https://..." />
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Explanation</label>
            <textarea class="textarea" id="adminExplanation" placeholder="Explain why the correct answer is right"></textarea>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Summary</label>
            <textarea class="textarea" id="adminSummary" placeholder="Short summary for quick review"></textarea>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Options</label>
            <div class="input-row two">
              <input class="input admin-option-input" data-index="0" placeholder="Option 1" />
              <input class="input admin-option-input" data-index="1" placeholder="Option 2" />
              <input class="input admin-option-input" data-index="2" placeholder="Option 3" />
              <input class="input admin-option-input" data-index="3" placeholder="Option 4" />
            </div>
          </div>

          <div style="margin-top:16px;">
            <label class="muted">Correct option</label>
            <select class="select" id="adminCorrectOption">
              <option value="0">Option 1</option>
              <option value="1">Option 2</option>
              <option value="2">Option 3</option>
              <option value="3">Option 4</option>
            </select>
          </div>

          <div id="adminQuestionMessage"></div>

          <div class="action-row" style="justify-content:flex-start;">
            <button class="btn btn-primary" id="createQuestionBtn" type="button">Create Question</button>
          </div>
        </article>
      </section>

      <section class="intern-section">
        <div class="section-header">
          <div>
            <h2>Current Topics</h2>
            <p>Quick overview of the topics currently stored in the database.</p>
          </div>
        </div>
        <div id="adminTopicsList"></div>
      </section>
    `;
  }

  function drawTopicsList() {
    const container = InternCore.qs('#adminTopicsList');
    const topicSelect = InternCore.qs('#adminQuestionTopic');

    if (topicSelect) {
      topicSelect.innerHTML = adminState.topics.length
        ? adminState.topics.map((topic) => `
            <option value="${topic.id}">${topic.title}</option>
          `).join('')
        : '<option value="">No topics found</option>';
    }

    if (!container) return;

    if (!adminState.topics.length) {
      container.innerHTML = `<div class="intern-empty">No topics found yet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="review-list">
        ${adminState.topics.map((topic) => `
          <article class="review-card">
            <div class="question-top">
              <div>
                <div class="meta-row">
                  <span class="badge">${topic.is_active ? 'Active' : 'Inactive'}</span>
                  <span class="tag">Sort: ${topic.sort_order}</span>
                  <span class="tag">${topic.slug}</span>
                </div>
                <h3 style="margin:10px 0 8px;">${topic.title}</h3>
                <div class="muted">${topic.description || 'No description provided.'}</div>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  async function loadTopics() {
    adminState.topics = await InternAPI.getAllTopics();
    drawTopicsList();
  }

  function bindTopicForm() {
    const titleInput = InternCore.qs('#adminTopicTitle');
    const slugInput = InternCore.qs('#adminTopicSlug');
    const createBtn = InternCore.qs('#createTopicBtn');
    const msg = InternCore.qs('#adminTopicMessage');

    titleInput?.addEventListener('input', () => {
      if (!slugInput.value.trim()) {
        slugInput.value = slugify(titleInput.value);
      }
    });

    createBtn?.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const slug = slugInput.value.trim() || slugify(title);
      const description = InternCore.qs('#adminTopicDescription').value.trim();
      const sortOrder = Number(InternCore.qs('#adminTopicSortOrder').value || '0');
      const isActive = InternCore.qs('#adminTopicStatus').value === 'true';

      if (!title) {
        msg.innerHTML = `<div class="message error">Topic title is required.</div>`;
        return;
      }

      if (!slug) {
        msg.innerHTML = `<div class="message error">Slug is required.</div>`;
        return;
      }

      try {
        await InternAPI.createTopic({
          title,
          slug,
          description,
          sortOrder,
          isActive
        });

        msg.innerHTML = `<div class="message success">Topic created successfully.</div>`;

        titleInput.value = '';
        slugInput.value = '';
        InternCore.qs('#adminTopicDescription').value = '';
        InternCore.qs('#adminTopicSortOrder').value = '0';
        InternCore.qs('#adminTopicStatus').value = 'true';

        await loadTopics();
      } catch (error) {
        console.error(error);
        msg.innerHTML = `<div class="message error">Failed to create topic. It may already exist.</div>`;
      }
    });
  }

  function bindQuestionForm() {
    const btn = InternCore.qs('#createQuestionBtn');
    const msg = InternCore.qs('#adminQuestionMessage');

    btn?.addEventListener('click', async () => {
      const topicId = InternCore.qs('#adminQuestionTopic').value;
      const type = InternCore.qs('#adminQuestionType').value;
      const difficulty = InternCore.qs('#adminQuestionDifficulty').value;
      const isActive = InternCore.qs('#adminQuestionStatus').value === 'true';
      const questionText = InternCore.qs('#adminQuestionText').value.trim();
      const caseText = InternCore.qs('#adminCaseText').value.trim();
      const imageUrl = InternCore.qs('#adminImageUrl').value.trim();
      const explanation = InternCore.qs('#adminExplanation').value.trim();
      const summary = InternCore.qs('#adminSummary').value.trim();
      const correctIndex = Number(InternCore.qs('#adminCorrectOption').value);

      let optionValues = InternCore.qsa('.admin-option-input').map((input) => input.value.trim());

      if (type === 'true_false') {
        optionValues = ['True', 'False', '', ''];
      }

      if (!topicId) {
        msg.innerHTML = `<div class="message error">Please select a topic.</div>`;
        return;
      }

      if (!questionText) {
        msg.innerHTML = `<div class="message error">Question text is required.</div>`;
        return;
      }

      const cleanedOptions = optionValues.filter(Boolean);

      if (cleanedOptions.length < 2) {
        msg.innerHTML = `<div class="message error">At least 2 options are required.</div>`;
        return;
      }

      try {
        const question = await InternAPI.createQuestion({
          topicId,
          type,
          difficulty,
          questionText,
          caseText,
          imageUrl,
          explanation,
          summary,
          isActive
        });

        const optionsPayload = cleanedOptions.map((text, index) => ({
          question_id: question.id,
          option_text: text,
          is_correct: index === correctIndex,
          sort_order: index + 1
        }));

        await InternAPI.createQuestionOptions(optionsPayload);

        msg.innerHTML = `<div class="message success">Question created successfully.</div>`;

        InternCore.qs('#adminQuestionText').value = '';
        InternCore.qs('#adminCaseText').value = '';
        InternCore.qs('#adminImageUrl').value = '';
        InternCore.qs('#adminExplanation').value = '';
        InternCore.qs('#adminSummary').value = '';
        InternCore.qs('#adminCorrectOption').value = '0';
        InternCore.qsa('.admin-option-input').forEach((input) => { input.value = ''; });

        await loadTopics();
      } catch (error) {
        console.error(error);
        msg.innerHTML = `<div class="message error">Failed to create question.</div>`;
      }
    });
  }

  async function initAdminPage() {
    InternCore.createShell();
    renderAdminPage();

    try {
      await loadTopics();
      bindTopicForm();
      bindQuestionForm();
    } catch (error) {
      console.error(error);
      const root = InternCore.qs('#internPageRoot');
      root.innerHTML = `
        <section class="card center">
          <div class="meta-row" style="justify-content:center;">
            <span class="badge">Error</span>
          </div>
          <h2>Failed to load admin panel.</h2>
          <p class="muted">Please check your Supabase connection and table permissions.</p>
          <div class="action-row" style="justify-content:center; margin-top:24px;">
            <a class="btn btn-light" href="../index.html">Back</a>
          </div>
        </section>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', initAdminPage);
})();
