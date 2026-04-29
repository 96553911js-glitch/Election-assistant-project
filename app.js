/**
 * @file app.js
 * @description VoteWise – Democratic Education Platform
 * @version 2.0.0
 * @author VoteWise Civic Team
 * @license MIT
 *
 * Architecture: Module Pattern with IIFE
 * Sections:
 *  - NavModule: Sticky header, mobile menu
 *  - CounterModule: Animated statistics
 *  - VoteCounterModule: Live vote simulation
 *  - ProcessModule: Election timeline builder
 *  - JourneyModule: Voting steps accordion
 *  - QuizModule: Knowledge challenge engine
 *  - ChatModule: AI-powered civic assistant
 *  - GlossaryModule: Searchable term dictionary
 *  - ObserverModule: Scroll reveal animations
 *  - RouterModule: Smooth scroll navigation
 */

'use strict';

/* ============================================================
   CONSTANTS & CONFIGURATION
   ============================================================ */

/** @constant {number} Animation step interval in milliseconds */
const ANIMATION_INTERVAL = 40;

/** @constant {number} Counter animation duration in milliseconds */
const COUNTER_DURATION = 1800;

/** @constant {number} Chat response delay in milliseconds */
const CHAT_DELAY = 900;

/** @constant {number} Maximum chat input length */
const MAX_INPUT_LENGTH = 500;

/** @constant {number} Scroll observer root margin */
const OBSERVER_ROOT_MARGIN = '0px 0px -40px 0px';

/** @constant {number} Scroll observer threshold */
const OBSERVER_THRESHOLD = 0.08;

/** @constant {number} Stagger delay between reveal items */
const STAGGER_DELAY = 70;

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * Safely queries a DOM element, logs warning if not found
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`[VoteWise] Element #${id} not found`);
  return el;
}

/**
 * Creates a DOM element with class and attributes
 * @param {string} tag - HTML tag name
 * @param {string} className - CSS class name
 * @param {Object} [attrs] - Additional attributes
 * @returns {HTMLElement}
 */
