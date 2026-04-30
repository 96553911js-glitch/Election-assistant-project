/**
 * @file app.js
 * @description VoteWise – Democratic Civic Education Platform
 * @version 3.0.0
 * @author VoteWise Team
 * @license MIT
 *
 * @overview
 * A modular JavaScript application providing interactive election
 * education through timeline, steps, quiz, AI chat, and glossary.
 *
 * Architecture: Revealing Module Pattern (IIFE)
 * Principles: DRY, SRP, SOLID, defensive programming
 *
 * Modules:
 *  1. Config       – Central constants and configuration
 *  2. Utils        – Shared utility functions
 *  3. NavModule    – Sticky header + mobile menu
 *  4. CounterModule – RAF-based animated statistics
 *  5. VoteCounter  – Live vote simulation
 *  6. Timeline     – Election process timeline
 *  7. Journey      – Voter step-by-step guide
 *  8. Quiz         – Knowledge challenge engine
 *  9. Chat         – AI civic assistant (smart offline)
 * 10. Glossary     – Searchable election dictionary
 * 11. Observer     – Scroll-reveal IntersectionObserver
 * 12. Router       – Smooth scroll + focus management
 * 13. Analytics    – Google + Firebase event tracking
 * 14. App          – Bootstrap and initialise all modules
 */

'use strict';

/* ================================================================
   1. CONFIG – Single source of truth for all constants
   ================================================================ */

/**
 * @namespace Config
 * @description Central configuration object. Change values here only.
 */
const Config = Object.freeze({
  /** Duration of counter animation in ms */
  COUNTER_DURATION: 1800,
  /** Artificial delay before chat response appears (ms) */
  CHAT_DELAY: 900,
  /** Maximum allowed user input length (characters) */
  MAX_INPUT_LENGTH: 500,
  /** IntersectionObserver threshold for reveal animations */
  OBSERVER_THRESHOLD: 0.08,
  /** IntersectionObserver root margin */
  OBSERVER_ROOT_MARGIN: '0px 0px -40px 0px',
  /** Stagger delay between sequentially revealed cards (ms) */
  STAGGER_DELAY: 70,
  /** Number of pixels scrolled before nav becomes sticky */
  SCROLL_THRESHOLD: 60,
  /** Maximum messages kept in chat history */
  MAX_CHAT_HISTORY: 20,
  /** Google Analytics measurement ID */
  GA_ID: 'G-VOTEWISE2026',
  /** App version string */
  VERSION: '3.0.0',
});

/* ================================================================
   2. UTILS – Pure, reusable helper functions
   ================================================================ */

/**
 * @namespace Utils
 * @description Shared pure utility functions used across all modules.
 */
const Utils = (() => {
  /**
   * Retrieves a DOM element by ID with null-safe fallback.
   * @param {string} id - Element ID (without #)
   * @returns {HTMLElement|null} Element or null if not found
   */
  function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`[VoteWise] #${id} not found in DOM`);
    return el;
  }

  /**
   * Creates a DOM element with optional class and ARIA attributes.
   * @param {string} tag - HTML tag name
   * @param {string} [cls] - CSS class string
   * @param {Object} [attrs={}] - Key-value attribute pairs
   * @returns {HTMLElement} Configured element
   */
  function el(tag, cls = '', attrs = {}) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  /**
   * Sanitises raw user input to prevent XSS injection.
   * Trims whitespace, enforces length cap, strips HTML angle brackets.
   * @param {string} raw - Untrusted user input
   * @returns {string} Safe, sanitised string
   */
  function sanitise(raw) {
    return String(raw)
      .trim()
      .substring(0, Config.MAX_INPUT_LENGTH)
      .replace(/[<>"'`]/g, '');
  }

  /**
   * Cubic ease-out interpolation for smooth animations.
   * @param {number} t - Progress value in range [0, 1]
   * @returns {number} Eased value in range [0, 1]
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  }

  /**
   * Pads a number to two digits with a leading zero.
   * @param {number} n - Number to pad
   * @returns {string} Zero-padded string
   */
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * Fires a Google Analytics / Firebase custom event if available.
   * @param {string} name - Event name
   * @param {Object} [params={}] - Event parameters
   */
  function track(name, params = {}) {
    try {
      if (typeof gtag === 'function') gtag('event', name, params);
      if (window.vwAnalytics?.[name]) window.vwAnalytics[name](params);
    } catch (e) {
      // Tracking must never break core functionality
    }
  }

  return Object.freeze({ getEl, el, sanitise, easeOutCubic, pad, track });
})();

/* ================================================================
   3. NAV MODULE – Sticky header and accessible mobile menu
   ================================================================ */

/**
 * @module NavModule
 * @description Manages sticky navigation and mobile hamburger menu.
 */
