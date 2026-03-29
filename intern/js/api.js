(function () {
  'use strict';

  if (!window.InternSupabase) {
    console.error('InternSupabase is not initialized. Check supabase-client.js and script order.');
    return;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async function fetchQuestionOptions(questionIds) {
    if (!questionIds.length) return [];

    const { data, error } = await InternSupabase
      .from('intern_question_options')
      .select('id, question_id, option_text, is_correct, sort_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  function attachOptionsToQuestions(questions, options) {
    const grouped = new Map();

    options.forEach((option) => {
      if (!grouped.has(option.question_id)) {
        grouped.set(option.question_id, []);
      }

      grouped.get(option.question_id).push({
        id: option.id,
        text: option.option_text,
        is_correct: option.is_correct
      });
    });

    return questions.map((question) => ({
      id: question.id,
      topic_id: question.topic_id,
      topic_title: question.intern_topics?.title || '',
      type: question.type,
      difficulty: question.difficulty,
      question_text: question.question_text,
      case_text: question.case_text || '',
      image_url: question.image_url || '',
      explanation: question.explanation || '',
      summary: question.summary || '',
      options: shuffle(grouped.get(question.id) || [])
    }));
  }

  async function getQuestionsByTopics({ topicIds = [], count = 10 }) {
    let query = InternSupabase
      .from('intern_questions')
      .select(`
        id,
        topic_id,
        type,
        difficulty,
        question_text,
        case_text,
        image_url,
        explanation,
        summary,
        intern_topics(title)
      `)
      .eq('is_active', true);

    if (topicIds.length) {
      query = query.in('topic_id', topicIds);
    }

    const { data: questions, error } = await query.limit(Math.max(count * 3, count));
    if (error) throw error;

    const shuffledQuestions = shuffle(questions || []).slice(0, count);
    const questionIds = shuffledQuestions.map((question) => question.id);
    const options = await fetchQuestionOptions(questionIds);

    return attachOptionsToQuestions(shuffledQuestions, options);
  }

  const InternAPI = {
    async getTopics() {
      const { data, error } = await InternSupabase
        .from('intern_topics_with_counts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;

      return (data || []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description || '',
        questions_count: Number(topic.questions_count || 0)
      }));
    },

    async getPracticeQuestions({ topicIds = [], count = 10 }) {
      return getQuestionsByTopics({ topicIds, count });
    },

    async getExamQuestions({ topicIds = [], count = 20 }) {
      return getQuestionsByTopics({ topicIds, count });
    },

    async createExamSession({ mode, selectedTopicIds, questionCount, timerMinutes = null }) {
      const { data, error } = await InternSupabase
        .from('intern_exam_sessions')
        .insert({
          mode,
          selected_topic_ids: selectedTopicIds,
          question_count: questionCount,
          timer_minutes: timerMinutes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async saveExamAnswers({ sessionId, rows }) {
      if (!rows.length) return [];

      const payload = rows.map((row) => ({
        session_id: sessionId,
        question_id: row.question.id,
        topic_id: row.question.topic_id,
        selected_option_id: row.selectedOptionId || null,
        selected_value: row.selected || null,
        is_correct: !!row.isCorrect
      }));

      const { data, error } = await InternSupabase
        .from('intern_exam_answers')
        .insert(payload)
        .select();

      if (error) throw error;
      return data;
    },

    async completeExamSession({ sessionId, score, totalQuestions }) {
      const { data, error } = await InternSupabase
        .from('intern_exam_sessions')
        .update({
          score,
          total_questions: totalQuestions,
          status: 'completed',
          finished_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return data;
    }
  };

  window.InternAPI = InternAPI;
})();
