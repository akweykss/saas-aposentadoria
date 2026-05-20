/**
 * Sales Funnel Components
 * Main Offer + Order Bump, Upsell (OTO), Downsell Modal, Thank You
 */
import { formatCurrency } from './calculator.js';
import { renderDonutChart } from './components/donutChart.js';
import { submitLead } from './webhook.js';

function $(sel, ctx = document) { return ctx.querySelector(sel); }

// ─── Downsell Modal ───
let downsellShown = false;
let exitIntentBound = false;

function showDownsellModal() {
  if (downsellShown || document.getElementById('downsell-modal')) return;
  downsellShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'downsell-modal';
  overlay.className = 'modal-overlay anim-fade-in-up';
  overlay.innerHTML = `
    <div class="modal-card downsell-card anim-fade-in-scale">
      <div class="modal-close" id="modal-close-ds">✕</div>
      <div class="downsell-icon">🚨</div>
      <h2 class="downsell-title">Wait! Don't Leave Your Family Exposed.</h2>
      <p class="downsell-subtitle">We understand the full Blueprint may not be for everyone right now. But you can't afford to leave <em>without any protection plan at all.</em></p>
      <div class="downsell-offer-box">
        <div class="downsell-offer-label">EMERGENCY OFFER</div>
        <h3 class="downsell-product">The Emergency Medicaid<br/>Asset Protection Guide</h3>
        <p class="downsell-desc">Learn the critical 5-Year Medicaid Look-Back Rule, how nursing homes legally seize assets, and the 3 emergency steps you can take <strong>this week</strong> to protect your savings.</p>
        <div class="downsell-price">
          <span class="price-was">$67</span>
          <span class="price-now">$37</span>
          <span class="price-badge">Save 45%</span>
        </div>
      </div>
      <button id="btn-ds-accept" class="btn btn-danger btn-large btn-full btn-pulse">Claim My Emergency Medicaid Guide for $37</button>
      <a id="btn-ds-decline" class="decline-link">No thanks, I'll risk leaving my family unprotected.</a>
    </div>`;

  document.body.appendChild(overlay);

  $('#modal-close-ds').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('#btn-ds-accept').addEventListener('click', () => {
    console.log('[Funnel] Downsell accepted: $37');
    overlay.remove();
    // In production: trigger Stripe payment for $37
    // For now, go to thank you
    if (window.__funnelGoToStep) window.__funnelGoToStep('thankyou');
  });
  $('#btn-ds-decline').addEventListener('click', (e) => {
    e.preventDefault();
    overlay.remove();
  });
}

function bindExitIntent() {
  if (exitIntentBound) return;
  exitIntentBound = true;
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 0) showDownsellModal();
  });
}

function unbindExitIntent() {
  exitIntentBound = false;
  downsellShown = false;
}