const NavModule = (() => {
  let menuOpen = false;

  /** @type {HTMLElement} */
  const header = Utils.getEl('siteHeader');
  /** @type {HTMLButtonElement} */
  const toggle = Utils.getEl('mobileToggle');
  /** @type {HTMLElement} */
  const menu = Utils.getEl('mobileMenu');

  /** Adds/removes .scrolled class on header based on scroll position */
  function handleScroll() {
    header?.classList.toggle('scrolled', window.scrollY > Config.SCROLL_THRESHOLD);
  }

  /** Toggles mobile navigation visibility and ARIA state */
  function toggleMenu() {
    menuOpen = !menuOpen;
    toggle?.setAttribute('aria-expanded', String(menuOpen));
    menu?.classList.toggle('open', menuOpen);
    menu?.setAttribute('aria-hidden', String(!menuOpen));
  }

  /**
   * Closes mobile menu when user clicks outside it.
   * @param {MouseEvent} e - Click event
   */
  function handleOutsideClick(e) {
    if (menuOpen && !menu?.contains(e.target) && !toggle?.contains(e.target)) {
      menuOpen = false;
      menu?.classList.remove('open');
      menu?.setAttribute('aria-hidden', 'true');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  }

  /** Attaches all event listeners */
  function init() {
    window.addEventListener('scroll', handleScroll, { passive: true });
    toggle?.addEventListener('click', toggleMenu);
    document.addEventListener('click', handleOutsideClick);
  }

  return Object.freeze({ init });
})();

/* ================================================================
   4. COUNTER MODULE – requestAnimationFrame animated statistics
   ================================================================ */

/**
 * @module CounterModule
 * @description Animates [data-count] elements from 0 to target using RAF.
 */
const CounterModule = (() => {
  /**
   * Runs a single counter animation using requestAnimationFrame.
   * Uses cubic ease-out for a natural deceleration effect.
   * @param {HTMLElement} el - Element with data-count attribute
   */
  function animate(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;

    const start = performance.now();

    /** @param {DOMHighResTimeStamp} now */
    function frame(now) {
      const progress = (now - start) / Config.COUNTER_DURATION;
      const value = Math.round(target * Utils.easeOutCubic(progress));
      el.textContent = Math.min(value, target);
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /** Observes all counter elements and triggers animation on viewport entry */
  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach((el) => observer.observe(el));
  }

  return Object.freeze({ init });
})();

/* ================================================================
   5. VOTE COUNTER – Simulated live vote count display
   ================================================================ */

/**
 * @module VoteCounter
 * @description Simulates a live vote tally incrementing in real-time.
 */
const VoteCounter = (() => {
  let count = Math.floor(Math.random() * 8000) + 2000;
  let lastRendered = -1;

  /**
   * Increments vote count and updates DOM only when value changes.
   * Schedules next tick at randomised interval for realism.
   */
  function tick() {
    count += Math.floor(Math.random() * 3);
    const display = Utils.getEl('voteCount');
    if (display && count !== lastRendered) {
      display.textContent = count.toLocaleString('en-IN');
      lastRendered = count;
    }
    setTimeout(tick, 800 + Math.random() * 1200);
  }

  function init() {
    if (Utils.getEl('voteCount')) tick();
  }

  return Object.freeze({ init });
})();

/* ================================================================
   6. TIMELINE – Election process milestone renderer
   ================================================================ */

/**
 * @module Timeline
 * @description Builds and renders the election timeline cards from data.
 */
const Timeline = (() => {
  /**
   * @typedef {Object} Milestone
   * @property {string} phase - Timeframe label
   * @property {string} title - Milestone title
   * @property {string} desc  - Milestone description
   */

  /** @type {Milestone[]} */
  const DATA = [
    { phase: 'Month 12 Before', title: 'Election Announced',   desc: 'The Election Commission officially announces the election schedule and begins all administrative preparations.' },
    { phase: 'Month 10 Before', title: 'Registration Opens',   desc: 'Voter registration portals open. Citizens register or update details at voters.eci.gov.in using Form 6.' },
    { phase: 'Month 8 Before',  title: 'Candidate Nominations',desc: 'Eligible citizens file nomination papers declaring candidature, assets, and criminal records to the Returning Officer.' },
    { phase: 'Month 6 Before',  title: 'Nomination Deadline',  desc: 'Final date for filing nominations. Scrutiny begins. Candidates may withdraw within the allowed period.' },
    { phase: 'Month 4 Before',  title: 'Campaigns Begin',      desc: 'The Model Code of Conduct activates. Parties and candidates begin rallies, door-to-door canvassing, and media campaigns.' },
    { phase: 'Month 2 Before',  title: 'Registration Closes',  desc: 'Last date for voter registration. Electoral rolls are finalised. No new entries accepted after this point.' },
    { phase: '1 Month Before',  title: 'Voter Cards Issued',   desc: 'EPIC (Voter ID) cards dispatched to all newly registered voters. e-EPIC also available for download online.' },
    { phase: '2 Weeks Before',  title: 'Blackout Period',      desc: 'Section 126 mandates complete halt of election campaigns 48 hours before polling closes in any constituency.' },
    { phase: 'Election Day',    title: '🗳️ Polling Day',        desc: 'Polling stations open at 7 AM. Eligible voters cast ballots on EVM. VVPAT slip confirms every vote recorded.' },
    { phase: 'Election Evening',title: 'Polls Close & Count',  desc: 'EVMs sealed after polls close. Counting at designated centres under ECI supervision; results declared officially.' },
  ];

  /**
   * Renders a single timeline card article element.
   * @param {Milestone} item - Milestone data object
   * @param {number} index - Zero-based card index
   * @returns {HTMLElement} Rendered card element
   */
  function renderCard(item, index) {
    const card = Utils.el('article', 'process-card', {
      role: 'listitem',
      'aria-label': `Step ${index + 1}: ${item.title}`,
    });
    card.innerHTML = `
      <div class="pc-num" aria-hidden="true">${Utils.pad(index + 1)}</div>
      <div class="pc-phase">${item.phase}</div>
      <h3 class="pc-title">${item.title}</h3>
      <p class="pc-desc">${item.desc}</p>`;
    return card;
  }

  function init() {
    const container = Utils.getEl('processTrack');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    DATA.forEach((item, i) => fragment.appendChild(renderCard(item, i)));
    container.appendChild(fragment);
  }

  return Object.freeze({ init, DATA });
})();

/* ================================================================
   7. JOURNEY – Step-by-step voter guide with accordion details
   ================================================================ */

/**
 * @module Journey
 * @description Renders 8 voter journey steps with expandable detail panels.
 */
const Journey = (() => {
  /**
   * @typedef {Object} Step
   * @property {string} icon   - Emoji icon
   * @property {string} title  - Step title
   * @property {string} desc   - Short description
   * @property {string} detail - Expanded detail text
   */

  /** @type {Step[]} */
  const DATA = [
    { icon: '📋', title: 'Verify Eligibility',     desc: 'Confirm legal requirements to vote in your constituency.',           detail: 'Age 18+ on qualifying date (Jan 1), Indian citizen, ordinarily resident in constituency, sound mind, not disqualified under RPA 1951.' },
    { icon: '📝', title: 'Register to Vote',        desc: 'Submit Form 6 at voters.eci.gov.in before the deadline.',           detail: 'Provide Aadhaar, proof of address, and a passport-size photo. Track status online. Processing takes 2–4 weeks.' },
    { icon: '📬', title: 'Receive Your EPIC',       desc: 'Your Voter ID card is mailed or available as e-EPIC.',             detail: 'Download e-EPIC (PDF Voter ID) instantly from voters.eci.gov.in after approval. Carries EPIC number, photo, and booth address.' },
    { icon: '🗺️', title: 'Locate Your Booth',       desc: 'Find your assigned polling station before election day.',           detail: 'SMS "EPIC <number>" to 1950, check voters.eci.gov.in, or call ECI helpline 1950. Booths are always within 2 km of your home.' },
    { icon: '🪪', title: 'Prepare Identity Proof',  desc: 'Keep EPIC card and one backup photo ID ready the evening before.', detail: 'Accepted alternates: Aadhaar, Passport, Driving License, PAN Card, Bank passbook with photo, MNREGA card, or Pension document.' },
    { icon: '⏰', title: 'Reach Polling Booth',     desc: 'Arrive at your booth during polling hours (7 AM – 6 PM).',         detail: 'Avoid peak hours. Bring your voter slip. Queue management staff will assist. PwD voters have priority access.' },
    { icon: '☑️', title: 'Vote on EVM',              desc: 'Press the button next to your chosen candidate on the EVM.',       detail: 'A beep + green light confirms the vote. VVPAT displays a paper slip for 7 seconds — verify it matches your choice!' },
    { icon: '✅', title: 'Receive Ink Mark',         desc: 'Indelible ink is applied to your left index finger nail.',         detail: 'Silver nitrate ink lasts 72+ hours. It is your proof of participation and prevents double voting. Wear it with pride.' },
  ];

  /**
   * Toggles a journey step card open/closed.
   * Updates ARIA attributes and button text accordingly.
   * @param {HTMLElement} card - The step card element
   * @param {HTMLButtonElement} btn - The expand/collapse button
   * @param {HTMLElement} detail - The detail panel element
   * @param {number} stepNum - Step number for analytics
   */
  function toggleStep(card, btn, detail, stepNum) {
    const isOpen = card.classList.toggle('open');
    btn.textContent = isOpen ? '− Show less' : '+ Learn more';
    btn.setAttribute('aria-expanded', String(isOpen));
    detail.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) Utils.track('step_expanded', { step: stepNum });
  }

  /**
   * Renders a single step card.
   * @param {Step} step - Step data object
   * @param {number} i - Zero-based index
   * @returns {HTMLElement} Rendered card element
   */
  function renderStep(step, i) {
    const card = Utils.el('article', 'journey-card', {
      role: 'listitem',
      'aria-label': `Step ${i + 1}: ${step.title}`,
    });
    const detailId = `jd-${i}`;
    card.innerHTML = `
      <div class="jc-num">STEP ${Utils.pad(i + 1)}</div>
      <span class="jc-icon" aria-hidden="true">${step.icon}</span>
      <h3 class="jc-title">${step.title}</h3>
      <p class="jc-desc">${step.desc}</p>
      <button class="jc-expand" aria-expanded="false" aria-controls="${detailId}">+ Learn more</button>
      <div class="jc-detail" id="${detailId}" aria-hidden="true">${step.detail}</div>`;

    const btn = card.querySelector('.jc-expand');
    const detail = card.querySelector('.jc-detail');
    btn.addEventListener('click', () => toggleStep(card, btn, detail, i + 1));
    return card;
  }

  function init() {
    const container = Utils.getEl('journeySteps');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    DATA.forEach((step, i) => fragment.appendChild(renderStep(step, i)));
    container.appendChild(fragment);
  }

  return Object.freeze({ init, DATA });
})();

/* ================================================================
   8. QUIZ – Knowledge challenge with scoring and feedback
   ================================================================ */

/**
 * @module Quiz
 * @description 8-question election knowledge quiz with progress and scoring.
 */
const Quiz = (() => {
  /**
   * @typedef {Object} Question
   * @property {string}   q       - Question text
   * @property {string[]} choices - Four answer choices
   * @property {number}   correct - Zero-based index of correct choice
   * @property {string}   explain - Explanation shown after answering
   */

  /** @type {Question[]} */
  const QUESTIONS = [
    { q: 'What is the minimum voting age in India?',                          choices: ['16 years','18 years','21 years','25 years'],            correct: 1, explain: 'Article 326 of the Constitution grants voting rights to every citizen aged 18 or above.' },
    { q: 'Which form must a new voter submit for registration?',              choices: ['Form 1','Form 6','Form 15','Form 10'],                  correct: 1, explain: 'Form 6 is submitted to the Electoral Registration Officer for fresh voter enrolment.' },
    { q: 'What does EVM stand for in Indian elections?',                      choices: ['Electoral Voting Method','Electronic Voting Machine','Efficient Voter Module','Elected Vote Marker'], correct: 1, explain: 'Electronic Voting Machine — India\'s tamper-resistant ballot device used nationwide since 1999.' },
    { q: 'VVPAT shows a paper slip for how many seconds?',                   choices: ['3 seconds','5 seconds','7 seconds','10 seconds'],        correct: 2, explain: 'The paper slip remains visible for exactly 7 seconds so the voter can verify their vote.' },
    { q: 'Which constitutional body conducts elections in India?',            choices: ['Supreme Court','Parliament','Election Commission of India','Ministry of Home Affairs'], correct: 2, explain: 'ECI is established under Article 324 as an autonomous body to superintend all elections.' },
    { q: 'What is the Model Code of Conduct?',                               choices: ['A criminal punishment code','Campaign guidelines by ECI','The vote-counting procedure','The EVM programming manual'], correct: 1, explain: 'MCC is a set of ECI guidelines that political parties and candidates must follow during elections.' },
    { q: 'How many hours before polls close must campaigning stop?',          choices: ['12 hours','24 hours','48 hours','72 hours'],            correct: 2, explain: 'Section 126 of the RPA 1951 prohibits campaigning within 48 hours of poll closing time.' },
    { q: 'What is the purpose of indelible ink on the voter\'s finger?',     choices: ['Identify new voters','Prevent double voting','Verify citizenship','Confirm age'], correct: 1, explain: 'Ink applied to the left index finger proves the person has voted, preventing fraudulent re-entry.' },
  ];

  /** @type {number} Current question index */
  let current = 0;
  /** @type {number} Cumulative correct answers */
  let score = 0;
  /** @type {boolean} Whether current question has been answered */
  let answered = false;

  // ── DOM references ──
  const qEl       = Utils.getEl('quizQ');
  const choicesEl  = Utils.getEl('quizChoices');
  const msgEl      = Utils.getEl('quizMsg');
  const nextBtn    = Utils.getEl('nextBtn');
  const finalEl    = Utils.getEl('quizFinal');
  const fillEl     = Utils.getEl('quizFill');
  const countEl    = Utils.getEl('quizCount');
  const progressEl = document.querySelector('.quiz-track[role="progressbar"]');

  /**
   * Calculates score percentage (0–100).
   * @param {number} correct - Number of correct answers
   * @param {number} total   - Total questions
   * @returns {number} Percentage rounded to nearest integer
   */
  function calcPct(correct, total) {
    if (!total) return 0;
    return Math.round((correct / total) * 100);
  }

  /**
   * Returns a congratulatory message based on score.
   * @param {number} pct - Score percentage
   * @returns {string} Feedback message
   */
  function scoreMessage(pct) {
    if (pct >= 90) return '🏆 Outstanding! You are a democracy champion!';
    if (pct >= 75) return '🌟 Excellent civic knowledge!';
    if (pct >= 50) return '👍 Good foundation — keep learning!';
    return '💪 Every informed voter starts somewhere — keep going!';
  }

  /** Updates progress bar and question counter display */
  function updateProgress() {
    const pct = calcPct(current, QUESTIONS.length);
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (progressEl) progressEl.setAttribute('aria-valuenow', String(pct));
    if (countEl) countEl.textContent = `${current + 1} / ${QUESTIONS.length}`;
  }

  /** Renders the current question and its answer choices */
  function renderQuestion() {
    if (current >= QUESTIONS.length) { showResult(); return; }

    const q = QUESTIONS[current];
    updateProgress();
    if (qEl) qEl.textContent = q.q;
    if (msgEl) { msgEl.textContent = ''; msgEl.style.color = ''; }
    if (nextBtn) nextBtn.style.display = 'none';
    answered = false;

    if (!choicesEl) return;
    choicesEl.innerHTML = '';
    q.choices.forEach((choice, i) => {
      const btn = Utils.el('button', 'choice-btn', {
        role: 'radio',
        'aria-checked': 'false',
        'aria-label': `Option ${i + 1}: ${choice}`,
      });
      btn.textContent = choice;
      btn.addEventListener('click', () => handleAnswer(i, btn));
      choicesEl.appendChild(btn);
    });
  }

  /**
   * Processes the user's answer selection.
   * @param {number} chosen - Index of chosen answer
   * @param {HTMLButtonElement} btn - The clicked button element
   */
  function handleAnswer(chosen, btn) {
    if (answered) return;
    answered = true;

    const q = QUESTIONS[current];
    const allBtns = choicesEl?.querySelectorAll('.choice-btn') ?? [];
    allBtns.forEach((b) => { b.disabled = true; });
    allBtns[q.correct]?.classList.add('correct');
    allBtns[q.correct]?.setAttribute('aria-checked', 'true');

    if (chosen === q.correct) {
      score++;
      if (msgEl) { msgEl.textContent = `✅ Correct! ${q.explain}`; msgEl.style.color = '#b5f03e'; }
    } else {
      btn.classList.add('wrong');
      if (msgEl) { msgEl.textContent = `❌ ${q.explain}`; msgEl.style.color = '#f87171'; }
    }

    if (nextBtn) nextBtn.style.display = 'inline-block';
  }

  /** Renders the final result screen after all questions */
  function showResult() {
    if (fillEl) fillEl.style.width = '100%';
    if (progressEl) progressEl.setAttribute('aria-valuenow', '100');
    if (qEl) qEl.textContent = '';
    if (choicesEl) choicesEl.innerHTML = '';
    if (msgEl) msgEl.textContent = '';
    if (nextBtn) nextBtn.style.display = 'none';

    const pct = calcPct(score, QUESTIONS.length);
    Utils.track('quiz_completed', { score: pct, correct: score, total: QUESTIONS.length });
    if (window.vwAnalytics?.trackQuiz) window.vwAnalytics.trackQuiz(score, QUESTIONS.length);

    if (!finalEl) return;
    finalEl.style.display = 'block';
    finalEl.innerHTML = `
      <p style="color:var(--muted);font-size:0.85rem;margin-bottom:4px">Your Score</p>
      <span class="final-score" aria-label="${pct} percent correct">${pct}%</span>
      <p class="final-msg">${scoreMessage(pct)}</p>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:24px">
        ${score} of ${QUESTIONS.length} correct
      </p>
      <button class="cta-primary" onclick="Quiz.restart()" aria-label="Restart quiz from beginning">
        Try Again 🔄
      </button>`;
  }

  /** Resets quiz state to initial values and re-renders first question */
  function restart() {
    current = 0;
    score = 0;
    if (finalEl) finalEl.style.display = 'none';
    renderQuestion();
  }

  function init() {
    nextBtn?.addEventListener('click', () => { current++; renderQuestion(); });
    renderQuestion();
  }

  return Object.freeze({ init, restart, calcPct, scoreMessage });
})();

/** Expose Quiz.restart globally so inline onclick can call it */
window.Quiz = Quiz;

/* ================================================================
   9. CHAT – AI-powered civic assistant with smart offline knowledge
   ================================================================ */

/**
 * @module Chat
 * @description Election AI assistant using keyword-matched knowledge base.
 * Provides instant offline responses covering all major election topics.
 */
const Chat = (() => {
  /**
   * @typedef {Object} KnowledgeEntry
   * @property {string[]} keys     - Keywords that trigger this response
   * @property {string}   response - Formatted response text
   */

  /** @type {KnowledgeEntry[]} */
  const KB = [
    {
      keys: ['register','registration','form 6','enrol','sign up','new voter'],
      response: `📝 How to Register as a New Voter:\n\n1. Visit voters.eci.gov.in or your nearest ERO office\n2. Fill Form 6 (new voter application)\n3. Attach: Aadhaar, proof of address, passport photo\n4. Submit and track your application status online\n5. Receive EPIC card by post (or download e-EPIC immediately)\n\n✅ Helpline: 1950 | Registration closes ~6 weeks before polling day.`
    },
    {
      keys: ['evm','vvpat','electronic voting','machine','button','press'],
      response: `🖥️ EVM & VVPAT — How They Work:\n\nEVM (Electronic Voting Machine):\n• Shows candidate names with party symbols\n• Press the blue button next to your candidate\n• A green light + beep confirms your vote is recorded\n\nVVPAT (Voter Verifiable Paper Audit Trail):\n• A paper slip appears for exactly 7 SECONDS after you press the button\n• It shows the candidate name and symbol you voted for\n• Verify it matches your choice before it drops into the sealed box\n\n🔒 EVMs are air-gapped (never connected to internet) — completely secure.`
    },
    {
      keys: ['id','identification','document','carry','bring','proof','aadhaar','passport'],
      response: `🪪 What to Carry to the Polling Booth:\n\nPrimary: Your EPIC / Voter ID Card\n\nAlternate IDs accepted by ECI:\n• Aadhaar Card\n• Passport\n• Driving License\n• PAN Card\n• Bank / Post Office passbook (with photo)\n• MNREGA Job Card\n• Health Insurance Smart Card (RSBY)\n• Service Photo ID (Govt. employees)\n• Pension document with photograph\n\nAny ONE of the above is sufficient. No need to carry all.`
    },
    {
      keys: ['count','counting','result','declare','tally','winner','result day'],
      response: `📊 How Votes Are Counted & Results Declared:\n\n1. Counting Day is separate from Polling Day (announced by ECI)\n2. EVMs transported under security to counting centres\n3. Candidates' counting agents present as observers\n4. Each EVM is unsealed and results tallied\n5. Announcements made round by round, constituency by constituency\n6. Returning Officer signs the final declaration for the winner\n7. Full results published live at results.eci.gov.in\n\n⏱️ Full results usually available within 24 hours of counting start.`
    },
    {
      keys: ['model code','mcc','conduct','campaign rules','election rules','code of conduct'],
      response: `⚖️ Model Code of Conduct (MCC):\n\nActivates when ECI announces election schedule. Applies to all parties and candidates.\n\nKey provisions:\n• No use of government resources for campaigning\n• No communal or divisive speeches allowed\n• Voter bribery is a criminal offence (IPC Section 171)\n• All paid political ads must be pre-certified by ECI\n• Campaign blackout: 48 hours before polling ends\n• Exit polls banned until the last phase concludes\n\nViolations can result in FIR, disqualification, or election cancellation.`
    },
    {
      keys: ['booth','polling booth','locate','find','where','which booth','polling station'],
      response: `🗺️ How to Find Your Polling Booth:\n\n3 Easy Methods:\n\n📱 SMS: Send EPIC <your number> to 1950\n   Example: EPIC ABC1234567\n\n🌐 Online: voters.eci.gov.in → Search by EPIC or Name\n\n📞 Call: ECI Helpline 1950 (free, multilingual, 24×7 during elections)\n\nYour EPIC card also shows:\n• Booth address and part number\n• Your serial number in the electoral roll\n\n📍 All booths are within 2 km of registered home address by law.`
    },
    {
      keys: ['eligib','qualify','who can vote','requirements','age limit','18'],
      response: `✅ Voting Eligibility in India:\n\nYou CAN vote if:\n• You are 18 years or older on January 1 of the election year\n• You are a citizen of India\n• You are ordinarily resident in the constituency\n• You are of sound mind\n• You are enrolled as a voter in the electoral roll\n\nYou CANNOT vote if:\n• You are not registered as a voter\n• You are serving a sentence for certain electoral offences\n• A court has declared you of unsound mind\n\nEvery eligible citizen has an equal and secret vote — exercise it!`
    },
    {
      keys: ['blackout','silence period','48 hours','section 126','campaign stop'],
      response: `🔇 Campaign Blackout Period:\n\nSection 126 of the Representation of the People Act 1951 mandates:\n• All election campaigning MUST STOP 48 hours before the scheduled close of polls\n\nBanned during blackout:\n• Public meetings, rallies, processions\n• TV, radio, social media political ads\n• Door-to-door canvassing\n• Distribution of pamphlets, gifts, or cash\n\nPurpose: To give every voter uninterrupted, pressure-free time to make their final decision.\n\nPenalty: Up to 2 years imprisonment or fine for violations.`
    },
    {
      keys: ['ink','indelible','purple','finger','mark','silver nitrate'],
      response: `💜 Indelible Ink on Voter's Finger:\n\nAfter voting, polling staff apply ink to your LEFT INDEX FINGER NAIL BED.\n\nFacts:\n• Made from silver nitrate (AgNO₃)\n• Cannot be washed off — lasts 72+ hours\n• Sole purpose: Prevent any attempt to vote more than once\n• Manufactured exclusively at Mysore Paints and Varnish Ltd.\n• Used in Indian elections continuously since 1962\n• ~26 million ml used per general election\n\nThe ink mark is your badge of democratic participation! 🇮🇳`
    },
    {
      keys: ['election commission','eci','who runs','conducts','authority','article 324'],
      response: `🏛️ Election Commission of India (ECI):\n\nEstablished under Article 324 of the Constitution as a fully autonomous authority.\n\nResponsibilities:\n• Announce election schedules and MCC activation\n• Maintain and update Electoral Rolls\n• Enforce Model Code of Conduct strictly\n• Deploy Central Armed Police Forces to sensitive areas\n• Monitor media for paid news and violations\n• Certify and distribute EVMs and VVPATs\n• Officially declare election results\n\nKey fact: ECI is INDEPENDENT — no government, court, or party can override its decisions on conduct of elections.`
    },
    {
      keys: ['hello','hi','hey','help','start','guide','welcome','what can'],
      response: `⚡ Welcome to VoteWise AI Guide!\n\nI can answer all your questions about Indian elections:\n\n🗳️ Voter registration and Form 6\n🖥️ How EVM and VVPAT work\n🪪 Documents needed at the booth\n📊 How votes are counted\n⚖️ Model Code of Conduct\n🗺️ Locating your polling booth\n✅ Voting eligibility requirements\n💜 The indelible ink tradition\n🔇 Campaign blackout rules\n🏛️ Role of the Election Commission\n\nJust type any question or tap a suggestion below! 😊`
    },
  ];

  /** @type {string[]} Quick question suggestions */
  const QUICK = [
    'How do I register to vote?',
    'How does an EVM work?',
    'What ID do I need at the booth?',
    'How are votes counted?',
    'What is the Model Code of Conduct?',
    'How do I find my polling booth?',
  ];

  /**
   * Finds the best matching knowledge base response for a user query.
   * @param {string} text - Sanitised user input
   * @returns {string} Matched response or default fallback
   */
  function findResponse(text) {
    const lower = text.toLowerCase();
    const match = KB.find((entry) => entry.keys.some((k) => lower.includes(k)));
    return match?.response ?? `🤔 Good question about "${text}"!\n\nFor accurate, up-to-date information:\n🇮🇳 Portal: voters.eci.gov.in\n📞 Helpline: 1950 (free, multilingual)\n📊 Results: results.eci.gov.in\n\nOr try asking:\n• "How do I register to vote?"\n• "How does an EVM work?"\n• "What ID do I need?"`;
  }

  /**
   * Appends a message bubble to the chat feed.
   * @param {string}  text   - Message content (newlines converted to <br>)
   * @param {boolean} isUser - True for user messages, false for AI
   */
  function appendMessage(text, isUser) {
    const feed = Utils.getEl('chatFeed');
    if (!feed) return;
    const div = Utils.el('div', `msg ${isUser ? 'msg--user' : 'msg--ai'}`, {
      role: 'article',
      'aria-label': isUser ? 'Your message' : 'VoteWise AI response',
    });
    div.innerHTML = `
      <span class="msg-icon" aria-hidden="true">${isUser ? '👤' : '⚡'}</span>
      <div class="msg-text">${text.replace(/\n/g, '<br/>')}</div>`;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  /** Shows animated typing indicator while response is being prepared */
  function showTyping() {
    const feed = Utils.getEl('chatFeed');
    if (!feed) return;
    const div = Utils.el('div', 'msg msg--ai', { id: 'typingMsg', 'aria-label': 'AI is composing a response' });
    div.innerHTML = `<span class="msg-icon" aria-hidden="true">⚡</span><div class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></div>`;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  /** Removes the typing indicator from the chat feed */
  function removeTyping() {
    Utils.getEl('typingMsg')?.remove();
  }

  /**
   * Sends a message, shows typing indicator, then appends AI response.
   * @param {string} [preset] - Optional pre-set message (from quick buttons)
   */
  function send(preset) {
    const input = Utils.getEl('userInput');
    const sendBtn = Utils.getEl('sendBtn');
    const raw = preset || input?.value || '';
    const text = Utils.sanitise(raw);
    if (!text) return;

    if (input) input.value = '';
    appendMessage(text, true);
    if (sendBtn) sendBtn.disabled = true;
    Utils.track('chat_message_sent', { length: text.length });

    showTyping();
    setTimeout(() => {
      removeTyping();
      appendMessage(findResponse(text), false);
      if (sendBtn) sendBtn.disabled = false;
    }, Config.CHAT_DELAY);
  }

  /** Builds and appends quick-question suggestion buttons */
  function buildQuickButtons() {
    const container = Utils.getEl('quickAsks');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    QUICK.forEach((q) => {
      const btn = Utils.el('button', 'quick-btn', {
        role: 'listitem',
        'aria-label': `Ask: ${q}`,
      });
      btn.textContent = q;
      btn.addEventListener('click', () => send(q));
      fragment.appendChild(btn);
    });
    container.appendChild(fragment);
  }

  function init() {
    buildQuickButtons();
    const sendBtn = Utils.getEl('sendBtn');
    const input   = Utils.getEl('userInput');
    sendBtn?.addEventListener('click', () => send());
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) send(); });
  }

  return Object.freeze({ init, findResponse, KB });
})();

