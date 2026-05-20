import { formatCurrency } from './calculator.js';
import { renderDonutChart } from './components/donutChart.js';
import { submitLead } from './webhook.js';

/* ───────────────────────── Helper ───────────────────────── */

function $(sel, ctx) {
  return (ctx || document).querySelector(sel);
}

/* ════════════════════════════════════════════════════════════
   DIAGNOSIS PAGE (Step 4)
   ════════════════════════════════════════════════════════════ */

export function renderDiagnosisPage(el, appState, goToStep) {
  const r = appState.results;
  const total = r.totalAtRisk || 1;
  const probatePct = Math.round((r.probateCost / total) * 100);
  const medicaidPct = Math.round((r.medicaidRisk / total) * 100);
  const taxPct = Math.max(0, 100 - probatePct - medicaidPct);

  el.innerHTML = `
    <div class="step-diagnosis anim-fade-in-up">
      <div class="diagnosis-header">
        <h2>Your Estate Risk Snapshot</h2>
        <p>Here's what could be at risk without proper planning.</p>
      </div>

      <div class="diagnosis-main">
        <div class="diagnosis-chart-section">
          <div class="diagnosis-chart-wrap" id="diag-chart">
            <div class="diagnosis-chart-label">
              <div class="chart-amount">${formatCurrency(r.totalAtRisk)}</div>
              <div class="chart-sublabel">At Risk</div>
            </div>
          </div>
        </div>

        <div class="diagnosis-amount-section">
          <div class="diagnosis-amount-label">Estimated Wealth at Risk</div>
          <div class="diagnosis-amount-big">${formatCurrency(r.totalAtRisk)}</div>
          <div class="diagnosis-amount-desc">Due to probate costs, Medicaid spend-down, and potential state taxes.</div>
        </div>

        <div class="diagnosis-legend">
          <div class="diagnosis-legend-item">
            <span class="diagnosis-legend-dot" style="background:#D32F2F"></span>
            <span class="diagnosis-legend-label">Probate Costs</span>
            <span class="diagnosis-legend-value">${formatCurrency(r.probateCost)}</span>
            <span class="diagnosis-legend-pct">(${probatePct}%)</span>
          </div>
          <div class="diagnosis-legend-item">
            <span class="diagnosis-legend-dot" style="background:#E67E22"></span>
            <span class="diagnosis-legend-label">Medicaid Exposure</span>
            <span class="diagnosis-legend-value">${formatCurrency(r.medicaidRisk)}</span>
            <span class="diagnosis-legend-pct">(${medicaidPct}%)</span>
          </div>
          <div class="diagnosis-legend-item">
            <span class="diagnosis-legend-dot" style="background:#B8860B"></span>
            <span class="diagnosis-legend-label">State Taxes</span>
            <span class="diagnosis-legend-value">${formatCurrency(r.stateTax)}</span>
            <span class="diagnosis-legend-pct">(${taxPct}%)</span>
          </div>
        </div>
      </div>

      <div class="risk-breakdown-cards">
        <div class="risk-card">
          <div class="risk-card-icon-wrap">⚖️</div>
          <div class="risk-card-info">
            <div class="risk-card-label">Probate Costs</div>
            <div class="risk-card-value">${formatCurrency(r.probateCost)}</div>
            <div class="risk-card-pct">${probatePct}% of total risk</div>
          </div>
          <div class="risk-card-trend">📈</div>
        </div>
        <div class="risk-card">
          <div class="risk-card-icon-wrap">🛡️</div>
          <div class="risk-card-info">
            <div class="risk-card-label">Medicaid Exposure</div>
            <div class="risk-card-value">${formatCurrency(r.medicaidRisk)}</div>
            <div class="risk-card-pct">${medicaidPct}% of total risk</div>
          </div>
          <div class="risk-card-trend">📈</div>
        </div>
        <div class="risk-card">
          <div class="risk-card-icon-wrap">🏛️</div>
          <div class="risk-card-info">
            <div class="risk-card-label">State Taxes</div>
            <div class="risk-card-value">${formatCurrency(r.stateTax)}</div>
            <div class="risk-card-pct">${taxPct}% of total risk</div>
          </div>
          <div class="risk-card-trend">📈</div>
        </div>
      </div>

      <div class="diagnosis-disclaimer">
        <div class="disclaimer-icon">⚠️</div>
        <div class="disclaimer-content">
          <div class="disclaimer-title">This is an estimate, not a guarantee.</div>
          <div class="disclaimer-text">Actual costs vary based on individual circumstances and state laws. Taking action now can help protect more of your assets and your family's future.</div>
        </div>
      </div>

      <div class="diagnosis-trust-bar">
        <div class="diagnosis-trust-item"><span class="trust-icon">✅</span> Trusted by thousands of families nationwide</div>
        <div class="diagnosis-trust-item"><span class="trust-icon">🔒</span> Your information is secure and confidential</div>
        <div class="diagnosis-trust-item"><span class="trust-icon">👥</span> 10,000+ families protected</div>
        <div class="diagnosis-trust-item"><span class="trust-icon">⭐</span> 4.8/5 average customer rating</div>
      </div>

      <div class="diagnosis-cta">
        <button id="btn-protect" class="btn btn-primary btn-large">See How to Protect Your Assets →</button>
      </div>
    </div>
  `;

  // Render donut chart
  const chartEl = $('#diag-chart', el);
  if (chartEl) {
    renderDonutChart(chartEl, [
      { label: 'Probate',  value: r.probateCost,  color: '#D32F2F' },
      { label: 'Medicaid', value: r.medicaidRisk, color: '#E67E22' },
      { label: 'Taxes',    value: r.stateTax,     color: '#B8860B' },
    ]);
  }

  $('#btn-protect', el).addEventListener('click', () => goToStep('checkout'));
}

