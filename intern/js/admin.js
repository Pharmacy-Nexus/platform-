(function () {
  'use strict';

  const adminState = {
    topics: [],
    questions: [],
    selectedTopicId: ''
  };

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderAdminPage() {
    const root = InternCore.qs('#internPageRoot');

    root.innerHTML = `
      <section class="section-header">
        <div>
          <h2>Intern Admin Panel</h2>
          <p>Press <strong>Ctrl + Shift + 9</strong> from any intern page to open this panel.</p>
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

      <section class="intern-section">
        <div class="section-header">
          <div>
            <h2>Questions Browser</h2>
            <p>Choose a topic to view and delete questions.</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div class="input-row two">
            <div>
              <label class="muted">Browse by topic</label>
              <select class="select" id="adminBrowseTopic"></select>
            </div>
            <div style="display:flex; align-items:flex-end;">
              <button class="btn btn-dark" id="loadQuestionsBtn" type="button">Load Questions</button>
            </div>
          </div>
          <div id="adminQuestionsMessage"></div>
        </div>

        <div id="adminQuestionsList"></div>
      </section>
    `;
  }

  function updateQuestionFormByType() {
    const type = InternCore.qs('#adminQuestionType')?.value;
    const caseField = InternCore.qs('#adminCaseText')?.closest('div[style*="margin-top:16px;"]');
    const imageField = InternCore.qs('#adminImageUrl')?.closest('div[style*="margin-top:16px;"]');
    const optionInputs = InternCore.qsa('.admin-option-input');

    if (type === 'true_false') {
      optionInputs.forEach((input, index) => {
        if (index === 0) input.value = 'True';
        if (index === 1) input.value = 'False';
        if (index > 1) input.value = '';
        input.disabled = index > 1 ? true : false;
      });

      if (InternCore.qs('#adminCorrectOption')) {
        InternCore.qs('#adminCorrectOption').innerHTML = `
          <option value="0">True</option>
          <option value="1">False</option>
        `;
      }
    } else {
      optionInputs.forEach((input, index) => {
        input.disabled = false;
        input.placeholder = `Option ${index + 1}`;
      });

      if (InternCore.qs('#adminCorrectOption')) {
        InternCore.qs('#adminCorrectOption').innerHTML = `
          <option value="0">Option 1</option>
          <option value="1">Option 2</option>
          <option value="2">Option 3</option>
          <option value="3">Option 4</option>
        `;
      }
    }

    if (caseField) {
      caseField.style.display = type === 'case' ? 'block' : 'block';
    }

    if (imageField) {
      imageField.style.display = type === 'image_mcq' ? 'block' : 'block';
    }
  }

  function drawTopicsList() {
    const container = InternCore.qs('#adminTopicsList');
    const topicSelect = InternCore.qs('#adminQuestionTopic');
    const browseSelect = InternCore.qs('#adminBrowseTopic');

    const optionsHtml = adminState.topics.length
      ? adminState.topics.map((topic) => `
          <option value="${topic.id}">${topic.title}</option>
        `).join('')
      : '<option value="">No topics found</option>';

    if (topicSelect) topicSelect.innerHTML = optionsHtml;
    if (browseSelect) browseSelect.innerHTML = optionsHtml;

    if (adminState.selectedTopicId && browseSelect) {
      browseSelect.value = adminState.selectedTopicId;
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
                  <span class="tag">${topic.questions_count} Questions</span>
                </div>
                <h3 style="margin:10px 0 8px;">${escapeHtml(topic.title)}</h3>
                <div class="muted">${escapeHtml(topic.description || 'No description provided.')}</div>
              </div>
              <div class="small-actions">
                <button class="small-btn danger admin-delete-topic-btn" data-topic-id="${topic.id}" data-topic-title="${escapeHtml(topic.title)}" type="button">Delete Topic</button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    InternCore.qsa('.admin-delete-topic-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const topicId = btn.dataset.topicId;
        const topicTitle = btn.dataset.topicTitle;

        const ok = window.confirm(`Delete topic "${topicTitle}"?\nThis will also delete its questions.`);
        if (!ok) return;

        try {
          await InternAPI.deleteTopic(topicId);
          await loadTopics();
          adminState.questions = [];
          drawQuestionsList();
        } catch (error) {
          console.error(error);
          alert('Failed to delete topic.');
        }
      });
    });
  }

  function drawQuestionsList() {
    const container = InternCore.qs('#adminQuestionsList');

    if (!container) return;

    if (!adminState.selectedTopicId) {
      container.innerHTML = `<div class="intern-empty">Choose a topic first, then click Load Questions.</div>`;
      return;
    }

    if (!adminState.questions.length) {
      container.innerHTML = `<div class="intern-empty">No questions found for this topic yet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="review-list">
        ${adminState.questions.map((question, index) => `
          <article class="review-card">
            <div class="question-top">
              <div>
                <div class="meta-row">
                  <span class="badge">${question.type}</span>
                  <span class="tag">${question.difficulty}</span>
                  <span class="tag">${question.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <h3 style="margin:10px 0 8px;">${index + 1}. ${escapeHtml(question.question_text)}</h3>
              </div>
              <div class="small-actions">
                <button class="small-btn danger admin-delete-question-btn" data-question-id="${question.id}" type="button">Delete Question</button>
              </div>
            </div>

            ${question.case_text ? `
              <div class="case-box" style="margin-top:12px;">
                <strong>Case</strong>
                <div class="muted" style="margin-top:8px;">${escapeHtml(question.case_text)}</div>
              </div>
            ` : ''}

            ${question.image_url ? `
              <div class="review-answer"><strong>Image URL:</strong> ${escapeHtml(question.image_url)}</div>
            ` : ''}

            <div class="review-answer"><strong>Explanation:</strong> ${escapeHtml(question.explanation || '')}</div>
            <div class="review-answer"><strong>Summary:</strong> ${escapeHtml(question.summary || '')}</div>

            <div class="review-answer">
              <strong>Options:</strong>
              <div style="margin-top:10px;">
                ${(question.options || []).map((option) => `
                  <div class="metric-row" style="padding:8px 0;">
                    <span>${escapeHtml(option.text)}</span>
                    <strong>${option.is_correct ? 'Correct' : ''}</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    InternCore.qsa('.admin-delete-question-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const questionId = btn.dataset.questionId;
        const ok = window.confirm('Delete this question?');
        if (!ok) return;

        try {
          await InternAPI.deleteQuestion(questionId);
          await loadQuestionsByTopic(adminState.selectedTopicId);
          await loadTopics();
        } catch (error) {
          console.error(error);
          alert('Failed to delete question.');
        }
      });
    });
  }

  async function loadTopics() {
    adminState.topics = await InternAPI.getAllTopics();
    drawTopicsList();
  }

  async function loadQuestionsByTopic(topicId) {
    adminState.selectedTopicId = topicId;
    adminState.questions = await InternAPI.getQuestionsByTopic(topicId);
    drawQuestionsList();
  }

  function bindTopicForm() {
    const titleInput = InternCore.qs('#adminTopicTitle');
    const slugInput = InternCore.qs('#adminTopicSlug');
    const createBtn = InternCore.qs('#createTopicBtn');
    const msg = InternCore.qs('#adminTopicMessage');

    titleInput?.addEventListener('input', () => {
      if (!slugInput.dataset.userEdited) {
        slugInput.value = slugify(titleInput.value);
      }
    });

    slugInput?.addEventListener('input', () => {
      slugInput.dataset.userEdited = slugInput.value.trim() ? 'true' : '';
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
        slugInput.dataset.userEdited = '';
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
    const typeSelect = InternCore.qs('#adminQuestionType');

    typeSelect?.addEventListener('change', updateQuestionFormByType);
    updateQuestionFormByType();

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
        optionValues = ['True', 'False'];
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

      if (correctIndex >= cleanedOptions.length) {
        msg.innerHTML = `<div class="message error">Correct option index does not match the filled options.</div>`;
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

        if (adminState.selectedTopicId === topicId) {
          await loadQuestionsByTopic(topicId);
        }
      } catch (error) {
        console.error(error);
        msg.innerHTML = `<div class="message error">Failed to create question.</div>`;
      }
    });
  }

  function bindQuestionsBrowser() {
    const btn = InternCore.qs('#loadQuestionsBtn');
    const msg = InternCore.qs('#adminQuestionsMessage');

    btn?.addEventListener('click', async () => {
      const topicId = InternCore.qs('#adminBrowseTopic').value;

      if (!topicId) {
        msg.innerHTML = `<div class="message error">Please choose a topic first.</div>`;
        return;
      }

      try {
        msg.innerHTML = '';
        await loadQuestionsByTopic(topicId);
      } catch (error) {
        console.error(error);
        msg.innerHTML = `<div class="message error">Failed to load questions.</div>`;
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
      bindQuestionsBrowser();
      drawQuestionsList();
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