/* ================================================================
   10. GLOSSARY – Searchable election terminology dictionary
   ================================================================ */

/**
 * @module Glossary
 * @description Renders 20 election terms with live search filtering.
 */
const Glossary = (() => {
  /**
   * @typedef {Object} Term
   * @property {string} term - Election term
   * @property {string} def  - Plain-language definition
   */

  /** @type {Term[]} */
  const DATA = [
    { term: 'Affidavit',                def: 'A sworn statement submitted by candidates declaring their criminal record, assets, liabilities, and educational qualifications before contesting.' },
    { term: 'Ballot',                   def: 'The official medium — paper slip or EVM — used by a registered voter to express their candidate choice in an election.' },
    { term: 'Booth Capturing',          def: 'An illegal act of forcibly seizing control of a polling station to cast fraudulent votes; a serious electoral offence under the RPA.' },
    { term: 'By-election',              def: 'An election held outside the regular schedule to fill a seat left vacant by death, resignation, disqualification, or court order.' },
    { term: 'Candidate',                def: 'A person who has filed valid nomination papers and declared their intent to contest an election for a legislative seat.' },
    { term: 'Constituency',             def: 'A geographically defined area whose registered voters collectively elect one representative to a legislative body.' },
    { term: 'Democracy',                def: 'A system of governance where supreme authority rests with citizens, exercised through free, fair, and periodic elections.' },
    { term: 'EPIC',                     def: 'Elector Photo Identity Card — the official voter ID issued by the Election Commission of India bearing photo, EPIC number, and booth details.' },
    { term: 'Electoral Roll',           def: 'The official, publicly accessible register of all persons entitled to vote in a constituency, revised annually by the ERO.' },
    { term: 'EVM',                      def: 'Electronic Voting Machine — India\'s tamper-proof, air-gapped electronic ballot device used in all elections since 1999.' },
    { term: 'Franchise',                def: 'The legal right to vote in elections. Universal Adult Franchise in India means every citizen 18+ can vote regardless of status.' },
    { term: 'Incumbent',                def: 'The sitting holder of an elected office who is contesting the current election to retain their seat.' },
    { term: 'Manifesto',                def: 'A formal public document issued by a political party before elections outlining its policy agenda, promises, and vision for governance.' },
    { term: 'Model Code of Conduct',    def: 'ECI guidelines activated at election announcement that govern the conduct of all political parties, candidates, and the government.' },
    { term: 'Nomination',               def: 'The formal legal process by which a candidate declares their candidature by filing prescribed papers with the Returning Officer.' },
    { term: 'Polling Officer',          def: 'A government official appointed by the Election Commission to manage the conduct of polling at an assigned booth on election day.' },
    { term: 'Psephology',               def: 'The statistical study and scientific analysis of elections, voting behaviour, electoral trends, and prediction methodologies.' },
    { term: 'Returning Officer',        def: 'The official designated by ECI to manage the complete election process in a constituency and announce the official result.' },
    { term: 'Suffrage',                 def: 'The fundamental right to participate in elections by casting a vote. Universal suffrage means all eligible adult citizens possess it.' },
    { term: 'VVPAT',                    def: 'Voter Verifiable Paper Audit Trail — machine attached to EVM that prints a paper slip for 7 seconds so voters can verify their recorded vote.' },
  ];

  /**
   * Filters visible glossary cards based on search query.
   * Matches against both term and definition text.
   * @param {string} query - Lowercased search string
   * @param {NodeListOf<Element>} cards - All glossary card elements
   */
  function filterCards(query, cards) {
    cards.forEach((card) => {
      const text = card.dataset.term + ' ' + card.querySelector('.glo-def')?.textContent.toLowerCase();
      card.classList.toggle('hidden', query.length > 0 && !text.includes(query));
    });
  }

  /**
   * Renders a single glossary card article.
   * @param {Term} item - Term data object
   * @returns {HTMLElement} Rendered card element
   */
  function renderCard(item) {
    const card = Utils.el('article', 'glo-card', {
      role: 'listitem',
      'aria-label': `Term: ${item.term}`,
      'data-term': item.term.toLowerCase(),
    });
    card.innerHTML = `<div class="glo-term">${item.term}</div><div class="glo-def">${item.def}</div>`;
    return card;
  }

  function init() {
    const grid   = Utils.getEl('gloGrid');
    const search = Utils.getEl('gloSearch');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    DATA.forEach((item) => fragment.appendChild(renderCard(item)));
    grid.appendChild(fragment);

    if (search) {
      search.addEventListener('input', () => {
        filterCards(search.value.toLowerCase().trim(), grid.querySelectorAll('.glo-card'));
      });
    }
  }

  return Object.freeze({ init, DATA, filterCards });
})();