function createElement(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
function sanitize(input) {
  return String(input)
    .trim()
    .substring(0, MAX_INPUT_LENGTH)
    .replace(/[<>]/g, '');
}

/* ============================================================
   NAV MODULE
   ============================================================ */
const NavModule = (() => {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('mobileMenu');
  let open = false;

  function init() {
    window.addEventListener('scroll', onScroll, { passive: true });
    toggle.addEventListener('click', toggleMenu);
    document.addEventListener('click', closeOnOutside);
  }

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }

  function toggleMenu() {
    open = !open;
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
  }

  function closeOnOutside(e) {
    if (open && !menu.contains(e.target) && !toggle.contains(e.target)) {
      open = false;
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  return { init };
})();

/* ============================================================
   COUNTER MODULE
   ============================================================ */
const CounterModule = (() => {
  /**
   * Animates a numeric counter using requestAnimationFrame for smooth performance
   * @param {HTMLElement} el - Target element with data-count attribute
   */
  function animateValue(el) {
    const target = parseInt(el.dataset.count, 10);
    const startTime = performance.now();

    /**
     * RAF callback for smooth animation
     * @param {number} now - Current timestamp
     */
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / COUNTER_DURATION, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateValue(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
  }

  return { init };
})();

/* ============================================================
   VOTE COUNTER SIMULATION MODULE
   ============================================================ */
const VoteCounterModule = (() => {
  const el = document.getElementById('voteCount');
  let count = Math.floor(Math.random() * 8000) + 2000;

  /** Cache for locale string to avoid repeated calls */
  let lastCount = -1;

  function tick() {
    const add = Math.floor(Math.random() * 3);
    count += add;
    // Only update DOM if value changed (avoid unnecessary repaints)
    if (el && count !== lastCount) {
      el.textContent = count.toLocaleString('en-IN');
      lastCount = count;
    }
    setTimeout(tick, 800 + Math.random() * 1200);
  }

  function init() { if (el) tick(); }
  return { init };
})();

/* ============================================================
   PROCESS MODULE (Election Timeline)
   ============================================================ */
const ProcessModule = (() => {
  /** @type {Array<{phase:string, title:string, desc:string}>} */
  const data = [
    { phase: "Month 12 Before", title: "Election Announced", desc: "The Election Commission officially announces the election date, schedule, and begins all preparatory work." },
    { phase: "Month 10 Before", title: "Registration Opens", desc: "Voter registration portals open. Citizens can register or update their details on voters.eci.gov.in." },
    { phase: "Month 8 Before", title: "Candidate Nominations", desc: "Aspiring candidates file their nomination papers and declaration of assets with the returning officer." },
    { phase: "Month 6 Before", title: "Nomination Deadline", desc: "Final cutoff for candidate nominations. Scrutiny of papers begins. Withdrawals are allowed for a limited period." },
    { phase: "Month 4 Before", title: "Campaigns Begin", desc: "Official campaign period starts. Candidates hold rallies, public meetings, and media campaigns under Model Code." },
    { phase: "Month 2 Before", title: "Registration Closes", desc: "Last date to register as a voter for this election. All updates to the electoral roll are finalized." },
    { phase: "1 Month Before", title: "Voter Cards Issued", desc: "Registered voters receive Voter ID cards with polling booth details and EPIC number." },
    { phase: "2 Weeks Before", title: "Blackout Period", desc: "All political campaigning is banned 48 hours before polling begins to ensure undisturbed voter decision-making." },
    { phase: "Election Day", title: "🗳️ Polling Day", desc: "Polling stations open at 7 AM. All eligible registered voters cast their ballots on EVMs under official supervision." },
    { phase: "Election Evening", title: "Polls Close", desc: "Polling stations close. EVMs are sealed and stored under security with party representatives present as witnesses." }
  ];

  function build() {
    const container = document.getElementById('processTrack');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    data.forEach((item, i) => {
      const card = document.createElement('article');
      card.className = 'process-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `Step ${i + 1}: ${item.title}`);
      card.innerHTML = `
        <div class="pc-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
        <div class="pc-phase">${item.phase}</div>
        <h3 class="pc-title">${item.title}</h3>
        <p class="pc-desc">${item.desc}</p>`;
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function init() { build(); }
  return { init };
})();

/* ============================================================
   JOURNEY MODULE (Voting Steps)
   ============================================================ */
const JourneyModule = (() => {
  /** @type {Array<{icon:string, title:string, desc:string, detail:string}>} */
  const steps = [
    { icon: "📋", title: "Verify Eligibility", desc: "Confirm you meet all legal requirements to vote in this constituency.", detail: "Age 18+, Indian citizen, sound mind, registered in the constituency, not disqualified under the RPA 1951." },
    { icon: "📝", title: "Complete Registration", desc: "Register on voters.eci.gov.in or at your local Electoral Registration Officer office.", detail: "Submit Form 6 online with Aadhaar, proof of address, and a photograph. Processing takes 2-4 weeks." },
    { icon: "📬", title: "Receive Your EPIC", desc: "Your Elector Photo Identity Card (EPIC/Voter ID) will be mailed to your registered address.", detail: "Also downloadable as e-EPIC (PDF) from voters.eci.gov.in. Carries your unique EPIC number and booth details." },
    { icon: "🗺️", title: "Locate Your Booth", desc: "Find the exact polling booth assigned to your address before election day.", detail: "Check your EPIC card, or SMS 'EPIC YourEPICNumber' to 1950, or visit voters.eci.gov.in." },
    { icon: "🪪", title: "Prepare Your ID", desc: "Keep your EPIC card and one additional photo ID ready the night before polling day.", detail: "Accepted alternatives: Aadhaar, Passport, Driving License, PAN Card, Bank/Post passbook with photo, MNREGA card." },
    { icon: "⏰", title: "Reach Polling Booth", desc: "Arrive at your designated polling station during voting hours (typically 7 AM – 6 PM).", detail: "Avoid the rush at opening and peak hours. Polling booths must be within 2km of your home." },
    { icon: "☑️", title: "Cast Your Vote on EVM", desc: "Press the button next to your chosen candidate on the Electronic Voting Machine.", detail: "A green light + beep confirms your vote. A VVPAT paper slip appears for 7 seconds to verify — check it!" },
    { icon: "✅", title: "Collect Your Mark", desc: "Get indelible ink on your finger — proof of your vote — and collect your voter slip.", detail: "The ink mark lasts 72+ hours and proves you exercised your democratic right. Keep your voter slip as reference." }
  ];

  function build() {
    const container = document.getElementById('journeySteps');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    steps.forEach((step, i) => {
      const card = document.createElement('article');
      card.className = 'journey-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `Step ${i + 1}: ${step.title}`);

      card.innerHTML = `
        <div class="jc-num">STEP ${String(i + 1).padStart(2, '0')}</div>
        <span class="jc-icon" aria-hidden="true">${step.icon}</span>
        <h3 class="jc-title">${step.title}</h3>
        <p class="jc-desc">${step.desc}</p>
        <button class="jc-expand" aria-expanded="false" aria-controls="jd-${i}">+ Learn more</button>
        <div class="jc-detail" id="jd-${i}" aria-hidden="true">${step.detail}</div>`;

      const btn = card.querySelector('.jc-expand');
      const detail = card.querySelector('.jc-detail');

      btn.addEventListener('click', () => {
        const expanded = card.classList.toggle('open');
        btn.textContent = expanded ? '− Show less' : '+ Learn more';
        btn.setAttribute('aria-expanded', String(expanded));
        detail.setAttribute('aria-hidden', String(!expanded));
        if (window.vwAnalytics) window.vwAnalytics.trackStep(i + 1);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function init() { build(); }
  return { init };
})();

/* ============================================================
   QUIZ MODULE (Knowledge Challenge)
   ============================================================ */
const QuizModule = (() => {
  const questions = [
    { q: "What is the minimum age to vote in India's general elections?", choices: ["16 years", "18 years", "21 years", "25 years"], correct: 1, explain: "Under Article 326 of the Indian Constitution, every citizen who is 18 years of age or older is entitled to vote." },
    { q: "Which document must you submit to register as a new voter in India?", choices: ["Form 1", "Form 6", "Form 15", "Form 10"], correct: 1, explain: "Form 6 is the application form for new voter registration, submitted to the Electoral Registration Officer." },
    { q: "What does EVM stand for in Indian elections?", choices: ["Electoral Voting Method", "Electronic Voting Machine", "Efficient Voter Module", "Elected Vote Marker"], correct: 1, explain: "EVM stands for Electronic Voting Machine — the tamper-proof electronic device used in Indian elections since 1999." },
    { q: "What is VVPAT used for in elections?", choices: ["Voter Verification Portal Access Terminal", "Voter Verifiable Paper Audit Trail", "Verified Vote Processing and Tallying", "Virtual Voter Photo Authentication Tool"], correct: 1, explain: "VVPAT shows a paper slip for 7 seconds after pressing the EVM button, allowing voters to verify their vote was recorded correctly." },
    { q: "Who is responsible for conducting elections in India?", choices: ["Supreme Court of India", "Parliament of India", "Election Commission of India", "Ministry of Home Affairs"], correct: 2, explain: "The Election Commission of India (ECI) is an autonomous constitutional authority responsible for administering all elections in India." },
    { q: "What is the 'Model Code of Conduct' in Indian elections?", choices: ["A legal punishment code for electoral fraud", "Guidelines that political parties must follow during election period", "The official counting procedure for votes", "The code used to program EVMs"], correct: 1, explain: "The Model Code of Conduct is a set of guidelines issued by the ECI that political parties and candidates must follow during election campaigns." },
    { q: "How long before polling day does the campaign blackout period begin?", choices: ["12 hours", "24 hours", "48 hours", "72 hours"], correct: 2, explain: "Section 126 of the Representation of the People Act prohibits campaigning 48 hours before polling day ends in a constituency." },
    { q: "What is the indelible ink mark on a voter's finger for?", choices: ["To identify first-time voters", "To prevent double voting", "To verify citizenship", "To check voter age"], correct: 1, explain: "The indelible ink applied to the left index finger proves a person has already voted, preventing any attempt to vote twice." }
  ];

  let current = 0;
  let score = 0;
  let answered = false;

  const qEl = document.getElementById('quizQ');
  const choicesEl = document.getElementById('quizChoices');
  const msgEl = document.getElementById('quizMsg');
  const nextBtn = document.getElementById('nextBtn');
  const finalEl = document.getElementById('quizFinal');
  const fillEl = document.getElementById('quizFill');
  const countEl = document.getElementById('quizCount');
  const progressbar = document.querySelector('.quiz-track[role="progressbar"]');

  function render() {
    if (current >= questions.length) { showResult(); return; }

    const q = questions[current];
    const pct = (current / questions.length) * 100;

    fillEl.style.width = `${pct}%`;
    if (progressbar) progressbar.setAttribute('aria-valuenow', String(pct));
    countEl.textContent = `${current + 1} / ${questions.length}`;
    qEl.textContent = q.q;
    msgEl.textContent = '';
    nextBtn.style.display = 'none';
    answered = false;

    choicesEl.innerHTML = '';
    q.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', `Option ${i + 1}: ${choice}`);
      btn.addEventListener('click', () => handleAnswer(i, btn));
      choicesEl.appendChild(btn);
    });
  }

  function handleAnswer(chosen, btn) {
    if (answered) return;
    answered = true;

    const q = questions[current];
    const allBtns = choicesEl.querySelectorAll('.choice-btn');
    allBtns.forEach(b => b.disabled = true);
    allBtns[q.correct].classList.add('correct');
    allBtns[q.correct].setAttribute('aria-checked', 'true');

    if (chosen === q.correct) {
      score++;
      msgEl.textContent = '✅ Correct! ' + q.explain;
      msgEl.style.color = '#b5f03e';
    } else {
      btn.classList.add('wrong');
      msgEl.textContent = '❌ ' + q.explain;
      msgEl.style.color = '#f87171';
    }

    nextBtn.style.display = 'inline-block';
  }

  function showResult() {
    fillEl.style.width = '100%';
    qEl.textContent = '';
    choicesEl.innerHTML = '';
    msgEl.textContent = '';
    nextBtn.style.display = 'none';

    const pct = Math.round((score / questions.length) * 100);
    const msgs = {
      90: '🏆 Outstanding! You are a democracy champion!',
      75: '🌟 Excellent civic knowledge!',
      50: '👍 Good foundation — keep learning!',
      0:  '💪 Every expert was once a beginner!'
    };
    const msg = Object.entries(msgs).reverse().find(([t]) => pct >= +t)?.[1] || msgs[0];

    if (window.vwAnalytics) window.vwAnalytics.trackQuiz(score, questions.length);
    if (typeof gtag === 'function') gtag('event', 'quiz_complete', { score: pct, correct: score, total: questions.length });

    finalEl.style.display = 'block';
    finalEl.innerHTML = `
      <p style="color:var(--muted);font-size:0.85rem;margin-bottom:4px">Your Score</p>
      <span class="final-score" aria-label="${pct} percent">${pct}%</span>
      <p class="final-msg">${msg}</p>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:24px">${score} of ${questions.length} correct</p>
      <button class="cta-primary" onclick="QuizModule.restart()" aria-label="Restart the quiz">Try Again 🔄</button>`;
  }

  function restart() {
    current = 0; score = 0;
    finalEl.style.display = 'none';
    render();
  }

  function init() {
    if (nextBtn) nextBtn.addEventListener('click', () => { current++; render(); });
    render();
  }

  return { init, restart };
})();
window.QuizModule = QuizModule;

/* ============================================================
   CHAT MODULE (AI Civic Assistant)
   ============================================================ */
const ChatModule = (() => {
  const feed = document.getElementById('chatFeed');
  const input = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');

  const quickQuestions = [
    "How do I register to vote?",
    "What is an EVM and VVPAT?",
    "What ID do I need at the polling booth?",
    "How are votes counted?",
    "What is the Model Code of Conduct?",
    "How do I find my polling booth?"
  ];

  /** @type {Array<{keywords:string[], response:string}>} */
  const knowledge = [
    {
      keywords: ['register','registration','form 6','enroll','sign up','new voter'],
      response: `📝 How to Register as a New Voter:\n\n1. Visit voters.eci.gov.in or your nearest ERO office\n2. Fill Form 6 (new registration application)\n3. Submit with: Aadhaar card, proof of address, passport photo\n4. Track your application status online\n5. Your EPIC/Voter ID card will be mailed in 2-4 weeks\n\n✅ You can also download your e-EPIC (digital Voter ID) immediately after registration is approved!`
    },
    {
      keywords: ['evm','vvpat','electronic voting','machine','how to vote on','button'],
      response: `🖥️ EVM & VVPAT Explained:\n\nEVM = Electronic Voting Machine\n• Shows all candidates with their party symbols\n• Press the blue button next to your candidate\n• A beep + green light confirms your vote\n\nVVPAT = Voter Verifiable Paper Audit Trail\n• After pressing the EVM button, a paper slip appears for 7 SECONDS\n• It shows the candidate name + symbol you voted for\n• Verify it matches your choice!\n• The slip then falls into a sealed box\n\n🔒 EVMs are NOT connected to internet — completely secure!`
    },
    {
      keywords: ['id','identification','document','carry','bring','booth','need to carry'],
      response: `🪪 Documents to Carry to the Polling Booth:\n\nPrimary ID (most important):\n✅ EPIC / Voter ID Card\n\nAlternative IDs accepted by ECI:\n• Aadhaar Card\n• Passport\n• Driving License\n• PAN Card\n• Bank / Post Office passbook with photo\n• MNREGA Job Card\n• Health Insurance Smart Card (RSBY)\n• Pension document with photo\n• Service ID with photo (Govt. employees)\n\nAny ONE of these is sufficient to vote!`
    },
    {
      keywords: ['count','counting','result','tally','declare','winner'],
      response: `📊 How Votes Are Counted:\n\n1. Counting Day is announced by the ECI (different from polling day)\n2. EVMs are brought to counting centres under tight security\n3. Counting agents from all parties are present\n4. EVMs are unsealed and results from each machine tallied\n5. Results are announced round by round\n6. Returning Officer declares the winning candidate officially\n7. Results are uploaded live on ECI website\n\n🌐 Track results live at: results.eci.gov.in`
    },
    {
      keywords: ['model code','mcc','conduct','campaign rules','election rules'],
      response: `⚖️ Model Code of Conduct (MCC):\n\nThe MCC is a set of guidelines issued by the ECI when elections are announced. It applies to ALL political parties and candidates.\n\nKey rules:\n• No use of government resources for campaigning\n• No communal or divisive speeches\n• No bribing of voters (punishable offense!)\n• Paid political ads must be certified by ECI\n• Campaign blackout: 48 hours before polling\n• No exit polls until last phase ends\n\nViolations can lead to disqualification or FIR filing!`
    },
    {
      keywords: ['polling booth','find','locate','where','booth number','which booth'],
      response: `🗺️ How to Find Your Polling Booth:\n\n3 Easy Methods:\n\n1. 📱 SMS: Send 'EPIC <your EPIC number>' to 1950\n   Example: EPIC ABC1234567\n\n2. 🌐 Online: voters.eci.gov.in → Search by EPIC or Name\n\n3. 📞 Call: ECI helpline 1950 (free, available in regional languages)\n\nYour voter ID card also has your:\n• Booth number\n• Booth address\n• Part number in the electoral roll\n\nPolling booths are always within 2km of your home! 📍`
    },
    {
      keywords: ['eligib','qualify','who can vote','requirements','age','18'],
      response: `✅ Who Can Vote in India:\n\nYou are eligible to vote if you are:\n• 18 years or older on the qualifying date (Jan 1 of the election year)\n• A citizen of India\n• Ordinarily resident in the constituency\n• Of sound mind\n• NOT disqualified under RPA 1951\n\nYou CANNOT vote if you:\n• Are not registered as a voter\n• Are serving a prison sentence for certain offences\n• Have been declared of unsound mind by a court\n\nEvery eligible citizen has an equal right to vote!`
    },
    {
      keywords: ['blackout','silence','48 hours','campaign stop','section 126'],
      response: `🔇 Campaign Blackout Period:\n\nUnder Section 126 of the Representation of the People Act, ALL election campaigning must stop 48 hours before the scheduled closing of polls.\n\nWhat's BANNED during blackout:\n• Public meetings and rallies\n• TV and radio political ads\n• Social media political posts\n• Canvassing door-to-door\n• Distribution of literature\n\nWhy? To give voters undisturbed time to make their final decision without last-minute propaganda.\n\nViolating blackout rules is a criminal offence! ⚖️`
    },
    {
      keywords: ['ink','indelible','finger','mark','purple'],
      response: `💜 The Indelible Ink Mark:\n\nAfter voting, polling officials apply ink on the nail bed of your left index finger.\n\nFacts about the ink:\n• Made from silver nitrate (AgNO3)\n• Lasts 72+ hours — cannot be washed off\n• Applied to PREVENT double voting\n• Manufactured at Mysore Paints and Varnish Ltd.\n• Has been used in Indian elections since 1962!\n\nThe ink is your proof of democratic participation. Wear it with pride! 🇮🇳`
    },
    {
      keywords: ['election commission','eci','who runs','authority','independent'],
      response: `🏛️ Election Commission of India (ECI):\n\nECI is a constitutional authority (Article 324) that:\n• Announces election schedules\n• Maintains voter rolls (Electoral Roll)\n• Enforces Model Code of Conduct\n• Deploys central forces to sensitive areas\n• Monitors media for election violations\n• Coordinates with all state machinery\n• Officially declares results\n\nKey feature: ECI is FULLY INDEPENDENT — no government or political party can interfere with its decisions.\n\nChief Election Commissioner: India's top electoral officer, appointed by the President.`
    },
    {
      keywords: ['hello','hi','hey','help','start','what','guide','welcome'],
      response: `⚡ Welcome to VoteWise AI Guide!\n\nI can help you understand:\n\n🗳️ Voter registration process\n🖥️ How to use EVMs and VVPAT\n🪪 What documents to carry\n📊 How votes are counted\n⚖️ Model Code of Conduct\n🗺️ Finding your polling booth\n📅 Election timelines\n💜 Voter ink and booth procedures\n🏛️ Role of Election Commission\n\nAsk me anything — I'm here to make you an informed voter! 😊`
    }
  ];

  function getResponse(text) {
    const lower = text.toLowerCase().trim();
    if (!lower) return null;
    for (const item of knowledge) {
      if (item.keywords.some(k => lower.includes(k))) return item.response;
    }
    return `🤔 Good question about "${text}"!\n\nFor the most current information:\n\n🇮🇳 India ECI: voters.eci.gov.in\n📞 Helpline: 1950 (free, multilingual)\n🌐 Results: results.eci.gov.in\n\nYou can also ask me about:\n• How to register to vote\n• Finding your polling booth\n• What ID to carry\n• How EVMs work\n• Vote counting process\n\nI'm here to help! 🗳️`;
  }

  function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'msg--user' : 'msg--ai'}`;
    div.setAttribute('role', 'article');
    div.setAttribute('aria-label', isUser ? 'Your message' : 'VoteWise AI response');
    div.innerHTML = `
      <span class="msg-icon" aria-hidden="true">${isUser ? '👤' : '⚡'}</span>
      <div class="msg-text">${text.replace(/\n/g, '<br/>')}</div>`;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'msg msg--ai';
    div.id = 'typingMsg';
    div.setAttribute('aria-label', 'AI is typing');
    div.innerHTML = `<span class="msg-icon" aria-hidden="true">⚡</span><div class="typing-dots"><span></span><span></span><span></span></div>`;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typingMsg');
    if (t) t.remove();
  }

  function send(text) {
    const msg = (text || input.value).trim();
    if (!msg) return;
    input.value = '';
    addMessage(msg, true);
    sendBtn.disabled = true;

    if (window.vwAnalytics) window.vwAnalytics.trackChat(msg.length);
    if (typeof gtag === 'function') gtag('event', 'chat_message_sent', { message_length: msg.length });

    showTyping();
    setTimeout(() => {
      removeTyping();
      const reply = getResponse(msg);
      addMessage(reply, false);
      sendBtn.disabled = false;
    }, 900);
  }

  function buildQuickAsks() {
    const container = document.getElementById('quickAsks');
    if (!container) return;
    quickQuestions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.textContent = q;
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `Ask: ${q}`);
      btn.addEventListener('click', () => send(q));
      container.appendChild(btn);
    });
  }

  function init() {
    buildQuickAsks();
    sendBtn.addEventListener('click', () => send());
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) send(); });
  }

  return { init };
})();

/* ============================================================
   GLOSSARY MODULE
   ============================================================ */
const GlossaryModule = (() => {
  const terms = [
    { term: "Affidavit", def: "A sworn statement submitted by candidates declaring their criminal record, assets, liabilities, and educational qualifications." },
    { term: "Ballot", def: "An official medium (paper slip or EVM) used by a voter to express their choice of candidate in an election." },
    { term: "Booth Capturing", def: "An illegal act of forcibly taking control of a polling station to cast fraudulent votes; a serious electoral offense." },
    { term: "By-election", def: "An election held between general elections to fill a vacant seat caused by death, resignation, or disqualification." },
    { term: "Candidate", def: "A person who contests an election, having filed their nomination with the Returning Officer of the constituency." },
    { term: "Constituency", def: "A defined geographical area from which one or more representatives are elected to a legislative body." },
    { term: "Democracy", def: "A system of governance where supreme power is vested in the people, exercised directly or through elected representatives." },
    { term: "EPIC", def: "Elector Photo Identity Card — the official Voter ID card issued by the Election Commission of India." },
    { term: "Electoral Roll", def: "The official list of all registered voters in a constituency, updated annually by the Electoral Registration Officer." },
    { term: "EVM", def: "Electronic Voting Machine — the electronic device used in Indian elections to record votes securely and accurately." },
    { term: "Franchise", def: "The legal right to vote in elections. Universal Adult Franchise means all citizens 18+ can vote regardless of status." },
    { term: "Incumbent", def: "The current holder of an elected office who is seeking re-election in the upcoming contest." },
    { term: "Manifesto", def: "A formal public declaration by a political party outlining its policies, promises, and agenda if voted to power." },
    { term: "Model Code", def: "Model Code of Conduct — guidelines issued by ECI that all political parties must follow during election campaigns." },
    { term: "Nomination", def: "The formal process by which a candidate files their intent to contest an election with the Returning Officer." },
    { term: "Polling Officer", def: "A government official appointed by the Election Commission to manage and conduct polling at a booth." },
    { term: "Psephology", def: "The scientific study and analysis of elections, voting patterns, and electoral trends using statistical methods." },
    { term: "Returning Officer", def: "The official responsible for overseeing the election process in a constituency and declaring the official result." },
    { term: "Suffrage", def: "The right to vote in political elections. Universal suffrage means all adult citizens have this right." },
    { term: "VVPAT", def: "Voter Verifiable Paper Audit Trail — prints a paper slip for 7 seconds so voters can verify their EVM vote." }
  ];

  function build() {
    const grid = document.getElementById('gloGrid');
    const search = document.getElementById('gloSearch');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    terms.forEach(item => {
      const card = document.createElement('article');
      card.className = 'glo-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-term', item.term.toLowerCase());
      card.setAttribute('aria-label', `Term: ${item.term}`);
      card.innerHTML = `<div class="glo-term">${item.term}</div><div class="glo-def">${item.def}</div>`;
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);

    if (search) {
      search.addEventListener('input', () => {
        const val = search.value.toLowerCase();
        grid.querySelectorAll('.glo-card').forEach(card => {
          const match = card.dataset.term.includes(val) || card.querySelector('.glo-def').textContent.toLowerCase().includes(val);
          card.classList.toggle('hidden', !match);
        });
      });
    }
  }

  function init() { build(); }
  return { init };
})();

/* ============================================================
   OBSERVER MODULE (Scroll Reveal)
   ============================================================ */
const ObserverModule = (() => {
  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
            if (window.vwAnalytics) {
              const section = entry.target.closest('section');
              if (section) window.vwAnalytics.trackSection(section.id || 'unknown');
            }
          }, i * 70);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    setTimeout(() => {
      document.querySelectorAll('.process-card, .journey-card, .glo-card').forEach(el => observer.observe(el));
    }, 200);
  }

  return { init };
})();

/* ============================================================
   ROUTER MODULE (Smooth Scroll)
   ============================================================ */
const RouterModule = (() => {
  function init() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const id = link.getAttribute('href');
        const target = document.querySelector(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
        // Close mobile menu
        const menu = document.getElementById('mobileMenu');
        if (menu) {
          menu.classList.remove('open');
          menu.setAttribute('aria-hidden', 'true');
          document.getElementById('mobileToggle')?.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  return { init };
})();

/* ============================================================
   APP INITIALIZER
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  NavModule.init();
  CounterModule.init();
  VoteCounterModule.init();
  ProcessModule.init();
  JourneyModule.init();
  QuizModule.init();
  ChatModule.init();
  GlossaryModule.init();
  ObserverModule.init();
  RouterModule.init();
});