/* ════════════════════════════════════════════════════════════
   CHECKOUT PAGE
   ════════════════════════════════════════════════════════════ */

export function renderCheckoutPage(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-checkout anim-fade-in-up">
      <div class="checkout-product">
        <div class="checkout-product-badge">🔥 2026 UPDATED EDITION</div>
        <h2 class="checkout-product-title">2026 Retiree Asset Protection Blueprint</h2>
        <p class="checkout-product-tagline">Your step-by-step guide to protect more of your assets and your family.</p>
        <div class="checkout-product-image">
          <div class="checkout-book-mockup">2026<br/>RETIREE ASSET<br/>PROTECTION<br/>BLUEPRINT</div>
        </div>

        <h3>What's Included:</h3>
        <ul class="checkout-features">
          <li>✅ Personalized Estate Risk Report</li>
          <li>✅ Asset Protection Strategies</li>
          <li>✅ Medicaid &amp; Long-Term Care Planning</li>
          <li>✅ Avoid Probate &amp; Save Taxes</li>
          <li>✅ Action Plan for You and Your Family</li>
          <li>✅ Lifetime Updates &amp; Free Access</li>
        </ul>

        <!-- ORDER BUMP -->
        <div class="checkout-bump" id="order-bump">
          <label class="bump-checkbox-wrap">
            <input type="checkbox" id="bump-check" class="bump-checkbox">
            <div class="bump-content">
              <div class="bump-title">Yes! Add the Retirement Account Protection Checklist</div>
              <div class="bump-price">+$27</div>
              <div class="bump-desc">Protect IRAs, 401(k)s, and other accounts from common estate planning mistakes.</div>
            </div>
          </label>
        </div>
      </div>

      <div class="checkout-form-section">
        <div class="checkout-form-header">
          <h3>🔒 Secure Access</h3>
          <p>Your information is 100% secure.</p>
        </div>
        <form class="checkout-form" id="checkout-form">
          <div class="input-group">
            <label class="input-label">First Name</label>
            <input type="text" class="input-field" id="off-fname" placeholder="e.g. John" required>
          </div>
          <div class="input-group">
            <label class="input-label">Email Address</label>
            <input type="email" class="input-field" id="off-email" placeholder="e.g. john@email.com" required>
          </div>
          <div class="input-group">
            <label class="input-label">Phone (Optional)</label>
            <input type="tel" class="input-field" id="off-phone" placeholder="e.g. (555) 123-4567">
          </div>

          <div class="checkout-total-section">
            <div class="checkout-total-label">Total Due Today</div>
            <div class="checkout-total" id="checkout-total">$67</div>
          </div>

          <button type="submit" class="btn btn-primary btn-large btn-full">Continue to Secure Checkout — <span id="checkout-total-btn">$67</span></button>
        </form>

        <div class="checkout-guarantees">
          <span>💰 30-Day Money-Back Guarantee</span>
          <span>🔒 Secure 256-bit SSL Encryption</span>
          <span>🇺🇸 U.S. Based Customer Support</span>
        </div>
      </div>
    </div>
  `;

  // ─── Order bump toggle ───
  const bumpCheck = $('#bump-check', el);
  const totalEl = $('#checkout-total', el);
  const totalBtnEl = $('#checkout-total-btn', el);

  function updateTotal() {
    const base = 67;
    const bump = bumpCheck.checked ? 27 : 0;
    const amount = base + bump;
    appState.orderBump = bumpCheck.checked;
    appState.orderTotal = amount;
    totalEl.textContent = `$${amount}`;
    totalBtnEl.textContent = `$${amount}`;
  }

  bumpCheck.addEventListener('change', updateTotal);

  // ─── Phone mask ───
  const phoneInput = $('#off-phone', el);
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
  });

  // ─── Form submit ───
  $('#checkout-form', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    appState.lead.firstName = $('#off-fname', el).value.trim();
    appState.lead.email = $('#off-email', el).value.trim();
    appState.lead.phone = phoneInput.value.trim();

    try {
      await submitLead({
        firstName: appState.lead.firstName,
        email: appState.lead.email,
        phone: appState.lead.phone,
        ageRange: appState.ageRange,
        primaryConcern: appState.primaryConcern,
        stateCode: appState.stateCode,
        homeValue: appState.homeValue,
        liquidAssets: appState.liquidAssets,
        hasTrust: appState.hasTrust,
        orderBump: appState.orderBump,
        orderTotal: appState.orderTotal,
      });
    } catch (err) {
      console.warn('Lead submit failed:', err);
    }

    goToStep('upsell');
  });

  // ─── Exit-intent downsell ───
  let exitShown = false;
  document.addEventListener('mouseleave', function handleExit(e) {
    if (e.clientY > 10 || exitShown) return;
    if (appState.currentStep !== 'checkout') {
      document.removeEventListener('mouseleave', handleExit);
      return;
    }
    exitShown = true;
    showDownsellModal(appState, goToStep);
  });
}

/* ─── Phone formatting helper ─── */

function formatPhone(val) {
  const d = val.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/* ════════════════════════════════════════════════════════════
   UPSELL PAGE
   ════════════════════════════════════════════════════════════ */

export function renderUpsellPage(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-upsell anim-fade-in-up">
      <div class="upsell-badge">Recommended Add-On</div>
      <h1 class="upsell-headline">Estate Planning Document Prep Kit</h1>
      <p class="upsell-subtitle">Have attorney-ready documents — without the high cost.</p>

      <div class="upsell-main">
        <div class="upsell-product-image">
          <div class="upsell-product-placeholder">DOCUMENT<br/>PREP KIT<br/>📄</div>
        </div>
        <div>
          <ul class="upsell-features-list">
            <li>✅ Power of Attorney (Financial)</li>
            <li>✅ Health Care Directive</li>
            <li>✅ HIPAA Authorization</li>
            <li>✅ Beneficiary Review Guide</li>
            <li>✅ Step-by-Step Instructions</li>
            <li>✅ Attorney Review Checklist</li>
          </ul>
          <div class="upsell-why">
            <h3>Why add this now?</h3>
            <p>Save time, reduce legal fees, and ensure your plan is complete. Special pricing today for seniors.</p>
          </div>
        </div>
      </div>

      <div class="upsell-price-section">
        <div class="upsell-price-label">Special Add-On Price</div>
        <div class="upsell-price-big">$197</div>
        <div class="upsell-price-note">One-Time Payment · No Recurring Fees</div>
      </div>

      <button id="btn-upsell-yes" class="btn btn-primary btn-large btn-full">Yes, Add to My Order — $197</button>
      <a id="btn-upsell-no" class="decline-link">No thanks, continue to my order</a>

      <div class="upsell-trust-row">
        <span>🔒 Secure & Confidential</span>
        <span>✅ Satisfaction Guaranteed</span>
        <span>🛡️ 100% Private</span>
      </div>
    </div>
  `;

  $('#btn-upsell-yes', el).addEventListener('click', () => {
    appState.upsellAccepted = true;
    appState.orderTotal += 197;
    goToStep('thankyou');
  });

  $('#btn-upsell-no', el).addEventListener('click', (e) => {
    e.preventDefault();
    goToStep('thankyou');
  });
}