/* ================================================================
   11. OBSERVER – IntersectionObserver scroll-reveal engine
   ================================================================ */

/**
 * @module Observer
 * @description Adds .visible class to cards as they enter the viewport,
 * with staggered delay for a cascading reveal effect.
 */
const Observer = (() => {
  /**
   * @type {IntersectionObserver}
   * Shared observer instance reused across all reveal targets.
   */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = i * Config.STAGGER_DELAY;
        setTimeout(() => {
          entry.target.classList.add('visible');
          Utils.track('section_revealed', { element: entry.target.className });
        }, delay);
        io.unobserve(entry.target);
      }
    });
  }, {
    threshold: Config.OBSERVER_THRESHOLD,
    rootMargin: Config.OBSERVER_ROOT_MARGIN,
  });

  function init() {
    // Defer observation until modules have rendered their DOM nodes
    setTimeout(() => {
      document.querySelectorAll('.process-card, .journey-card, .glo-card')
        .forEach((el) => io.observe(el));
    }, 150);
  }

  return Object.freeze({ init });
})();

/* ================================================================
   12. ROUTER – Smooth scroll navigation with focus management
   ================================================================ */

/**
 * @module Router
 * @description Intercepts anchor clicks for smooth scrolling and
 * proper focus management for keyboard/screen reader users.
 */
