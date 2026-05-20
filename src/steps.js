import { US_STATES } from './stateTaxData.js';
import { calculateRisk, formatCurrency, getRiskDisplay } from './calculator.js';
import { renderDiagnosisOffer, renderUpsell, renderThankYou } from './funnel.js';

// ─── App State ───
const state = {
  currentStep: 0,
  age: 55,
  maritalStatus: '',
  primaryConcern: '',
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

const TOTAL_STEPS = 11;

// ─── Helpers ───
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}
function parseCurrency(v) { return parseInt(v.replace(/[^0-9]/g, ''), 10) || 0; }
function fmtInput(v) {
  const n = parseCurrency(v);
  return n > 0 ? n.toLocaleString('en-US') : '';
}

// ─── Progress ───
export function updateProgress(step) {
  const container = $('#progress-container');
  const fill = $('#progress-fill');
  const label = $('#progress-label');
  if (typeof step === 'string' || step === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  const pct = Math.min((step / (TOTAL_STEPS - 1)) * 100, 100);
  fill.style.width = `${pct}%`;
  label.textContent = `Step ${Math.min(step, TOTAL_STEPS - 1)} of ${TOTAL_STEPS - 1}`;
}

// ─── Step Transition ───
export function goToStep(step) {
  const main = $('#main-content');
  main.classList.add('anim-slide-out-left');
  setTimeout(() => {
    main.classList.remove('anim-slide-out-left');
    state.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderStep(step);
    updateProgress(step);
  }, 250);
}

// ─── Named step mapping ───
const NAMED_STEPS = {
  'upsell': 'upsell',
  'thankyou': 'thankyou',
};

// ─── Render Router ───
function renderStep(step) {
  const main = $('#main-content');
  if (step === 'upsell') { renderUpsell(main, state, goToStep); return; }
  if (step === 'thankyou') { renderThankYou(main, state); return; }
  const renderers = [
    renderLanding,       // 0
    renderAge,           // 1 - agitation text
    renderConcern,       // 2 - NEW: primary concern
    renderMarital,       // 3
    renderState,         // 4
    renderHomeValue,     // 5
    renderLiquidAssets,  // 6
    renderTrust,         // 7
    renderLoading,       // 8
    renderDiagnosis,     // 9 - diagnosis + offer + bump + lead capture
  ];
  if (renderers[step]) renderers[step](main);
}

// ─── Step 0: Landing ───
function renderLanding(el) {
  el.innerHTML = `
    <div class="step-landing anim-fade-in-up">
      <div class="hero-shield">
        <svg viewBox="0 0 64 64"><defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f7df9"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32 4 L56 16 V36 C56 50 32 60 32 60 C32 60 8 50 8 36 V16 Z" fill="url(#sg)" opacity="0.9"/><path d="M32 4 L56 16 V36 C56 50 32 60 32 60 C32 60 8 50 8 36 V16 Z" fill="none" stroke="white" stroke-width="1.5" opacity="0.3"/><path d="M24 32 L30 38 L40 26" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h1 class="hero-title">Calculate Your Family's<br/><span class="text-gradient">Wealth at Risk</span></h1>
      <p class="hero-subtitle">Discover how much of your estate could be lost to Probate fees, Medicaid spend-down, and State taxes — in under 60 seconds.</p>
      <button id="btn-start" class="btn btn-primary btn-large btn-pulse">Start Free Analysis →</button>
      <div class="hero-trust-badges anim-fade-in-up anim-delay-3">
        <span class="trust-badge">🔒 256-bit Encrypted</span>
        <span class="trust-badge">⚡ Takes 60 seconds</span>
        <span class="trust-badge">✓ 100% Free</span>
      </div>
    </div>`;
  $('#btn-start').addEventListener('click', () => goToStep(1));
}

// ─── Step 1: Age (Agitation) ───
function renderAge(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">To ensure alignment with state-specific tax laws, what is your current age?</h2>
      <p class="step-description">Your age directly impacts Medicaid eligibility windows and estate tax exposure. <strong>Every year without a plan costs the average retiree $12,000+.</strong></p>
      <div class="age-input-wrapper">
        <span class="age-display" id="age-display">${state.age}</span>
        <input type="range" class="age-slider" id="age-slider" min="30" max="90" value="${state.age}">
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next">Continue →</button>
      </div>
      <p class="enter-hint">Press <kbd>Enter ↵</kbd> to continue</p>
    </div>`;
  const slider = $('#age-slider');
  const display = $('#age-display');
  slider.addEventListener('input', () => { state.age = parseInt(slider.value); display.textContent = state.age; });
  $('#btn-back').addEventListener('click', () => goToStep(0));
  $('#btn-next').addEventListener('click', () => goToStep(2));
  document.addEventListener('keydown', function handler(e) { if (e.key === 'Enter') { document.removeEventListener('keydown', handler); goToStep(2); } });
}

// ─── Step 2: Primary Concern (NEW - Agitation) ───
function renderConcern(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">What is your primary concern regarding your estate?</h2>
      <p class="step-description">Understanding your biggest worry helps us focus our analysis on the threats most likely to affect <strong>your</strong> family.</p>
      <div class="radio-cards" id="concern-cards">
        <div class="radio-card" data-value="Nursing Home Seizure">
          <div class="radio-card-icon">🏥</div>
          <div class="radio-card-label">Nursing Home Seizure</div>
          <div class="radio-card-desc">Medicaid taking my savings</div>
        </div>
        <div class="radio-card" data-value="IRS Inheritance Taxes">
          <div class="radio-card-icon">💰</div>
          <div class="radio-card-label">IRS Inheritance Taxes</div>
          <div class="radio-card-desc">Government taking a cut</div>
        </div>
        <div class="radio-card" data-value="Probate Court Delays">
          <div class="radio-card-icon">⚖️</div>
          <div class="radio-card-label">Probate Court Delays</div>
          <div class="radio-card-desc">Years of legal battles</div>
        </div>
        <div class="radio-card" data-value="Leaving Nothing to Children">
          <div class="radio-card-icon">👨‍👩‍👧‍👦</div>
          <div class="radio-card-label">Leaving Nothing to Children</div>
          <div class="radio-card-desc">Wealth not reaching heirs</div>
        </div>
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" disabled>Continue →</button>
      </div>
    </div>`;
  const cards = el.querySelectorAll('.radio-card');
  cards.forEach(card => {
    if (card.dataset.value === state.primaryConcern) card.classList.add('selected');
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.primaryConcern = card.dataset.value;
      $('#btn-next').disabled = false;
    });
  });
  $('#btn-back').addEventListener('click', () => goToStep(1));
  $('#btn-next').addEventListener('click', () => { if (state.primaryConcern) goToStep(3); });
}

