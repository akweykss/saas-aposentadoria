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
  
  const stateLabel = r.stateName ? r.stateName : "your state";

  el.innerHTML = `
    <div class="step-diagnosis anim-fade-in-up">
      <div class="diagnosis-header">
        <h2>WARNING: Your Estate is Vulnerable to Confiscation</h2>
        <p>Based on your inputs and current ${stateLabel} laws, here is the brutal reality of what probate courts, nursing homes, and taxes could strip away from your family if you don't act.</p>
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

      <!-- CTA button between diagnosis and cards -->
      <div style="text-align: center; margin: 28px 0;">
        <button class="btn btn-primary btn-large" id="btn-protect-top">Discover How to Shield Your Wealth →</button>
      </div>

      <div class="risk-breakdown-cards">
        <div class="risk-card">
          <div class="risk-card-icon-wrap">⚖️</div>
          <div class="risk-card-info">
            <div class="risk-card-label">Probate Court Fees</div>
            <div class="risk-card-value">${formatCurrency(r.probateCost)}</div>
            <div class="risk-card-pct">${probatePct}% of total risk</div>
          </div>
          <div class="risk-card-trend">📈</div>
        </div>
        <div class="risk-card">
          <div class="risk-card-icon-wrap">🛡️</div>
          <div class="risk-card-info">
            <div class="risk-card-label">Medicaid Spend-Down</div>
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
          <div class="disclaimer-title">Crucial Time Warning: The 5-Year Lookback Period</div>
          <div class="disclaimer-text">If you transfer assets right before needing a nursing home, the government will still count them due to the 5-Year Medicaid Lookback rule. You must put protective documents in place NOW.</div>
        </div>
      </div>

      <div class="diagnosis-trust-bar">
        <div class="diagnosis-trust-item"><span class="trust-icon">✅</span> Trusted by thousands of families nationwide</div>
        <div class="diagnosis-trust-item"><span class="trust-icon">🔒</span> Your information is secure and confidential</div>
        <div class="diagnosis-trust-item"><span class="trust-icon">👥</span> 10,000+ families protected</div>
      </div>
      
      <div class="step-diagnosis-action">
        <h3>Stop the IRS, Probate, and Nursing Homes From Taking What You Built</h3>
        <p>The average family without a trust loses $340,000 to these three "wealth thieves." The good news? You can legally shield 100% of your assets if you use the right legal loopholes.</p>
        <button class="btn btn-primary btn-large" id="btn-protect">Discover How to Shield Your Wealth →</button>
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

  $('#btn-protect', el).addEventListener('click', () => goToStep('leadcapture'));
  const topBtn = $('#btn-protect-top', el);
  if (topBtn) topBtn.addEventListener('click', () => goToStep('leadcapture'));
}

/* ════════════════════════════════════════════════════════════
   LEAD CAPTURE PAGE (between Diagnosis and Checkout)
   ════════════════════════════════════════════════════════════ */

export function renderLeadCapturePage(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-container anim-fade-in-up" style="max-width:520px; margin:0 auto;">
      <div class="lead-capture-wrap">
        <div class="lead-capture-badge">🔒 Your Free Report Is Ready</div>
        <h2 class="lead-capture-title">Where Should We Send<br>Your <span style="color:var(--color-primary)">Free Risk Report</span>?</h2>
        <p class="lead-capture-sub">Enter your details below and we'll send your personalized Estate Risk Report — plus instant access to the Blueprint.</p>

        <div class="lead-capture-form">
          <div class="input-group">
            <label class="input-label">First Name</label>
            <input type="text" id="lc-name" class="input-field" placeholder="e.g., John" autocomplete="given-name" value="${appState.lead?.firstName || ''}">
          </div>
          <div class="input-group">
            <label class="input-label">Email Address</label>
            <input type="email" id="lc-email" class="input-field" placeholder="e.g., john@email.com" autocomplete="email" value="${appState.lead?.email || ''}">
          </div>
          <div id="lc-error" style="color:var(--color-danger);font-size:13px;margin-top:-8px;display:none;">Please fill in your name and a valid email.</div>
          <button class="btn btn-primary btn-large btn-full" id="lc-submit" style="margin-top:8px;">Send My Report &amp; Get Instant Access →</button>
          <p style="font-size:12px;color:var(--color-text-muted);text-align:center;margin-top:12px;">🔒 100% Private. No spam. Unsubscribe anytime.</p>
        </div>

        <div class="lead-capture-trust">
          <div>✅ Trusted by 10,000+ families</div>
          <div>🛡️ 256-bit SSL encrypted</div>
          <div>🇺🇸 U.S.-based support</div>
        </div>
      </div>
    </div>
  `;

  const nameEl  = document.getElementById('lc-name');
  const emailEl = document.getElementById('lc-email');
  const errEl   = document.getElementById('lc-error');
  const btn     = document.getElementById('lc-submit');

  nameEl.focus();

  async function submit() {
    const name  = nameEl.value.trim();
    const email = emailEl.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !emailOk) {
      errEl.style.display = 'block';
      if (!name) nameEl.focus();
      else emailEl.focus();
      return;
    }
    errEl.style.display = 'none';

    // Save to state
    appState.lead = { firstName: name, email };

    // Send to Google Sheets (fire and forget)
    submitLead({
      firstName:      name,
      email:          email,
      ageRange:       appState.ageRange,
      primaryConcern: appState.primaryConcern,
      stateCode:      appState.stateCode,
      homeValue:      appState.homeValue,
      liquidAssets:   appState.liquidAssets,
      hasTrust:       appState.hasTrust,
      riskLevel:      appState.results?.riskLevel || '',
      atRisk:         appState.results?.totalAtRisk || 0,
    }).catch(console.warn);

    btn.textContent = 'Loading...';
    btn.disabled = true;
    goToStep('checkout');
  }

  btn.addEventListener('click', submit);

  // Enter key support
  [nameEl, emailEl].forEach(inp => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  });
}