const Router = (() => {
  /**
   * Scrolls to the target element and moves keyboard focus to it.
   * @param {HTMLElement} target - Destination element
   */
  function scrollTo(target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  /** Closes mobile menu — delegates to NavModule's state */
  function closeMobileMenu() {
    Utils.getEl('mobileMenu')?.classList.remove('open');
    Utils.getEl('mobileMenu')?.setAttribute('aria-hidden', 'true');
    Utils.getEl('mobileToggle')?.setAttribute('aria-expanded', 'false');
  }

  function init() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) scrollTo(target);
        closeMobileMenu();
      });
    });
  }

  return Object.freeze({ init });
})();

/* ================================================================
   13. ANALYTICS – Centralised event tracking wrapper
   ================================================================ */

/**
 * @module Analytics
 * @description Initialises and fires Google Analytics + Firebase events.
 */
const Analytics = (() => {
  function init() {
    Utils.track('app_initialised', { version: Config.VERSION, platform: 'web' });
  }
  return Object.freeze({ init });
})();

/* ================================================================
   14. APP – Bootstrap: initialise all modules in dependency order
   ================================================================ */

/**
 * @module App
 * @description Entry point — waits for DOMContentLoaded then boots all modules.
 */
const App = (() => {
  function boot() {
    NavModule.init();
    CounterModule.init();
    VoteCounter.init();
    Timeline.init();
    Journey.init();
    Quiz.init();
    Chat.init();
    Glossary.init();
    Observer.init();
    Router.init();
    Analytics.init();
  }

  return Object.freeze({ boot });
})();

document.addEventListener('DOMContentLoaded', App.boot);