// ─── Step 3: Marital Status ───
function renderMarital(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">What is your marital status?</h2>
      <p class="step-description">This affects Medicaid spousal protection rules and estate exemptions. <strong>Married couples face different — and often higher — risks.</strong></p>
      <div class="radio-cards" id="marital-cards">
        <div class="radio-card" data-value="Married"><div class="radio-card-icon">💑</div><div class="radio-card-label">Married</div></div>
        <div class="radio-card" data-value="Single"><div class="radio-card-icon">👤</div><div class="radio-card-label">Single</div></div>
        <div class="radio-card" data-value="Widowed"><div class="radio-card-icon">🕊️</div><div class="radio-card-label">Widowed</div></div>
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" disabled>Continue →</button>
      </div>
    </div>`;
  const cards = el.querySelectorAll('.radio-card');
  cards.forEach(card => {
    if (card.dataset.value === state.maritalStatus) card.classList.add('selected');
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.maritalStatus = card.dataset.value;
      $('#btn-next').disabled = false;
    });
  });
  $('#btn-back').addEventListener('click', () => goToStep(2));
  $('#btn-next').addEventListener('click', () => { if (state.maritalStatus) goToStep(4); });
}

// ─── Step 4: State ───
function renderState(el) {
  const opts = US_STATES.map(s => `<option value="${s.code}" ${s.code === state.stateCode ? 'selected' : ''}>${s.name}</option>`).join('');
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">What state do you live in?</h2>
      <p class="step-description">Estate tax laws vary dramatically by state. Some states impose an <strong>additional 10-16% estate tax</strong> that most families don't know about.</p>
      <div class="input-group">
        <label class="input-label">State of Residence</label>
        <select class="select-field" id="state-select"><option value="">Select your state...</option>${opts}</select>
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" ${state.stateCode ? '' : 'disabled'}>Continue →</button>
      </div>
    </div>`;
  const sel = $('#state-select');
  sel.addEventListener('change', () => { state.stateCode = sel.value; $('#btn-next').disabled = !sel.value; });
  $('#btn-back').addEventListener('click', () => goToStep(3));
  $('#btn-next').addEventListener('click', () => { if (state.stateCode) goToStep(5); });
}