// ─── Diagnosis + Main Offer + Order Bump (Step 9) ───
export function renderDiagnosisOffer(el, appState, goToStep) {
  window.__funnelGoToStep = goToStep;
  const r = appState.results;
  const concern = appState.primaryConcern || 'Losing assets';

  el.innerHTML = `
    <div class="step-diagnosis anim-fade-in-scale">
      <!-- CRITICAL WARNING -->
      <div class="diagnosis-warning anim-fade-in-up">
        <div class="warning-bar">
          <span class="warning-pulse"></span>
          <span>⚠️ CRITICAL SYSTEM WARNING</span>
        </div>
        <p class="warning-text">Based on ${appState.stateCode} state regulations, your estate is <strong>highly exposed</strong> to government liquidation. Immediate action is recommended.</p>
      </div>

      <!-- RISK CHART -->
      <div class="diagnosis-risk-card anim-fade-in-up anim-delay-2">
        <div class="risk-label-top">TOTAL WEALTH AT RISK</div>
        <div class="risk-amount-big">${formatCurrency(r.totalAtRisk)}</div>
        <div class="risk-pct">${r.riskPercentage}% of your ${formatCurrency(r.totalNetWorth)} net worth</div>
        <div class="diagnosis-chart" id="diag-chart"></div>
        <div class="risk-mini-grid">
          <div class="risk-mini"><span class="risk-mini-val" style="color:#ff4757">${formatCurrency(r.probateCost)}</span><span class="risk-mini-lbl">Probate</span></div>
          <div class="risk-mini"><span class="risk-mini-val" style="color:#ff9f43">${formatCurrency(r.medicaidRisk)}</span><span class="risk-mini-lbl">Medicaid</span></div>
          <div class="risk-mini"><span class="risk-mini-val" style="color:#fbbf24">${formatCurrency(r.stateTax)}</span><span class="risk-mini-lbl">Estate Tax</span></div>
        </div>
      </div>

      <!-- SOLUTION INTRO -->
      <div class="offer-transition anim-fade-in-up anim-delay-4">
        <p class="offer-intro-text">The good news? <strong>97% of these losses are legally preventable</strong> with the right strategy. We've compiled everything into one actionable guide:</p>
      </div>

      <!-- MAIN OFFER -->
      <div class="offer-card anim-fade-in-up anim-delay-5">
        <div class="offer-badge-top">🔥 2026 UPDATED EDITION</div>
        <h2 class="offer-title">The 2026 Retiree Asset<br/>Protection Blueprint</h2>
        <p class="offer-tagline">The step-by-step guide trusted by 12,000+ American retirees to legally shield their wealth from Probate, Medicaid seizures, and IRS estate taxes.</p>

        <ul class="offer-features">
          <li>✅ State-specific Probate avoidance strategies for ${appState.stateCode}</li>
          <li>✅ The Medicaid 5-Year Look-Back Rule loophole (Chapter 4)</li>
          <li>✅ IRS Estate Tax exemption maximization playbook</li>
          <li>✅ Living Trust vs. Will: The $50,000 decision matrix</li>
          <li>✅ Emergency asset re-titling checklist</li>
          <li>✅ Bonus: "The 7 Questions to Ask Any Estate Attorney"</li>
        </ul>

        <div class="offer-price-anchor">
          <div class="price-compare">
            <div class="price-line"><span class="price-item">Standard Legal Consultation</span><span class="price-val line-through">$1,500</span></div>
            <div class="price-line"><span class="price-item">Estate Planning Attorney (avg.)</span><span class="price-val line-through">$3,000</span></div>
            <div class="price-line"><span class="price-item">Financial Advisor Session</span><span class="price-val line-through">$500</span></div>
          </div>
          <div class="price-total-line">
            <span>Total Value</span>
            <span class="line-through">$5,000</span>
          </div>
          <div class="price-today">
            <span>Your Access Today</span>
            <span class="price-today-val">$67</span>
          </div>
        </div>

        <!-- ORDER BUMP -->
        <div class="order-bump" id="order-bump">
          <label class="bump-checkbox-wrap">
            <input type="checkbox" id="bump-check" class="bump-checkbox">
            <div class="bump-content">
              <div class="bump-header">
                <span class="bump-tag">⚡ ONE-TIME ADD-ON</span>
                <span class="bump-price">+$27</span>
              </div>
              <div class="bump-title">Yes! Add the 24-Hour Roth IRA Restructuring Checklist</div>
              <div class="bump-desc">Learn how to legally reposition your IRA/401(k) to minimize taxes and protect retirement funds from Medicaid spend-down — actionable in 24 hours.</div>
            </div>
          </label>
        </div>

        <!-- LEAD CAPTURE + CTA -->
        <form class="offer-form" id="offer-form">
          <div class="offer-form-row">
            <div class="input-group"><label class="input-label">First Name</label><input type="text" class="input-field" id="off-fname" placeholder="John" required></div>
            <div class="input-group"><label class="input-label">Last Name</label><input type="text" class="input-field" id="off-lname" placeholder="Smith" required></div>
          </div>
          <div class="input-group"><label class="input-label">Email Address</label><input type="email" class="input-field" id="off-email" placeholder="john@example.com" required></div>
          <div class="input-group"><label class="input-label">Phone Number</label><input type="tel" class="input-field" id="off-phone" placeholder="(555) 123-4567" required></div>
          <button type="submit" class="btn btn-danger btn-large btn-full btn-pulse" id="btn-secure">🔒 Secure My Assets & Continue — <span id="offer-total-display">$67</span></button>
        </form>

        <div class="offer-guarantees">
          <span>🔒 256-bit SSL</span>
          <span>💰 60-Day Money-Back Guarantee</span>
          <span>📧 Instant Digital Delivery</span>
        </div>
      </div>
    </div>`;

  // Render chart
  renderDonutChart($('#diag-chart'), [
    { label: 'Probate', value: r.probateCost, color: '#ff4757' },
    { label: 'Medicaid', value: r.medicaidRisk, color: '#ff9f43' },
    { label: 'Estate Tax', value: r.stateTax, color: '#fbbf24' },
  ], { size: 200, centerText: formatCurrency(r.totalAtRisk), centerSubtext: 'Exposed' });

  // Bump toggle
  const bumpCheck = $('#bump-check');
  const totalDisplay = $('#offer-total-display');
  bumpCheck.addEventListener('change', () => {
    totalDisplay.textContent = bumpCheck.checked ? '$94' : '$67';
  });

  // Phone mask
  const phoneInp = $('#off-phone');
  phoneInp.addEventListener('input', () => {
    const d = phoneInp.value.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) { phoneInp.value = d; return; }
    if (d.length <= 6) { phoneInp.value = `(${d.slice(0,3)}) ${d.slice(3)}`; return; }
    phoneInp.value = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  });

  // Form submit
  $('#offer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    unbindExitIntent();
    appState.lead = {
      firstName: $('#off-fname').value.trim(),
      lastName: $('#off-lname').value.trim(),
      email: $('#off-email').value.trim(),
      phone: '+1' + $('#off-phone').value.replace(/\D/g, ''),
    };
    appState.orderBump = bumpCheck.checked;
    appState.orderTotal = bumpCheck.checked ? 94 : 67;

    await submitLead({
      leadInfo: appState.lead,
      financialProfile: { age: appState.age, maritalStatus: appState.maritalStatus, state: appState.stateCode, netWorth: r.totalNetWorth, hasTrust: appState.hasTrust },
      calculatedRisk: r,
    });

    console.log('[Funnel] Main offer accepted:', appState.orderTotal);
    // In production: process Stripe payment here, then redirect
    goToStep('upsell');
  });

  // Bind exit intent for downsell
  bindExitIntent();
}

