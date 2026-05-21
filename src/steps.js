import { US_STATES } from './stateTaxData.js';
import { calculateRisk, formatCurrency } from './calculator.js';
import { renderDiagnosisPage, renderLeadCapturePage, renderCheckoutPage, renderUpsellPage, renderDownsellPage, renderThankYouPage } from './funnel.js';

/* ───────────────────────── State ───────────────────────── */

const state = {
  currentStep: 0,
  ageRange: '',
  primaryConcern: '',
  maritalStatus: '',
  stateCode: '',
  homeValue: 0,
  liquidAssets: 0,
  hasTrust: null,
  results: null,
  lead: { firstName: '', lastName: '', email: '', phone: '' },
  orderBump: false,
  upsellAccepted: false,
  orderTotal: 67,
};

const TOTAL_STEPS = 4;

/* ───────────────────────── Helpers ──────────────────────── */

function $(sel, ctx = document) { return ctx.querySelector(sel); }

function formatPhone(val) {
  const d = val.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function parseCurrency(str) {
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

function fmtInput(e) {
  const raw = parseCurrency(e.target.value);
  if (raw === 0) { e.target.value = ''; return; }
  e.target.value = raw.toLocaleString('en-US');
}

/* ──────────────── URL ↔ Step Mapping ─────────────────────── */

const STEP_TO_PATH = {
  0: '/',
  1: '/quiz/1',
  2: '/quiz/2',
  3: '/quiz/3',
  4: '/diagnosis',
  'leadcapture': '/get-report',
  'checkout': '/checkout',
  'upsell': '/upsell',
  'downsell': '/downsell',
  'thankyou': '/thankyou',
};

const PATH_TO_STEP = {};
for (const [step, path] of Object.entries(STEP_TO_PATH)) {
  PATH_TO_STEP[path] = isNaN(step) ? step : Number(step);
}

function getStepFromURL() {
  const path = window.location.pathname;
  if (PATH_TO_STEP.hasOwnProperty(path)) return PATH_TO_STEP[path];
  return 0; // default to landing
}

/* ──────────────────── Step Navigation ───────────────────── */

function goToStep(step) {
  const el = $('#main-content');
  el.classList.add('anim-slide-out-left');
  setTimeout(() => {
    el.classList.remove('anim-slide-out-left');
    state.currentStep = step;
    // Update URL without page reload
    const path = STEP_TO_PATH[step] || '/';
    window.history.pushState({ step }, '', path);
    renderStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 300);
}

/* ──────────────────── Step Router ────────────────────────── */

function renderStep(step) {
  const el = $('#main-content');
  switch (step) {
    case 0:  renderLanding(el); break;
    case 1:  renderStep1(el);   break;
    case 2:  renderStep2(el);   break;
    case 3:  renderStep3(el);   break;
    case 4:  renderDiagnosisPage(el, state, goToStep); break;
    case 'leadcapture': renderLeadCapturePage(el, state, goToStep); break;
    case 'checkout':  renderCheckoutPage(el, state, goToStep); break;
    case 'upsell':    renderUpsellPage(el, state, goToStep);   break;
    case 'downsell':  renderDownsellPage(el, state, goToStep); break;
    case 'thankyou':  renderThankYouPage(el, state);           break;
    default: renderLanding(el); break;
  }
}

/* ════════════════════════════════════════════════════════════
   STEP 0 — Landing Page
   ════════════════════════════════════════════════════════════ */

function renderLanding(el) {
  el.innerHTML = `
    <div class="step-landing anim-fade-in-up">
      <div class="hero-content">
        <h1 class="hero-title">The Government Could Legally <span class="text-danger">Confiscate</span> Your Life's Savings If You Don't Act Now</h1>
        <p class="hero-subtitle">Nursing homes, probate courts, and state taxes can drain your estate in months. Get your free <strong class="text-accent">60-second</strong> estate risk assessment and uncover exactly how much of your hard-earned money your family might lose — and how to shield it immediately.</p>
        <button id="btn-start" class="btn btn-primary btn-large">Start My Free Estate Risk Check →</button>
        <div class="hero-trust-line">
          <span>🔒 No credit card required</span>
          <span>·</span>
          <span>Private estimate</span>
          <span>·</span>
          <span>Takes about 60 seconds</span>
        </div>
      </div>
      <div class="hero-image">
        <img src="/assets/hero-person.png" alt="Financial Expert" class="hero-person-img">
        <img src="/assets/hero-monitor.png" alt="Estate Risk Report Preview" class="hero-monitor-img">
        <img src="/assets/shield-lock.png" alt="Secure Shield" class="hero-shield-overlay-img">
      </div>
    </div>
    <div class="trust-stats-bar anim-fade-in-up anim-delay-3">
      <div class="trust-stat">
        <div class="trust-stat-icon">👥</div>
        <div class="trust-stat-number">10,000+</div>
        <div class="trust-stat-label">Assessments Completed</div>
      </div>
      <div class="trust-stat">
        <div class="trust-stat-icon">✅</div>
        <div class="trust-stat-number">100%</div>
        <div class="trust-stat-label">Private & Secure</div>
      </div>
      <div class="trust-stat">
        <div class="trust-stat-icon">⭐</div>
        <div class="trust-stat-number">4.8/5</div>
        <div class="trust-stat-label">Customer Rating</div>
      </div>
      <div class="trust-stat">
        <div class="trust-stat-icon">🇺🇸</div>
        <div class="trust-stat-number">U.S. Based</div>
        <div class="trust-stat-label">Privacy You Can Trust</div>
      </div>
    </div>
  `;
  $('#btn-start').addEventListener('click', () => goToStep(1));
}

/* ════════════════════════════════════════════════════════════
   STEP 1 — Age + Concern
   ════════════════════════════════════════════════════════════ */

function renderStep1(el) {
  el.innerHTML = `
    <div class="step-container anim-slide-in-right">
      <div class="step-header">
        <div class="step-number-badge">1</div>
        <div class="step-header-title">QUIZ STEP — AGE + PRIMARY CONCERN</div>
        <div class="step-security-badge">🔒 Your Information is Secure</div>
      </div>
      <div class="step-progress">
        <span class="step-progress-label">Step 1 of 4</span>
        <div class="step-progress-track"><div class="step-progress-fill" style="width: 25%"></div></div>
      </div>
      <div class="step-form">
        <h2 class="step-question">Let's start with a little about you.</h2>
        <p class="step-description">How old are you?</p>
        <p class="step-subdesc">We use this to provide the most accurate insights.</p>
        <div class="age-buttons" id="age-buttons">
          <button class="age-btn" data-value="Under 55">Under 55</button>
          <button class="age-btn" data-value="55-64">55–64</button>
          <button class="age-btn" data-value="65-74">65–74</button>
          <button class="age-btn" data-value="75-84">75–84</button>
          <button class="age-btn" data-value="85+">85+</button>
        </div>
        <h3 class="step-question mt-6">What is your biggest concern?</h3>
        <p class="step-subdesc">(Select one)</p>
        <div class="radio-cards concern-cards" id="concern-cards">
          <div class="radio-card" data-value="Nursing Home Costs">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01M15 11h.01"/></svg></div>
            <div class="radio-card-label">Nursing Home Costs</div>
          </div>
          <div class="radio-card" data-value="Protecting My Spouse">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
            <div class="radio-card-label">Protecting My Spouse</div>
          </div>
          <div class="radio-card" data-value="Avoiding Probate">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></div>
            <div class="radio-card-label">Avoiding Probate</div>
          </div>
          <div class="radio-card" data-value="State or Estate Taxes">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/><circle cx="12" cy="14" r="3"/></svg></div>
            <div class="radio-card-label">State or Estate Taxes</div>
          </div>
          <div class="radio-card" data-value="Leaving a Legacy">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg></div>
            <div class="radio-card-label">Leaving a Legacy for My Family</div>
          </div>
          <div class="radio-card" data-value="Not Sure">
            <div class="radio-card-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="#1B7A3D"/></svg></div>
            <div class="radio-card-label">Not Sure / Explore Options</div>
          </div>
        </div>
        <div class="step-nav">
          <button class="btn btn-back" id="btn-back">← Back</button>
          <button class="btn btn-primary" id="btn-next" disabled>Continue →</button>
        </div>
        <div class="enter-hint" id="enter-hint" style="display:none">press <kbd>Enter</kbd> ↵</div>
      </div>
    </div>
  `;

  // Pre-select if returning
  if (state.ageRange) {
    const ageBtn = $(`[data-value="${state.ageRange}"]`, $('#age-buttons'));
    if (ageBtn) ageBtn.classList.add('selected');
  }
  if (state.primaryConcern) {
    const card = $(`[data-value="${state.primaryConcern}"]`, $('#concern-cards'));
    if (card) card.classList.add('selected');
  }
  checkStep1Next();

  $('#age-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('.age-btn');
    if (!btn) return;
    $('#age-buttons').querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.ageRange = btn.dataset.value;
    checkStep1Next();
  });

  $('#concern-cards').addEventListener('click', (e) => {
    const card = e.target.closest('.radio-card');
    if (!card) return;
    $('#concern-cards').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.primaryConcern = card.dataset.value;
    checkStep1Next();
  });

  $('#btn-back').addEventListener('click', () => goToStep(0));
  $('#btn-next').addEventListener('click', () => { if (!$('#btn-next').disabled) goToStep(2); });

  // Enter key
  const step1Handler = (e) => {
    if (e.key === 'Enter' && !$('#btn-next').disabled) {
      document.removeEventListener('keydown', step1Handler);
      goToStep(2);
    }
  };
  document.addEventListener('keydown', step1Handler);
}

function checkStep1Next() {
  const btn = $('#btn-next');
  const hint = $('#enter-hint');
  const ready = !!(state.ageRange && state.primaryConcern);
  if (btn) btn.disabled = !ready;
  if (hint) hint.style.display = ready ? 'block' : 'none';
}

/* ════════════════════════════════════════════════════════════
   STEP 2 — State + Home Value + Liquid Assets
   ════════════════════════════════════════════════════════════ */

function renderStep2(el) {
  const stateOptions = US_STATES.map(s =>
    `<option value="${s.code}" ${s.code === state.stateCode ? 'selected' : ''}>${s.name}</option>`
  ).join('');

  el.innerHTML = `
    <div class="step-container anim-slide-in-right">
      <div class="step-header">
        <div class="step-number-badge">2</div>
        <div class="step-header-title">QUIZ STEP — STATE + HOME VALUE + LIQUID ASSETS</div>
        <div class="step-security-badge">🔒 Your information is 100% secure.</div>
      </div>
      <div class="step-progress">
        <span class="step-progress-label">Step 2 of 4</span>
        <div class="step-progress-track"><div class="step-progress-fill" style="width: 50%"></div></div>
      </div>
      <div class="step-form">
        <h2 class="step-question">A few details about your assets.</h2>
        <p class="step-description">All information is private and used only for your estimate.</p>

        <div class="input-group">
          <label class="input-label">What state do you live in?</label>
          <select class="select-field" id="state-select">
            <option value="">Select your state</option>
            ${stateOptions}
          </select>
        </div>

        <div class="input-group">
          <label class="input-label">What is the estimated value of your home?</label>
          <div class="currency-wrapper">
            <span class="currency-prefix">$</span>
            <input type="text" class="input-field currency-input" id="home-input" placeholder="e.g., 500,000" inputmode="numeric" value="${state.homeValue ? state.homeValue.toLocaleString('en-US') : ''}">
          </div>
          <p class="input-hint">Include primary residence only.</p>
        </div>

        <div class="input-group">
          <label class="input-label">What are your total liquid assets?</label>
          <div class="currency-wrapper">
            <span class="currency-prefix">$</span>
            <input type="text" class="input-field currency-input" id="liquid-input" placeholder="e.g., 250,000" inputmode="numeric" value="${state.liquidAssets ? state.liquidAssets.toLocaleString('en-US') : ''}">
          </div>
          <p class="input-hint">Includes savings, checking, CDs, investments, etc.</p>
        </div>

        <div class="step-nav">
          <button class="btn btn-back" id="btn-back">← Back</button>
          <button class="btn btn-primary" id="btn-next">Continue →</button>
        </div>
        <div class="enter-hint">press <kbd>Enter</kbd> ↵</div>
      </div>
    </div>
  `;

  $('#home-input').addEventListener('input', fmtInput);
  $('#liquid-input').addEventListener('input', fmtInput);
  $('#state-select').addEventListener('change', (e) => { state.stateCode = e.target.value; });

  $('#btn-back').addEventListener('click', () => goToStep(1));

  function tryStep2Next() {
    state.stateCode = $('#state-select').value;
    state.homeValue = parseCurrency($('#home-input').value);
    state.liquidAssets = parseCurrency($('#liquid-input').value);
    if (!state.stateCode) {
      $('#state-select').focus();
      $('#state-select').classList.add('input-error');
      return;
    }
    goToStep(3);
  }

  $('#btn-next').addEventListener('click', tryStep2Next);

  // Enter key — only when not focused on select (to allow dropdown navigation)
  const step2Handler = (e) => {
    if (e.key === 'Enter' && document.activeElement.tagName !== 'SELECT') {
      document.removeEventListener('keydown', step2Handler);
      tryStep2Next();
    }
  };
  document.addEventListener('keydown', step2Handler);
}

/* ════════════════════════════════════════════════════════════
   STEP 3 — Trust + Loading Animation
   ════════════════════════════════════════════════════════════ */

function renderStep3(el) {
  el.innerHTML = `
    <div class="step-container anim-slide-in-right">
      <div class="step-header">
        <div class="step-number-badge">3</div>
        <div class="step-header-title">QUIZ STEP — TRUST STATUS + ANALYSIS LOADING</div>
        <div class="step-security-badge">🔒 Secure & Confidential</div>
      </div>
      <div class="step-progress">
        <span class="step-progress-label">Step 3 of 4</span>
        <div class="step-progress-track"><div class="step-progress-fill" style="width: 75%"></div></div>
      </div>
      <div class="step-form">
        <h2 class="step-question">Do you currently have a Living Trust?</h2>
        <p class="step-description">A Living Trust helps your family avoid probate.</p>

        <div class="radio-cards trust-cards" id="trust-cards">
          <div class="radio-card trust-card-yes" data-value="true">
            <div class="radio-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></div>
            <div class="radio-card-label" style="color:#1B7A3D">Yes</div>
            <div class="radio-card-desc">I have a Living Trust</div>
          </div>
          <div class="radio-card trust-card-no" data-value="false">
            <div class="radio-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></div>
            <div class="radio-card-label" style="color:#D32F2F">No</div>
            <div class="radio-card-desc">I do not have a Living Trust</div>
          </div>
        </div>

        <div class="step-nav" style="justify-content:center">
          <button class="btn btn-primary btn-large btn-full" id="btn-analyze" disabled>Analyze My Risk →</button>
        </div>
        <div class="enter-hint" id="enter-hint-3" style="display:none">press <kbd>Enter</kbd> ↵</div>
      </div>
    </div>
  `;

  if (state.hasTrust !== null) {
    const val = String(state.hasTrust);
    const card = $(`[data-value="${val}"]`, $('#trust-cards'));
    if (card) card.classList.add('selected');
    $('#btn-analyze').disabled = false;
    const hint3 = $('#enter-hint-3');
    if (hint3) hint3.style.display = 'block';
  }

  $('#trust-cards').addEventListener('click', (e) => {
    const card = e.target.closest('.radio-card');
    if (!card) return;
    $('#trust-cards').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.hasTrust = card.dataset.value === 'true';
    $('#btn-analyze').disabled = false;
    const hint3 = $('#enter-hint-3');
    if (hint3) hint3.style.display = 'block';
  });

  function doAnalyze() {
    runCalculations();
    showLoadingAnimation(el);
  }

  $('#btn-analyze').addEventListener('click', doAnalyze);

  // Enter key — advance when card selected
  const step3Handler = (e) => {
    if (e.key === 'Enter' && state.hasTrust !== null) {
      document.removeEventListener('keydown', step3Handler);
      doAnalyze();
    }
  };
  document.addEventListener('keydown', step3Handler);
}

/* ───────────── Loading Animation ─────────────── */

function showLoadingAnimation(el) {
  const mc = $('#main-content');
  mc.innerHTML = `
    <div class="step-container">
      <div class="step-loading anim-fade-in-up">
        <div class="loading-dots">
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
        </div>
        <h2 class="loading-title">Analyzing Your Estate...</h2>
        <p class="loading-subtitle">This usually takes less than 30 seconds.</p>
        <div class="loading-steps">
          <div class="loading-step" id="ls-0">
            <div class="loading-step-icon"></div>
            <span>1. Collecting Your Information</span>
          </div>
          <div class="loading-step" id="ls-1">
            <div class="loading-step-icon"></div>
            <span>2. Evaluating Probate Exposure</span>
          </div>
          <div class="loading-step" id="ls-2">
            <div class="loading-step-icon"></div>
            <span>3. Checking Medicaid Risk</span>
          </div>
          <div class="loading-step" id="ls-3">
            <div class="loading-step-icon"></div>
            <span>4. Estimating State Tax Impact</span>
          </div>
          <div class="loading-step" id="ls-4">
            <div class="loading-step-icon"></div>
            <span>5. Generating Your Snapshot</span>
          </div>
        </div>
        <p class="loading-privacy">🛡️ Your data is private and secure.</p>
      </div>
    </div>
  `;

  const steps = mc.querySelectorAll('.loading-step');
  steps.forEach((step, i) => {
    setTimeout(() => { step.classList.add('active'); }, i * 700);
    setTimeout(() => { step.classList.remove('active'); step.classList.add('done'); }, i * 700 + 600);
  });

  setTimeout(() => { goToStep(4); }, steps.length * 700 + 800);
}

/* ───────────── Calculations ─────────────── */

function runCalculations() {
  const isMarried = state.primaryConcern === 'Protecting My Spouse';
  state.maritalStatus = isMarried ? 'Married' : 'Single';
  state.results = calculateRisk({
    stateCode: state.stateCode,
    homeValue: state.homeValue,
    liquidAssets: state.liquidAssets,
    hasTrust: state.hasTrust,
    isMarried: isMarried,
  });
}

/* ───────────── Init ─────────────── */

export function initSteps() {
  // Read URL and render the correct page
  const initialStep = getStepFromURL();
  state.currentStep = initialStep;
  renderStep(initialStep);

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    const step = e.state?.step ?? getStepFromURL();
    state.currentStep = step;
    renderStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