// ─── Step 5: Home Value ───
function renderHomeValue(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">What is your primary home's value?</h2>
      <p class="step-description">Your home is often your largest asset — and the <strong>#1 target for probate courts</strong> if left unprotected.</p>
      <div class="input-group currency-wrapper">
        <label class="input-label">Estimated Home Value</label>
        <span class="currency-prefix">$</span>
        <input type="text" class="input-field currency-input" id="home-input" placeholder="500,000" inputmode="numeric" value="${state.homeValue ? state.homeValue.toLocaleString('en-US') : ''}">
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next">Continue →</button>
      </div>
      <p class="enter-hint">Press <kbd>Enter ↵</kbd> to continue</p>
    </div>`;
  const inp = $('#home-input');
  inp.focus();
  inp.addEventListener('input', () => { const v = fmtInput(inp.value); inp.value = v; state.homeValue = parseCurrency(v); });
  const next = () => { state.homeValue = parseCurrency(inp.value); goToStep(6); };
  $('#btn-back').addEventListener('click', () => goToStep(4));
  $('#btn-next').addEventListener('click', next);
  document.addEventListener('keydown', function handler(e) { if (e.key === 'Enter') { document.removeEventListener('keydown', handler); next(); } });
}

// ─── Step 6: Liquid Assets ───
function renderLiquidAssets(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">What are your total liquid assets?</h2>
      <p class="step-description">Include IRAs, 401(k)s, stocks, bonds, savings, and cash. <strong>Medicaid can seize nearly all of this.</strong></p>
      <div class="input-group currency-wrapper">
        <label class="input-label">Total Liquid Assets</label>
        <span class="currency-prefix">$</span>
        <input type="text" class="input-field currency-input" id="liquid-input" placeholder="250,000" inputmode="numeric" value="${state.liquidAssets ? state.liquidAssets.toLocaleString('en-US') : ''}">
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next">Continue →</button>
      </div>
      <p class="enter-hint">Press <kbd>Enter ↵</kbd> to continue</p>
    </div>`;
  const inp = $('#liquid-input');
  inp.focus();
  inp.addEventListener('input', () => { const v = fmtInput(inp.value); inp.value = v; state.liquidAssets = parseCurrency(v); });
  const next = () => { state.liquidAssets = parseCurrency(inp.value); goToStep(7); };
  $('#btn-back').addEventListener('click', () => goToStep(5));
  $('#btn-next').addEventListener('click', next);
  document.addEventListener('keydown', function handler(e) { if (e.key === 'Enter') { document.removeEventListener('keydown', handler); next(); } });
}

// ─── Step 7: Trust ───
function renderTrust(el) {
  el.innerHTML = `
    <div class="step-form anim-slide-in-right">
      <h2 class="step-question">Do you have a Living Trust?</h2>
      <p class="step-description">Without a Living Trust, your estate <strong>will</strong> go through probate — costing your family 3-7% of your total assets in legal fees.</p>
      <div class="radio-cards" id="trust-cards">
        <div class="radio-card" data-value="true"><div class="radio-card-icon">✅</div><div class="radio-card-label">Yes, I do</div><div class="radio-card-desc">Assets are protected</div></div>
        <div class="radio-card" data-value="false"><div class="radio-card-icon">❌</div><div class="radio-card-label">No, I don't</div><div class="radio-card-desc">Assets may go through probate</div></div>
      </div>
      <div class="step-nav">
        <button class="btn btn-back" id="btn-back">← Back</button>
        <button class="btn btn-primary btn-next" id="btn-next" disabled>Analyze My Risk →</button>
      </div>
    </div>`;
  const cards = el.querySelectorAll('.radio-card');
  cards.forEach(card => {
    if (state.hasTrust !== null && String(state.hasTrust) === card.dataset.value) card.classList.add('selected');
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.hasTrust = card.dataset.value === 'true';
      $('#btn-next').disabled = false;
    });
  });
  $('#btn-back').addEventListener('click', () => goToStep(6));
  $('#btn-next').addEventListener('click', () => { if (state.hasTrust !== null) { runCalculations(); goToStep(8); } });
}

// ─── Run Calculations ───
function runCalculations() {
  state.results = calculateRisk({
    homeValue: state.homeValue,
    liquidAssets: state.liquidAssets,
    state: state.stateCode,
    hasTrust: state.hasTrust,
    isMarried: state.maritalStatus === 'Married',
  });
  console.log('[Calculator] Results:', state.results);
}

// ─── Step 8: Loading ───
function renderLoading(el) {
  const steps = [
    { icon: '🔍', text: 'Analyzing State Laws...' },
    { icon: '📋', text: 'Calculating Probate Fees...' },
    { icon: '🏥', text: 'Evaluating Medicaid Exposure...' },
    { icon: '⚖️', text: 'Cross-referencing Federal Estate Tax Rules...' },
    { icon: '📊', text: 'Generating Risk Report...' },
  ];
  el.innerHTML = `
    <div class="step-loading anim-fade-in-up">
      <h2 class="loading-title">Analyzing Your Estate...</h2>
      <div class="loading-steps">${steps.map((s, i) => `
        <div class="loading-step" id="ls-${i}">
          <div class="loading-step-icon">${s.icon}</div>
          <div class="loading-step-text">${s.text}</div>
        </div>`).join('')}
      </div>
      <div class="loading-progress-bar"><div class="shimmer-bar"></div></div>
    </div>`;

  const delays = [0, 1200, 2400, 3600, 4800];
  steps.forEach((_, i) => {
    setTimeout(() => {
      const step = $(`#ls-${i}`);
      if (step) { step.classList.add('active'); step.classList.remove('done'); }
      if (i > 0) { const prev = $(`#ls-${i-1}`); if (prev) { prev.classList.remove('active'); prev.classList.add('done'); } }
    }, delays[i]);
  });
  setTimeout(() => goToStep(9), 5800);
}

// ─── Step 9: Diagnosis + Offer (delegates to funnel.js) ───
function renderDiagnosis(el) {
  renderDiagnosisOffer(el, state, goToStep);
}

// ─── Init ───
export function initSteps() {
  renderStep(0);
  updateProgress(0);
}
