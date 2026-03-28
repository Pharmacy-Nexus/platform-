(function () {
  'use strict';

  const demoTopics = [
    {
      id: 'topic-1',
      title: 'Cardiology',
      description: 'High-yield cardiology topics for pharmacist licensure exam.',
      questions_count: 120
    },
    {
      id: 'topic-2',
      title: 'Endocrinology',
      description: 'Diabetes, thyroid disorders, and endocrine pharmacotherapy.',
      questions_count: 86
    },
    {
      id: 'topic-3',
      title: 'Infectious Diseases',
      description: 'Antibiotics, stewardship, and common infectious cases.',
      questions_count: 140
    },
    {
      id: 'topic-4',
      title: 'Hypertension',
      description: 'Evaluation, management, and drug selection principles.',
      questions_count: 60
    },
    {
      id: 'topic-5',
      title: 'Renal Disorders',
      description: 'CKD, AKI, dosing issues, and renal-related therapeutics.',
      questions_count: 72
    },
    {
      id: 'topic-6',
      title: 'Respiratory Disorders',
      description: 'Asthma, COPD, inhalers, and pulmonary pharmacotherapy.',
      questions_count: 91
    }
  ];

  const demoQuestions = [
    {
      id: 'q1',
      topic_id: 'topic-4',
      topic_title: 'Hypertension',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Which drug class is generally recommended as first-line therapy for many patients with hypertension?',
      case_text: '',
      image_url: '',
      explanation: 'Common first-line choices often include thiazide diuretics, ACE inhibitors, ARBs, or calcium channel blockers depending on the patient profile.',
      summary: 'Hypertension first-line therapy depends on patient-specific factors, but thiazides, ACEIs, ARBs, and CCBs are high-yield core options.',
      options: [
        { id: 'q1o1', text: 'Thiazide diuretics', is_correct: true },
        { id: 'q1o2', text: 'Aminoglycosides', is_correct: false },
        { id: 'q1o3', text: 'Proton pump inhibitors', is_correct: false },
        { id: 'q1o4', text: 'Macrolides', is_correct: false }
      ]
    },
    {
      id: 'q2',
      topic_id: 'topic-2',
      topic_title: 'Endocrinology',
      type: 'true_false',
      difficulty: 'easy',
      question_text: 'Metformin is commonly considered first-line therapy for type 2 diabetes in many patients.',
      case_text: '',
      image_url: '',
      explanation: 'Metformin is commonly used first-line in type 2 diabetes unless contraindicated or not tolerated.',
      summary: 'Metformin remains one of the most important high-yield first-line antidiabetic agents.',
      options: [
        { id: 'q2o1', text: 'True', is_correct: true },
        { id: 'q2o2', text: 'False', is_correct: false }
      ]
    },
    {
      id: 'q3',
      topic_id: 'topic-3',
      topic_title: 'Infectious Diseases',
      type: 'case',
      difficulty: 'hard',
      question_text: 'Which antibiotic is most appropriate to avoid unnecessary broad-spectrum exposure in this patient?',
      case_text: 'A stable patient presents with a likely uncomplicated infection and no signs of sepsis. Culture data suggest a susceptible narrow-spectrum option is available.',
      image_url: '',
      explanation: 'Antimicrobial stewardship favors the narrowest effective agent once culture and susceptibility data allow de-escalation.',
      summary: 'In infectious diseases, always think stewardship: use the narrowest effective antibiotic whenever appropriate.',
      options: [
        { id: 'q3o1', text: 'Use the narrowest effective antibiotic', is_correct: true },
        { id: 'q3o2', text: 'Escalate to the broadest possible therapy indefinitely', is_correct: false },
        { id: 'q3o3', text: 'Add two more antibiotics without indication', is_correct: false },
        { id: 'q3o4', text: 'Stop therapy despite active infection', is_correct: false }
      ]
    },
    {
      id: 'q4',
      topic_id: 'topic-6',
      topic_title: 'Respiratory Disorders',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Which inhaler counseling point is especially important for inhaled corticosteroids?',
      case_text: '',
      image_url: '',
      explanation: 'Patients should generally rinse the mouth after inhaled corticosteroid use to reduce local adverse effects such as oral candidiasis.',
      summary: 'ICS counseling pearl: rinse mouth after use.',
      options: [
        { id: 'q4o1', text: 'Rinse the mouth after use', is_correct: true },
        { id: 'q4o2', text: 'Swallow the dose twice', is_correct: false },
        { id: 'q4o3', text: 'Always skip spacer use', is_correct: false },
        { id: 'q4o4', text: 'Use only once monthly', is_correct: false }
      ]
    },
    {
      id: 'q5',
      topic_id: 'topic-5',
      topic_title: 'Renal Disorders',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Why is renal function important when dosing certain medications?',
      case_text: '',
      image_url: '',
      explanation: 'Many drugs or their metabolites are renally cleared, so impaired kidney function can increase drug exposure and toxicity if doses are not adjusted.',
      summary: 'Renal dosing is a major safety principle because reduced clearance may lead to toxicity.',
      options: [
        { id: 'q5o1', text: 'It affects drug clearance and toxicity risk', is_correct: true },
        { id: 'q5o2', text: 'It only changes tablet color', is_correct: false },
        { id: 'q5o3', text: 'It is never relevant in pharmacotherapy', is_correct: false },
        { id: 'q5o4', text: 'It matters only for topical products', is_correct: false }
      ]
    },
    {
      id: 'q6',
      topic_id: 'topic-1',
      topic_title: 'Cardiology',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Which statement about statins is most accurate?',
      case_text: '',
      image_url: '',
      explanation: 'Statins are widely used lipid-lowering drugs and are a major foundation in atherosclerotic cardiovascular risk reduction.',
      summary: 'Statins are among the most important long-term preventive cardiovascular drugs.',
      options: [
        { id: 'q6o1', text: 'They are important for cardiovascular risk reduction', is_correct: true },
        { id: 'q6o2', text: 'They are antibiotics used for sepsis', is_correct: false },
        { id: 'q6o3', text: 'They are only used as pain relievers', is_correct: false },
        { id: 'q6o4', text: 'They replace all antihypertensives', is_correct: false }
      ]
    },
    {
      id: 'q7',
      topic_id: 'topic-4',
      topic_title: 'Hypertension',
      type: 'true_false',
      difficulty: 'easy',
      question_text: 'Lifestyle modification can play an important role in blood pressure control.',
      case_text: '',
      image_url: '',
      explanation: 'Lifestyle changes such as diet, exercise, weight control, and sodium reduction can significantly support blood pressure management.',
      summary: 'Never ignore non-drug therapy in hypertension.',
      options: [
        { id: 'q7o1', text: 'True', is_correct: true },
        { id: 'q7o2', text: 'False', is_correct: false }
      ]
    },
    {
      id: 'q8',
      topic_id: 'topic-2',
      topic_title: 'Endocrinology',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Which of the following is a common counseling point for insulin therapy?',
      case_text: '',
      image_url: '',
      explanation: 'Patients using insulin need education about hypoglycemia recognition, injection technique, and glucose monitoring.',
      summary: 'Insulin counseling should always cover hypoglycemia.',
      options: [
        { id: 'q8o1', text: 'Teach recognition of hypoglycemia', is_correct: true },
        { id: 'q8o2', text: 'Avoid all glucose monitoring', is_correct: false },
        { id: 'q8o3', text: 'Store opened insulin in direct heat', is_correct: false },
        { id: 'q8o4', text: 'Skip injection technique counseling', is_correct: false }
      ]
    },
    {
      id: 'q9',
      topic_id: 'topic-3',
      topic_title: 'Infectious Diseases',
      type: 'mcq',
      difficulty: 'medium',
      question_text: 'Why is completing the prescribed antibiotic course often emphasized?',
      case_text: '',
      image_url: '',
      explanation: 'Following the prescribed regimen helps optimize treatment effectiveness and reduce inappropriate use patterns.',
      summary: 'Antibiotic adherence is part of responsible antimicrobial use.',
      options: [
        { id: 'q9o1', text: 'To support effective and appropriate therapy', is_correct: true },
        { id: 'q9o2', text: 'Because all antibiotics are harmless', is_correct: false },
        { id: 'q9o3', text: 'Because culture results never matter', is_correct: false },
        { id: 'q9o4', text: 'To avoid ever reassessing the patient', is_correct: false }
      ]
    },
    {
      id: 'q10',
      topic_id: 'topic-6',
      topic_title: 'Respiratory Disorders',
      type: 'case',
      difficulty: 'hard',
      question_text: 'What is the best pharmacist priority in this inhaler-related case?',
      case_text: 'A patient with poorly controlled asthma is using the inhaler incorrectly and receives little benefit from the medication.',
      image_url: '',
      explanation: 'Correct inhaler technique is critical to treatment success, and pharmacists play a major role in patient education.',
      summary: 'Bad inhaler technique can make the right drug fail.',
      options: [
        { id: 'q10o1', text: 'Correct the inhaler technique', is_correct: true },
        { id: 'q10o2', text: 'Ignore device technique completely', is_correct: false },
        { id: 'q10o3', text: 'Stop all therapy immediately', is_correct: false },
        { id: 'q10o4', text: 'Recommend random dose doubling', is_correct: false }
      ]
    }
  ];

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function prepareQuestions(topicIds, count) {
    const filtered = demoQuestions.filter((question) => {
      if (!topicIds.length) return true;
      return topicIds.includes(question.topic_id);
    });

    return shuffle(filtered)
      .slice(0, Math.min(count, filtered.length))
      .map((question) => ({
        ...question,
        options: shuffle(question.options)
      }));
  }

  const InternAPI = {
    async getTopics() {
      return demoTopics;
    },

    async getPracticeQuestions({ topicIds = [], count = 10 }) {
      return prepareQuestions(topicIds, count);
    },

    async getExamQuestions({ topicIds = [], count = 20 }) {
      return prepareQuestions(topicIds, count);
    }
  };

  window.InternAPI = InternAPI;
})();