/* ════════════════════════════════════════════════════════════
   THANK YOU PAGE
   ════════════════════════════════════════════════════════════ */

export function renderThankYouPage(el, appState) {
  const bump = appState.orderBump;
  const upsell = appState.upsellAccepted;
  const total = 67 + (bump ? 27 : 0) + (upsell ? 197 : 0);

  el.innerHTML = `
    <div class="step-thankyou anim-fade-in-up">
      <div class="ty-checkmark">✓</div>
      <h1 class="ty-title">Thank You</h1>
      <p class="ty-subtitle">Your order has been received!</p>

      <div class="ty-order-summary">
        <h3 class="ty-summary-title">Order Summary</h3>
        <div class="ty-item"><span>2026 Retiree Asset Protection Blueprint</span><span>$67.00</span></div>
        ${bump ? '<div class="ty-item"><span>Retirement Account Protection Checklist (Order Bump)</span><span>$27.00</span></div>' : ''}
        ${upsell ? '<div class="ty-item"><span>Estate Planning Document Prep Kit</span><span>$197.00</span></div>' : ''}
        <div class="ty-total"><span>Total Paid</span><span>$${total}.00</span></div>
      </div>

      <div class="ty-next-steps">
        <h3>What's Next?</h3>
        <div class="ty-step">
          <div class="ty-step-number">1</div>
          <div class="ty-step-content"><h4>Check Your Email</h4><p>We've sent your receipt and access details.</p></div>
        </div>
        <div class="ty-step">
          <div class="ty-step-number">2</div>
          <div class="ty-step-content"><h4>Access Your Guide</h4><p>Log in or use the link in your email to access your resources.</p></div>
        </div>
        <div class="ty-step">
          <div class="ty-step-number">3</div>
          <div class="ty-step-content"><h4>Download & Take Action</h4><p>Review your report and start protecting your family's future today.</p></div>
        </div>
      </div>

      <div class="ty-help">
        <h4>Need Help? We're here for you.</h4>
        <p>Email: support@retireeshieldreport.com &nbsp;|&nbsp; Phone: (877) 555-0123</p>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   DOWNSELL MODAL (Exit-Intent)
   ════════════════════════════════════════════════════════════ */

function showDownsellModal(appState, goToStep) {
  const existing = document.querySelector('.downsell-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'downsell-overlay';
  overlay.innerHTML = `
    <div class="downsell-modal anim-fade-in-up">
      <button class="downsell-close" id="ds-close">&times;</button>
      <h2 class="downsell-title">Wait — Don't Leave Empty-Handed</h2>
      <p class="downsell-text">Your estate risk snapshot showed <strong>${formatCurrency(appState.results?.totalAtRisk || 0)}</strong> could be at risk. Take the first step to protect your family.</p>
      <p class="downsell-offer">Get the <strong>2026 Retiree Asset Protection Blueprint</strong> for just <strong>$67</strong> — a fraction of what probate or legal fees can cost.</p>
      <button class="btn btn-primary btn-large btn-full" id="ds-stay" style="margin-top:20px">Yes, I Want to Protect My Family</button>
      <a class="decline-link" id="ds-leave">No thanks, I'll risk it</a>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('ds-close').addEventListener('click', close);
  document.getElementById('ds-leave').addEventListener('click', (e) => { e.preventDefault(); close(); });
  document.getElementById('ds-stay').addEventListener('click', () => {
    close();
    const form = document.getElementById('checkout-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