/* ════════════════════════════════════════════════════════════
   CHECKOUT PAGE
   ════════════════════════════════════════════════════════════ */

export function renderCheckoutPage(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-checkout anim-fade-in-up">
      <!-- LEFT COLUMN: Product info + book image -->
      <div class="checkout-product">
        <div class="checkout-product-badge">🔥 2026 UPDATED EDITION</div>
        <h2 class="checkout-product-title">The 2026 Retiree Asset Protection Blueprint</h2>
        <p class="checkout-product-tagline">Stop the IRS, Probate Courts, and Nursing Homes from taking $340,000 of what you built. The 50-page legal playbook to protect your family's future.</p>
        <div class="checkout-product-image">
          <img src="/assets/book-blueprint.png" alt="2026 Retiree Asset Protection Blueprint" class="checkout-book-img">
        </div>
      </div>

      <!-- RIGHT COLUMN: Features + Secure Checkout -->
      <div class="checkout-right-col">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--color-text-primary);">Inside Your Blueprint You'll Discover:</h3>
        <ul class="checkout-features">
          <li>✅ <strong>The Henderson Family Catastrophe:</strong> How one family lost $340,000 to probate fees because they believed a simple will was enough.</li>
          <li>✅ <strong>The 5-Year Medicaid Lookback Defense:</strong> Why waiting to transfer your home could cost you everything, and the exact trust structure to use today.</li>
          <li>✅ <strong>The "Step-Up in Basis" Loophole:</strong> How to pass your $600K home to your kids without them paying a dime in capital gains tax.</li>
          <li>✅ <strong>Defeating the Widow Tax:</strong> Why your spouse could pay up to 60% MORE in taxes the year after you pass—and how to stop it.</li>
          <li>✅ <strong>The OBBBA 2026 Secret:</strong> The new $15M exemption rules and the $6,000 Senior Bonus Deduction.</li>
        </ul>

        <div class="checkout-form-section">
          
          <!-- ORDER BUMP -->
          <div class="order-bump-box" style="border: 2px dashed #E67E22; background: #fffaf0; border-radius: 8px; padding: 16px; margin-bottom: 24px; position: relative;">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <input type="checkbox" id="order-bump-checkbox" style="width: 20px; height: 20px; margin-top: 4px; accent-color: #E67E22;">
              <div>
                <label for="order-bump-checkbox" style="font-weight: 700; font-size: 15px; color: #333; cursor: pointer; display: block; margin-bottom: 4px;">
                  Yes! Add The 24-Hour Roth IRA Restructuring Checklist (+$27)
                </label>
                <p style="font-size: 13px; color: #555; line-height: 1.4; margin: 0;">
                  <strong>Highly Recommended:</strong> Discover the 4 hidden "detonators" inside your IRA, how to avoid the $218,000 IRMAA cliff, and the 6-year bracket-filling strategy.
                </p>
              </div>
            </div>
          </div>

          <div class="checkout-form-header">
            <h3 style="font-size: 20px; color: var(--color-primary);">🔒 Secure Checkout</h3>
            <p style="font-size: 14px; color: var(--color-text-light); margin-top: 4px;">Click below to complete your order securely via Hotmart.</p>
          </div>

          <div style="text-align: center; margin: 16px 0;">
            <span style="font-size: 14px; color: var(--color-text-light); text-decoration: line-through;">$197</span>
            <span id="checkout-total-price" style="font-size: 36px; font-weight: 800; color: var(--color-primary); margin-left: 8px;">$67</span>
            <span style="font-size: 13px; color: var(--color-text-light); display: block; margin-top: 2px;">One-time payment · Instant digital access</span>
          </div>

          <a href="https://pay.hotmart.com/N105921395O?checkoutMode=2" id="hotmart-link" class="btn btn-primary btn-large btn-full hotmart-fb hotmart__button-checkout" style="font-size: 18px; padding: 16px; display: block; text-align: center;">Continue to Secure Checkout →</a>

          <div class="checkout-guarantees" style="margin-top: 16px;">
            <span>💰 30-Day Money-Back Guarantee</span>
            <span>🔒 Secure 256-bit SSL Encryption</span>
            <span>🇺🇸 U.S. Based Customer Support</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Dynamic Order Bump logic
  const bumpCheckbox = el.querySelector('#order-bump-checkbox');
  const priceDisplay = el.querySelector('#checkout-total-price');

  if (bumpCheckbox) {
    bumpCheckbox.addEventListener('change', (e) => {
      appState.orderBump = e.target.checked;
      if (e.target.checked) {
        priceDisplay.textContent = "$94"; // 67 + 27
      } else {
        priceDisplay.textContent = "$67";
      }
    });
  }

  // Quando o botão for clicado, dispara o webhook com dados do quiz
  const hotmartBtn = el.querySelector('.hotmart__button-checkout');
  if (hotmartBtn) {
    hotmartBtn.addEventListener('click', () => {
      submitLead({
        firstName: 'Hotmart',
        email: 'Checkout',
        ageRange: appState.ageRange,
        primaryConcern: appState.primaryConcern,
        stateCode: appState.stateCode,
        homeValue: appState.homeValue,
        liquidAssets: appState.liquidAssets,
        hasTrust: appState.hasTrust
      }).catch(console.warn);
    });
  }
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
    <div class="step-upsell anim-fade-in-up" style="max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="background: #ef4444; color: white; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; animation: pulse 2s infinite;">Wait! Your Order Is Not Complete</div>
        <h1 style="font-size: 2.4rem; color: #0f172a; line-height: 1.2; margin-bottom: 16px;">The 132-Page Reference That Cuts Your Estate Planning Attorney Fees by 50-70%</h1>
        <p style="font-size: 1.2rem; color: #475569; max-width: 600px; margin: 0 auto;">Please read this page carefully. This one-time offer will not be available again once you leave.</p>
      </div>

      <div style="width: 100%; height: 4px; background: #e2e8f0; margin: 32px 0;"></div>

      <div class="upsell-vsl-content" style="font-size: 1.1rem; line-height: 1.7; color: #334155;">
        <p>Listen.</p>
        <p>The Blueprint you just ordered shows you exactly <em>what</em> to do. The Roth Checklist shows you exactly <em>how</em> to convert your IRA. But there is a missing piece to this puzzle.</p>
        <p>To make this legally binding, <strong>you need documents</strong>.</p>
        
        <h3 style="font-size: 1.5rem; color: #0f172a; margin: 32px 0 16px; border-left: 4px solid #ef4444; padding-left: 16px;">The Riley Family Catastrophe</h3>
        <p>Patrick Riley (71) from Bucks County, PA went into a coma. His family assumed they could handle his affairs because they were next of kin.</p>
        <p><strong>They were wrong.</strong></p>
        <p>Because they lacked a HIPAA Authorization, his wife sat in the waiting room for 11 hours without knowing if he survived. Because they lacked a Healthcare POA, the family fought in the hallways over his treatment. Because they lacked a Financial POA, they had to pay $4,500 for an Emergency Guardianship just to access his bank account to pay the mortgage.</p>
        <p>When Patrick passed away 4 months later, the nightmare got worse. He had a simple will—which means his estate went through probate. It cost the family <strong>$14,200</strong> in court fees and froze the assets for 11 months.</p>
        <p>Total cost of not having the right documents? <strong style="color: #ef4444;">$186,900.</strong></p>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; margin: 32px 0;">
          <h3 style="font-size: 1.4rem; color: #0f172a; margin-top: 0; text-align: center;">The 12 Documents The 3% Actually Have</h3>
          <p style="text-align: center; margin-bottom: 24px;">67% of Americans 55+ have nothing. 21% have only a simple will. But the wealthiest 3% have a complete "vault" of 12 specific documents. And it typically costs <strong>$3,500 to $4,500</strong> to have an attorney draft them.</p>
          
          <div style="text-align: center;">
            <img src="/assets/document-prep-kit.png" alt="The Complete Legal Forms Vault" style="width: 100%; max-width: 350px; height: auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); margin-bottom: 24px; display: inline-block;">
          </div>
        </div>

        <h3 style="font-size: 1.5rem; color: #0f172a; margin: 32px 0 16px;">Introducing: The Complete Legal Forms Vault</h3>
        <p>Stop paying your attorney to educate you. We have compiled all 12 essential documents—from the Revocable Living Trust to the Advance Healthcare Directive—into a single, 132-page premium reference manual.</p>
        <p>This includes <strong>Educational Samples</strong> with exact legal language (like the <em>Spendthrift clause</em> or the <em>Self-proving affidavit</em>) and a State-Specific Quick Reference covering 27 states.</p>
        <p>When you walk into your attorney's office with this Vault, you won't be starting from scratch. You will know exactly what you need, what to ask, and what it should look like. Our clients routinely cut their attorney fees by <strong>50% to 70%</strong> because they arrive prepared.</p>

        <div style="background: #fffbea; border: 2px dashed #fbbf24; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
          <h3 style="color: #b45309; margin-top: 0; font-size: 1.4rem;">One-Time Offer: Just $197</h3>
          <p style="color: #78350f; font-size: 1.1rem; margin-bottom: 0;">You could pay an attorney $3,500... or you can add The Complete Legal Forms Vault to your order today for just $197. This offer is not available at any other time or place.</p>
        </div>
      </div>

      <!-- Botões de ação (fallback local / aparência em produção) -->
      <div id="upsell-action-area" style="margin-top: 40px; text-align: center;">
        <button class="btn btn-primary btn-large btn-full" id="btn-upsell-yes" style="font-size: 1.2rem; padding: 20px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(27,122,61,0.3); font-weight: 800;">
          Yes! Add The Legal Forms Vault to My Order — Just $197
        </button>
        <button id="btn-upsell-no" style="background: none; border: none; color: #94a3b8; font-size: 15px; cursor: pointer; text-decoration: underline; margin-top: 12px; transition: color 0.2s;">
          No thanks. I understand I'm passing up the chance to save thousands on attorney fees, and I prefer to pay full price later.
        </button>
      </div>

      <div class="upsell-trust-row" style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 32px; display: flex; justify-content: center; gap: 40px;">
        <div class="upsell-trust-item" style="text-align: center;">
          <div class="upsell-trust-icon" style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
          <div class="upsell-trust-label" style="font-weight: 700; font-size: 14px;">60-Day Guarantee</div>
        </div>
        <div class="upsell-trust-item" style="text-align: center;">
          <div class="upsell-trust-icon" style="font-size: 32px; margin-bottom: 8px;">🔒</div>
          <div class="upsell-trust-label" style="font-weight: 700; font-size: 14px;">256-Bit Secure</div>
        </div>
        <div class="upsell-trust-item" style="text-align: center;">
          <div class="upsell-trust-icon" style="font-size: 32px; margin-bottom: 8px;">🇺🇸</div>
          <div class="upsell-trust-label" style="font-weight: 700; font-size: 14px;">U.S. Based Support</div>
        </div>
      </div>
    </div>
  `;

  // Em produção: tenta montar o widget Hotmart (substitui os botões acima)
  setTimeout(() => {
    if (window.checkoutElements) {
      try {
        const area = document.getElementById('upsell-action-area');
        if (area) {
          const hotmartDiv = document.createElement('div');
          hotmartDiv.id = 'hotmart-sales-funnel';
          area.replaceWith(hotmartDiv);
          window.checkoutElements.init('salesFunnel').mount('#hotmart-sales-funnel');
          return;
        }
      } catch (e) {
        console.warn('Hotmart Sales Funnel: sem sessão ativa, usando botões locais.');
      }
    }
    // Fallback local: botões normais
    const yesBtn = document.getElementById('btn-upsell-yes');
    const noBtn = document.getElementById('btn-upsell-no');
    if (yesBtn) yesBtn.addEventListener('click', () => { appState.upsellAccepted = true; appState.orderTotal += 197; goToStep('thankyou'); });
    if (noBtn) noBtn.addEventListener('click', () => goToStep('downsell'));
  }, 200);
}

/* ════════════════════════════════════════════════════════════
   DOWNSELL PAGE
   ════════════════════════════════════════════════════════════ */

export function renderDownsellPage(el, appState, goToStep) {
  el.innerHTML = `
    <div class="step-upsell anim-fade-in-up" style="max-width: 600px; margin: 40px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border-top: 6px solid #E67E22;">
      
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.8rem; color: #b45309; line-height: 1.3; margin-bottom: 16px;">I Understand The Complete Vault Might Be Too Much Right Now...</h2>
        <p style="font-size: 1.1rem; color: #475569;">But please don't leave your family completely exposed to the most aggressive wealth thief of all: <strong>The Nursing Home System.</strong></p>
      </div>

      <div style="background: #fff8f1; padding: 24px; border-radius: 8px; border: 1px solid #fed7aa; margin-bottom: 24px;">
        <h3 style="font-size: 1.3rem; color: #9a3412; margin-top: 0; margin-bottom: 12px; text-align: center;">The Emergency Medicaid Survival Guide</h3>
        <p style="font-size: 1rem; color: #78350f; line-height: 1.6; margin-bottom: 16px;">
          If you skip everything else, at least take the exact legal loopholes to protect your home and savings if you suddenly need long-term care—before the government forces a "Medicaid Spend-Down."
        </p>
        
        <ul style="list-style: none; padding: 0; margin: 0; color: #78350f;">
          <li style="margin-bottom: 12px; display: flex; gap: 8px;">
            <span>🛡️</span> 
            <span><strong>The Primary Home Loophole:</strong> How to legally transfer assets safely without triggering the 5-Year Lookback penalty.</span>
          </li>
          <li style="margin-bottom: 12px; display: flex; gap: 8px;">
            <span>🛡️</span> 
            <span><strong>Spousal Protection:</strong> The exact strategy to keep your healthy spouse from going broke while paying for the other's care.</span>
          </li>
          <li style="display: flex; gap: 8px;">
            <span>🛡️</span> 
            <span><strong>The Fast-Action Plan:</strong> Exactly what your kids need to do if a medical crisis hits <em>today</em>.</span>
          </li>
        </ul>

        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px dashed #fdba74;">
          <div style="font-size: 14px; color: #9a3412; text-decoration: line-through;">Usually $97</div>
          <div style="font-weight: 800; font-size: 2rem; color: #ea580c; margin-top: 4px;">Just $37 Today</div>
        </div>
      </div>

      <!-- Botões de ação (fallback local / aparência em produção) -->
      <div id="downsell-action-area" style="text-align: center;">
        <button class="btn btn-primary btn-large btn-full" id="btn-ds-yes" style="font-size: 1.1rem; padding: 18px; margin-bottom: 16px; background: #ea580c; border: none; box-shadow: 0 8px 20px rgba(234,88,12,0.3);">
          ✅ Yes, Add the Emergency Medicaid Guide for $37
        </button>
        <button id="btn-ds-no" style="background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; text-decoration: underline;">
          No thanks. I'll figure out nursing home costs on my own.
        </button>
      </div>
    </div>
  `;

  // Em produção: tenta montar o widget Hotmart
  setTimeout(() => {
    if (window.checkoutElements) {
      try {
        const area = document.getElementById('downsell-action-area');
        if (area) {
          const hotmartDiv = document.createElement('div');
          hotmartDiv.id = 'hotmart-sales-funnel';
          area.replaceWith(hotmartDiv);
          window.checkoutElements.init('salesFunnel').mount('#hotmart-sales-funnel');
          return;
        }
      } catch (e) {
        console.warn('Hotmart Sales Funnel: sem sessão ativa, usando botões locais.');
      }
    }
    // Fallback local
    const yesBtn = document.getElementById('btn-ds-yes');
    const noBtn = document.getElementById('btn-ds-no');
    if (yesBtn) yesBtn.addEventListener('click', () => { appState.orderTotal += 37; goToStep('thankyou'); });
    if (noBtn) noBtn.addEventListener('click', () => goToStep('thankyou'));
  }, 200);
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
      <div class="ty-checkmark-wrap">
        <span class="ty-sparkle ty-sparkle-tl">✦</span>
        <span class="ty-sparkle ty-sparkle-tr">✦</span>
        <div class="ty-checkmark">✓</div>
        <span class="ty-sparkle ty-sparkle-bl">✦</span>
        <span class="ty-sparkle ty-sparkle-br">✦</span>
      </div>
      <h1 class="ty-title">Thank You</h1>
      <p class="ty-subtitle">Your order has been received!</p>
      <p class="ty-intro">We're excited to help you protect your assets, reduce risk, and build a more secure retirement for you and your family.</p>

      <div class="ty-order-summary">
        <h3 class="ty-summary-title">📋 Order Summary</h3>
        <div class="ty-item"><span>📄 2026 Retiree Asset Protection Blueprint</span><span>$67.00</span></div>
        ${bump ? '<div class="ty-item"><span>📄 Retirement Account Protection Checklist (Order Bump)</span><span>$27.00</span></div>' : ''}
        ${upsell ? '<div class="ty-item"><span>📄 Estate Planning Document Prep Kit</span><span>$197.00</span></div>' : ''}
        <div class="ty-total"><span>Total Paid</span><span>$${total}.00</span></div>
      </div>

      <h3 class="ty-next-title">What's Next?</h3>
      <div class="ty-next-steps">
        <div class="ty-step-card">
          <div class="ty-step-number">1</div>
          <div class="ty-step-icon">✉️</div>
          <h4>Check Your Email</h4>
          <p>We've sent your receipt and access details.</p>
        </div>
        <div class="ty-step-card">
          <div class="ty-step-number">2</div>
          <div class="ty-step-icon">📖</div>
          <h4>Access Your Guide</h4>
          <p>Log in or use the link in your email to access your resources.</p>
        </div>
        <div class="ty-step-card">
          <div class="ty-step-number">3</div>
          <div class="ty-step-icon">⬇️</div>
          <h4>Download & Take Action</h4>
          <p>Review your report and start protecting your family's future today.</p>
        </div>
      </div>

      <div class="ty-help">
        <div class="ty-help-item">
          <div class="ty-help-icon">🎧</div>
          <div><strong>Need Help?</strong><br/>We're here for you.</div>
        </div>
        <div class="ty-help-item">
          <div class="ty-help-icon">✉️</div>
          <div><strong>Email</strong><br/>davidretiress@gmail.com</div>
        </div>
        <div class="ty-help-item">
          <div class="ty-help-icon">📞</div>
          <div><strong>Phone</strong><br/>+1 (904) 231-8483</div>
        </div>
      </div>

      <div class="ty-footer">
        <div class="ty-footer-links">
          <a href="#">Privacy Policy</a>
          <span>|</span>
          <a href="#">Terms of Use</a>
          <span>|</span>
          <a href="#">Disclaimer</a>
        </div>
        <p class="ty-footer-copy">© 2026 Retiree Shield Report. All rights reserved.</p>
      </div>
    </div>
  `;
}