// ─── Upsell Page (OTO) ───
export function renderUpsell(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-upsell anim-fade-in-up">
      <div class="upsell-stop-badge">🛑 WAIT — ONE-TIME OFFER</div>
      <h1 class="upsell-headline">STOP! Don't Form Your Plan<br/>with Blank Pages.</h1>
      <h2 class="upsell-subheadline">Upgrade to the <span class="text-gradient">Complete Legal Forms Vault</span></h2>

      <p class="upsell-body">Get access to our AI-generated, attorney-reviewed <strong>Living Trust & Last Will</strong> customizable templates to execute your plan legally from home — without spending $3,000+ on lawyers.</p>

      <div class="upsell-includes">
        <h3>What's Inside the Vault:</h3>
        <ul>
          <li>📄 Customizable Revocable Living Trust Template</li>
          <li>📄 Last Will & Testament Template</li>
          <li>📄 Healthcare Power of Attorney</li>
          <li>📄 Financial Power of Attorney</li>
          <li>📄 HIPAA Authorization Form</li>
          <li>📄 Beneficiary Designation Worksheet</li>
          <li>🎥 Step-by-step video walkthrough for each document</li>
          <li>✅ Attorney-reviewed for all 50 states</li>
        </ul>
      </div>

      <div class="upsell-price-section">
        <div class="upsell-price-was">Standard Legal Package Value: <span class="line-through">$3,000</span></div>
        <div class="upsell-price-offer">Our Price: <span class="line-through">$497</span></div>
        <div class="upsell-price-today">Today Only: <span class="upsell-price-big">$197</span></div>
        <div class="upsell-price-note">One-time payment. No subscriptions. Instant access.</div>
      </div>

      <button id="btn-upsell-yes" class="btn btn-danger btn-large btn-full btn-pulse">Yes, Add the Legal Forms Vault to My Order ($197)</button>

      <div class="upsell-secure-badges">
        <span>🔒 Secure 1-Click Upgrade</span>
        <span>💰 60-Day Guarantee</span>
      </div>

      <a id="btn-upsell-no" class="decline-link">No thanks, I prefer to write my legal documents from scratch and risk court errors.</a>
    </div>`;

  $('#btn-upsell-yes').addEventListener('click', () => {
    appState.upsellAccepted = true;
    appState.orderTotal += 197;
    console.log('[Funnel] Upsell accepted. New total:', appState.orderTotal);
    // In production: trigger Stripe 1-click charge for $197
    goToStep('thankyou');
  });

  $('#btn-upsell-no').addEventListener('click', (e) => {
    e.preventDefault();
    appState.upsellAccepted = false;
    console.log('[Funnel] Upsell declined.');
    goToStep('thankyou');
  });
}

// ─── Thank You Page ───
export function renderThankYou(el, appState) {
  const name = appState.lead?.firstName || 'there';
  el.innerHTML = `
    <div class="step-thankyou anim-fade-in-up">
      <div class="ty-icon">🎉</div>
      <h1 class="ty-title">Thank You, ${name}!</h1>
      <p class="ty-subtitle">Your order has been confirmed. Check your email for instant access to your materials.</p>

      <div class="ty-order-summary card-glass-static">
        <h3 class="ty-summary-title">Order Summary</h3>
        <div class="ty-item"><span>The 2026 Retiree Asset Protection Blueprint</span><span>$67</span></div>
        ${appState.orderBump ? '<div class="ty-item"><span>24-Hour Roth IRA Restructuring Checklist</span><span>$27</span></div>' : ''}
        ${appState.upsellAccepted ? '<div class="ty-item"><span>Complete Legal Forms Vault</span><span>$197</span></div>' : ''}
        <div class="ty-total"><span>Total Charged</span><span>$${appState.orderTotal || 67}</span></div>
      </div>
    </div>`;
}
