(function () {
  'use strict';

  if (document.body?.dataset?.page !== 'home') return;

  let mounted = false;
  let observer = null;

  function uniqueTexts(items) {
    return [...new Set(items.map((item) => (item.textContent || '').trim()).filter(Boolean))];
  }

  function createFeatureStrip(texts) {
    const section = document.createElement('section');
    section.className = 'home-feature-strip home-fade-in';
    section.innerHTML = `
      <div class="feature-strip-grid">
        ${texts.slice(0, 4).map((text) => `<div class="feature-pill">${text}</div>`).join('')}
      </div>
    `;
    return section;
  }

  function markRecentSection(section) {
    if (!section) return;
    section.classList.add('home-recent-section', 'home-fade-in');
    const cards = section.querySelectorAll('.card');
    cards.forEach((card) => card.classList.add('home-recent-card'));
    const firstMuted = section.querySelector('.section-header p');
    if (firstMuted) firstMuted.classList.add('home-compact-muted');
  }

  function enhanceHero(hero) {
    if (!hero) return;
    hero.classList.add('home-fade-in');
    const textBlock = hero.querySelector('.hero-grid > div:first-child p');
    if (textBlock) {
      textBlock.innerHTML = 'Move subject by subject, topic by topic, review every attempt with clarity, and train with a home page that feels as premium as the platform behind it.';
    }
  }

  function enhanceContinue(section) {
    if (!section) return;
    section.classList.add('home-fade-in');
    const title = section.querySelector('h3');
    const text = section.querySelector('.muted');
    if (title) title.textContent = 'Resume where you left off';
    if (text) text.classList.add('home-compact-muted');
  }

  function enhanceDaily(section) {
    if (!section) return;
    section.classList.add('home-fade-in');
    const desc = section.querySelector('.section-header p');
    if (desc) desc.textContent = 'Spin for a subject, unlock a lucky number, and jump into a beautiful rapid-fire study session.';
  }

  function attachReveal(root) {
    const items = root.querySelectorAll('.home-fade-in');
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    items.forEach((item) => reveal.observe(item));
  }

  function applyUpgrade() {
    const pageRoot = document.getElementById('pageRoot');
    if (!pageRoot || pageRoot.children.length === 0) return false;
    if (pageRoot.dataset.homeUpgradeMounted === '1') return true;

    const sections = [...pageRoot.children].filter((node) => node.tagName === 'SECTION');
    if (!sections.length) return false;

    const hero = sections.find((section) => section.querySelector('.hero'));
    const ticker = sections.find((section) => section.querySelector('.ticker-track'));
    const continueSection = sections.find((section) => section.querySelector('.continue-banner'));
    const daily = sections.find((section) => section.classList.contains('home-daily-section'));
    const recent = sections.find((section) => {
      const h2 = section.querySelector('.section-header h2');
      return h2 && /recent activity/i.test(h2.textContent || '');
    });

    document.body.classList.add('home-upgraded');

    enhanceHero(hero?.querySelector('.hero'));
    enhanceContinue(continueSection);
    enhanceDaily(daily);
    markRecentSection(recent);

    if (hero) pageRoot.appendChild(hero);
    if (continueSection) pageRoot.appendChild(continueSection);
    if (daily) pageRoot.appendChild(daily);

    if (ticker) {
      const texts = uniqueTexts([...ticker.querySelectorAll('span')]);
      const strip = createFeatureStrip(texts);
      pageRoot.appendChild(strip);
      ticker.remove();
    }

    if (recent) pageRoot.appendChild(recent);

    pageRoot.dataset.homeUpgradeMounted = '1';
    attachReveal(pageRoot);
    return true;
  }

  function mountWhenReady() {
    if (applyUpgrade()) {
      mounted = true;
      if (observer) observer.disconnect();
      return;
    }

    const pageRoot = document.getElementById('pageRoot');
    if (!pageRoot || observer) return;

    observer = new MutationObserver(() => {
      if (mounted) return;
      if (applyUpgrade()) {
        mounted = true;
        observer.disconnect();
      }
    });

    observer.observe(pageRoot, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWhenReady);
  } else {
    mountWhenReady();
  }
})();
