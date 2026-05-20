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
        <h2>WARNING: Your Estate is Vulnerable</h2>
        <p>Based on your answers, this is the brutal reality of what probate courts, nursing homes, and taxes could strip away from your family. Every dollar here is money your heirs may never see.</p>
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
      </div>
      
      <div class="step-diagnosis-action">
        <h3>Don't Let the System Drain Your Legacy.</h3>
        <p>The good news? You can legally shield your assets from nursing homes, skip the grueling probate process, and ensure 100% of your wealth goes exactly where you want it. But you must put the right documents in place <strong>before</strong> a crisis hits.</p>
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

  $('#btn-protect', el).addEventListener('click', () => goToStep('checkout'));
  const topBtn = $('#btn-protect-top', el);
  if (topBtn) topBtn.addEventListener('click', () => goToStep('checkout'));
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
        <h2 class="checkout-product-title">2026 Retiree Asset Protection Blueprint</h2>
        <p class="checkout-product-tagline">The insider strategies to legally shield your home and life savings from nursing homes, probate courts, and greedy tax collectors.</p>
        <div class="checkout-product-image">
          <img src="/assets/book-blueprint.png" alt="2026 Retiree Asset Protection Blueprint" class="checkout-book-img">
        </div>
      </div>

      <!-- RIGHT COLUMN: Features + Secure Checkout -->
      <div class="checkout-right-col">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--color-text-primary);">Inside Your Blueprint You'll Discover:</h3>
        <ul class="checkout-features">
          <li>✅ <strong>The Nursing Home Shield:</strong> How to protect your house and savings even if you suddenly need long-term care.</li>
          <li>✅ <strong>Probate Avoidance Tactics:</strong> Keep your family out of court and stop attorneys from taking a percentage of your estate.</li>
          <li>✅ <strong>Tax-Saving Loopholes:</strong> Legally structure your assets so your heirs get everything, not the IRS.</li>
          <li>✅ <strong>The Trust Advantage:</strong> Why a simple will is never enough, and the exact type of trust you actually need.</li>
          <li>✅ <strong>Step-by-Step Action Plan:</strong> No legal jargon. Just clear, simple steps to lock down your legacy today.</li>
        </ul>

        <div class="checkout-form-section">
          <div class="checkout-form-header">
            <h3 style="font-size: 20px; color: var(--color-primary);">🔒 Secure Checkout</h3>
            <p style="font-size: 14px; color: var(--color-text-light); margin-top: 4px;">Click below to complete your order securely via Hotmart.</p>
          </div>

          <a onclick="return false;" href="https://pay.hotmart.com/N105921395O?checkoutMode=2" class="btn btn-primary btn-large btn-full hotmart-fb hotmart__button-checkout" style="font-size: 18px; padding: 16px; display: block; text-align: center;">Continue to Secure Checkout →</a>

          <div class="checkout-guarantees" style="margin-top: 16px;">
            <span>💰 30-Day Money-Back Guarantee</span>
            <span>🔒 Secure 256-bit SSL Encryption</span>
            <span>🇺🇸 U.S. Based Customer Support</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Quando o botão for clicado, podemos disparar o webhook com os dados do quiz
  const hotmartBtn = el.querySelector('.hotmart__button-checkout');
  if (hotmartBtn) {
    hotmartBtn.addEventListener('click', () => {
      // Dispara webhook em background com dados do quiz (sem nome/email que serão preenchidos na Hotmart)
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
      
      // Simula o avanço
      setTimeout(() => goToStep('upsell'), 3000); 
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
    <div class="step-upsell anim-fade-in-up">
      <div class="upsell-badge">Recommended Add-On</div>
      <h1 class="upsell-headline">Estate Planning Document Prep Kit</h1>
      <p class="upsell-subtitle">Have attorney-ready documents — without the high cost.</p>

      <div class="upsell-main">
        <div class="upsell-product-image">
          <img src="/assets/document-prep-kit.png" alt="Document Prep Kit" class="upsell-product-img">
        </div>
        <div class="upsell-features-side">
          <p style="font-size: 16px; margin-bottom: 20px; color: var(--color-text); line-height: 1.6;">
            The Blueprint shows you exactly <em>what</em> to do. But to make it legally binding, you need the right documents. You could pay an estate attorney $3,000+ to draft these... or you can use our attorney-reviewed <strong>Complete Legal Forms Vault</strong> right now.
          </p>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Financial Power of Attorney</div>
              <div class="upsell-feature-desc">Ensure your bills are paid and assets managed by someone you trust if you're incapacitated.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Advance Healthcare Directive</div>
              <div class="upsell-feature-desc">Dictate your exact medical wishes so your family doesn't have to make agonizing choices.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Last Will and Testament</div>
              <div class="upsell-feature-desc">The foundational document to guarantee your assets go exactly where you want them.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Power of Attorney (Financial)</div>
              <div class="upsell-feature-desc">Give someone you trust the authority to manage your financial affairs.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Beneficiary Review Guide</div>
              <div class="upsell-feature-desc">Make sure your accounts and policies are up to date.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Step-by-Step Instructions</div>
              <div class="upsell-feature-desc">Clear guidance to complete each document with confidence.</div>
            </div>
          </div>
          <div class="upsell-feature-item">
            <div class="upsell-feature-check">✅</div>
            <div class="upsell-feature-content">
              <div class="upsell-feature-title">Attorney Review Checklist</div>
              <div class="upsell-feature-desc">Ensure everything is complete, accurate, and legally sound.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="upsell-why">
        <div class="upsell-why-icon">🤝</div>
        <div class="upsell-why-content">
          <h3>Why add this now?</h3>
          <p>Save time, reduce stress, and give your family clarity and protection.<br/>These simple steps today can prevent confusion and costly delays tomorrow.</p>
        </div>
      </div>

      <!-- Botões de ação (fallback local / aparência em produção) -->
      <div id="upsell-action-area" style="margin-top: 30px; text-align: center;">
        <button class="btn btn-primary btn-large btn-full" id="btn-upsell-yes" style="font-size: 20px; padding: 18px; margin-bottom: 16px;">✅ Yes! Add The Legal Forms Vault to My Order — $197 →</button>
        <button id="btn-upsell-no" style="background: none; border: none; color: var(--color-text-light); font-size: 14px; cursor: pointer; text-decoration: underline;">No thanks, I'll pay thousands to an attorney later.</button>
      </div>

      <div class="upsell-trust-row" style="margin-top: 40px;">
        <div class="upsell-trust-item">
          <div class="upsell-trust-icon">🔒</div>
          <div class="upsell-trust-label">Secure & Confidential</div>
          <div class="upsell-trust-desc">Your information is protected with 256-bit encryption.</div>
        </div>
        <div class="upsell-trust-item">
          <div class="upsell-trust-icon">✅</div>
          <div class="upsell-trust-label">Satisfaction Guaranteed</div>
          <div class="upsell-trust-desc">30-day money-back guarantee.</div>
        </div>
        <div class="upsell-trust-item">
          <div class="upsell-trust-icon">🛡️</div>
          <div class="upsell-trust-label">100% Private</div>
          <div class="upsell-trust-desc">We never share or sell your information.</div>
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
    <div class="step-upsell anim-fade-in-up" style="max-width: 600px; margin: 40px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
      <h2 style="font-size: 28px; color: var(--color-danger); text-align: center; margin-bottom: 20px;">Wait — Don't Leave Empty-Handed</h2>
      <p style="text-align: center; font-size: 16px; color: var(--color-text); margin-bottom: 30px;">
        Since you decided to pass on the complete Vault, you can still get the absolute essential protection for your assets.
      </p>

      <div style="background: var(--color-bg); padding: 25px; border-radius: 8px; border: 1px solid var(--color-border); margin-bottom: 30px;">
        <h3 style="font-size: 20px; color: var(--color-primary); margin-bottom: 15px;">The Emergency Medicaid Survival Guide</h3>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          Learn the exact legal loopholes to protect your home and savings if you suddenly need nursing home care — before the government forces you to spend it all down.
        </p>
        
        <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
          <li style="margin-bottom: 10px;">✅ <strong>Nursing Home Loophole:</strong> How to transfer assets safely.</li>
          <li style="margin-bottom: 10px;">✅ <strong>Spousal Protection:</strong> Keep your healthy spouse from going broke.</li>
          <li>✅ <strong>Fast-Action Plan:</strong> What to do if a medical crisis hits today.</li>
        </ul>

        <div style="text-align: center; font-weight: bold; font-size: 24px; color: var(--color-primary); margin-top: 20px;">
          Just $37 Today
        </div>
      </div>

      <!-- Botões de ação (fallback local / aparência em produção) -->
      <div id="downsell-action-area" style="text-align: center; margin-top: 20px;">
        <button class="btn btn-primary btn-large btn-full" id="btn-ds-yes" style="font-size: 18px; padding: 16px; margin-bottom: 14px;">✅ Yes, Add the Medicaid Survival Guide for $37 →</button>
        <button id="btn-ds-no" style="background: none; border: none; color: var(--color-text-light); font-size: 14px; cursor: pointer; text-decoration: underline;">No thanks, I'll figure it out on my own.</button>
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
