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

  const InternAPI = {
    async getTopics() {
      return demoTopics;
    }
  };

  window.InternAPI = InternAPI;
})();
