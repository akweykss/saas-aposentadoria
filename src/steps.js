import { US_STATES } from './stateTaxData.js';
import { calculateRisk, formatCurrency, getRiskDisplay } from './calculator.js';
import { renderDiagnosisPage, renderCheckoutPage, renderUpsellPage, renderThankYouPage } from './funnel.js';

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

function $(sel, ctx = document) {
  return ctx.querySelector(sel);
}

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

/* ───────────────────── Progress Bar ─────────────────────── */

function updateProgress(step) {
  const container = $('#progress-container');
  const fill = $('#progress-fill');
  const label = $('#progress-label');

  // Hide on landing (step 0) and named steps (strings like 'checkout')
  if (step === 0 || typeof step === 'string') {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  const pct = (step / TOTAL_STEPS) * 100;
  fill.style.width = pct + '%';
  label.textContent = `Step ${step} of ${TOTAL_STEPS}`;
}

/* ──────────────────── Step Navigation ───────────────────── */

function goToStep(step) {
  const el = $('#main-content');
  el.classList.add('anim-slide-out-left');

  setTimeout(() => {
    el.classList.remove('anim-slide-out-left');
    state.currentStep = step;
    renderStep(step);
    updateProgress(step);
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
    case 'checkout':  renderCheckoutPage(el, state, goToStep); break;
    case 'upsell':    renderUpsellPage(el, state, goToStep);   break;
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
        <h1 class="hero-title">See What Probate, Medicaid, or State Taxes Could <span class="text-accent">Cost Your Family</span></h1>
        <p class="hero-subtitle">Get your free 60-second estate risk assessment and see what your loved ones could be left with — or lose — based on your unique situation.</p>
        <button id="btn-start" class="btn btn-primary btn-large">Start My Free Estate Risk Check</button>
        <div class="hero-trust-badges">
          <span>No credit card required</span>
          <span>·</span>
          <span>Private estimate</span>
          <span>·</span>
          <span>Takes about 60 seconds</span>
        </div>
      </div>
      <div class="hero-image">
        <div class="hero-image-placeholder">ESTATE RISK REPORT</div>
      </div>
    </div>
    <div class="trust-stats-bar anim-fade-in-up anim-delay-3">
      <div class="trust-stat"><div class="trust-stat-number">10,000+</div><div class="trust-stat-label">Assessments Completed</div></div>
      <div class="trust-stat"><div class="trust-stat-number">100%</div><div class="trust-stat-label">Private &amp; Confidential</div></div>
      <div class="trust-stat"><div class="trust-stat-number">4.8/5</div><div class="trust-stat-label">Customer Rating</div></div>
      <div class="trust-stat"><div class="trust-stat-number">U.S. Based</div><div class="trust-stat-label">Privacy You Can Trust</div></div>
    </div>
  `;

  $('#btn-start').addEventListener('click', () => goToStep(1));
}

/* ════════════════════════════════════════════════════════════
   STEP 1 — Age + Concern
   ════════════════════════════════════════════════════════════ */

function renderStep1(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">Let's start with a little about you.</h2>
      <p class="step-description">How old are you?</p>
      <p class="step-subdesc">We use this to provide the most accurate insights.</p>
      <div class="age-buttons" id="age-buttons">
        <button class="age-btn" data-value="Under 55">Under 55</button>
        <button class="age-btn" data-value="55-64">55-64</button>
        <button class="age-btn" data-value="65-74">65-74</button>
        <button class="age-btn" data-value="75-84">75-84</button>
        <button class="age-btn" data-value="85+">85+</button>
      </div>

      <h3 class="step-question mt-8">What is your biggest concern?</h3>
      <p class="step-subdesc">(Select one)</p>
      <div class="radio-cards concern-cards" id="concern-cards">
        <div class="radio-card" data-value="Nursing Home Costs"><div class="radio-card-icon">🏥</div><div class="radio-card-label">Nursing Home Costs</div></div>
        <div class="radio-card" data-value="Protecting My Spouse"><div class="radio-card-icon">💑</div><div class="radio-card-label">Protecting My Spouse</div></div>
        <div class="radio-card" data-value="Avoiding Probate"><div class="radio-card-icon">⚖️</div><div class="radio-card-label">Avoiding Probate</div></div>
        <div class="radio-card" data-value="State or Estate Taxes"><div class="radio-card-icon">💰</div><div class="radio-card-label">State or Estate Taxes</div></div>
        <div class="radio-card" data-value="Leaving a Legacy"><div class="radio-card-icon">👨‍👩‍👧‍👦</div><div class="radio-card-label">Leaving a Legacy for My Family</div></div>
        <div class="radio-card" data-value="Not Sure"><div class="radio-card-icon">🔍</div><div class="radio-card-label">Not Sure / Explore Options</div></div>
      </div>

      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" disabled>Continue →</button>
      </div>
    </div>
  `;

  // Pre-select if returning to this step
  if (state.ageRange) {
    const ageBtn = $(`[data-value="${state.ageRange}"]`, $('#age-buttons'));
    if (ageBtn) ageBtn.classList.add('selected');
  }
  if (state.primaryConcern) {
    const concernCard = $(`[data-value="${state.primaryConcern}"]`, $('#concern-cards'));
    if (concernCard) concernCard.classList.add('selected');
  }
  checkStep1Next();

  // Age buttons
  $('#age-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('.age-btn');
    if (!btn) return;
    $('#age-buttons').querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.ageRange = btn.dataset.value;
    checkStep1Next();
  });

  // Concern cards
  $('#concern-cards').addEventListener('click', (e) => {
    const card = e.target.closest('.radio-card');
    if (!card) return;
    $('#concern-cards').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.primaryConcern = card.dataset.value;
    checkStep1Next();
  });

  $('#btn-back').addEventListener('click', () => goToStep(0));
  $('#btn-next').addEventListener('click', () => goToStep(2));
}

function checkStep1Next() {
  const btn = $('#btn-next');
  if (btn) btn.disabled = !(state.ageRange && state.primaryConcern);
}

/* ════════════════════════════════════════════════════════════
   STEP 2 — State + Home Value + Liquid Assets
   ════════════════════════════════════════════════════════════ */

function renderStep2(el) {
  const stateOptions = US_STATES.map(s =>
    `<option value="${s.code}" ${s.code === state.stateCode ? 'selected' : ''}>${s.name}</option>`
  ).join('');

  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">A few details about your assets.</h2>
      <p class="step-description">All information is private and used only for your estimate.</p>

      <div class="input-group">
        <label class="input-label">What state do you live in?</label>
        <select class="select-field" id="state-select">
          <option value="">Select your state</option>
          ${stateOptions}
        </select>
      </div>

      <div class="input-group currency-wrapper">
        <label class="input-label">What is the estimated value of your home?</label>
        <span class="currency-prefix">$</span>
        <input type="text" class="input-field currency-input" id="home-input" placeholder="e.g. 500,000" inputmode="numeric" value="${state.homeValue ? state.homeValue.toLocaleString('en-US') : ''}">
        <p class="input-hint">Include primary residence only.</p>
      </div>

      <div class="input-group currency-wrapper">
        <label class="input-label">What are your total liquid assets?</label>
        <span class="currency-prefix">$</span>
        <input type="text" class="input-field currency-input" id="liquid-input" placeholder="e.g. 250,000" inputmode="numeric" value="${state.liquidAssets ? state.liquidAssets.toLocaleString('en-US') : ''}">
        <p class="input-hint">Includes savings, checking, CDs, investments, etc.</p>
      </div>

      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next">Continue →</button>
      </div>
    </div>
  `;

  // Currency formatting
  $('#home-input').addEventListener('input', fmtInput);
  $('#liquid-input').addEventListener('input', fmtInput);

  // State dropdown
  $('#state-select').addEventListener('change', (e) => {
    state.stateCode = e.target.value;
  });

  // Navigation
  $('#btn-back').addEventListener('click', () => goToStep(1));
  $('#btn-next').addEventListener('click', () => {
    state.stateCode = $('#state-select').value;
    state.homeValue = parseCurrency($('#home-input').value);
    state.liquidAssets = parseCurrency($('#liquid-input').value);

    if (!state.stateCode) {
      $('#state-select').focus();
      $('#state-select').classList.add('input-error');
      return;
    }
    goToStep(3);
  });
}

/* ════════════════════════════════════════════════════════════
   STEP 3 — Trust + Loading Animation
   ════════════════════════════════════════════════════════════ */

function renderStep3(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">Do you currently have a Living Trust?</h2>
      <p class="step-description">A Living Trust helps your family avoid probate.</p>

      <div class="radio-cards" id="trust-cards">
        <div class="radio-card" data-value="true">
          <div class="radio-card-icon">✅</div>
          <div class="radio-card-label">Yes</div>
          <div class="radio-card-desc">I have a Living Trust</div>
        </div>
        <div class="radio-card" data-value="false">
          <div class="radio-card-icon">❌</div>
          <div class="radio-card-label">No</div>
          <div class="radio-card-desc">I do not have a Living Trust</div>
        </div>
      </div>

      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" disabled>Analyze My Risk →</button>
      </div>
    </div>
  `;

  // Pre-select if returning
  if (state.hasTrust !== null) {
    const val = String(state.hasTrust);
    const card = $(`[data-value="${val}"]`, $('#trust-cards'));
    if (card) card.classList.add('selected');
    $('#btn-next').disabled = false;
  }

  // Trust cards
  $('#trust-cards').addEventListener('click', (e) => {
    const card = e.target.closest('.radio-card');
    if (!card) return;
    $('#trust-cards').querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.hasTrust = card.dataset.value === 'true';
    $('#btn-next').disabled = false;
  });

  $('#btn-back').addEventListener('click', () => goToStep(2));
  $('#btn-next').addEventListener('click', () => {
    runCalculations();
    showLoadingAnimation(el);
  });
}

/* ───────────── Loading Animation ─────────────── */

function showLoadingAnimation(el) {
  el.innerHTML = `
    <div class="step-loading anim-fade-in-up">
      <h2 class="loading-title">Analyzing Your Estate...</h2>
      <p class="loading-subtitle">This usually takes less than 30 seconds.</p>
      <div class="loading-steps">
        <div class="loading-step" id="ls-0">Collecting Your Information</div>
        <div class="loading-step" id="ls-1">Evaluating Probate Exposure</div>
        <div class="loading-step" id="ls-2">Checking Medicaid Risk</div>
        <div class="loading-step" id="ls-3">Estimating State Tax Impact</div>
        <div class="loading-step" id="ls-4">Generating Your Snapshot</div>
      </div>
      <div class="loading-progress-bar"><div class="shimmer-bar"></div></div>
    </div>
  `;

  const steps = el.querySelectorAll('.loading-step');
  steps.forEach((step, i) => {
    setTimeout(() => {
      step.classList.add('active');
    }, i * 800);
  });

  // After all steps animate, advance to diagnosis
  setTimeout(() => {
    goToStep(4);
  }, steps.length * 800 + 500);
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
  renderStep(0);
  updateProgress(0);
}
