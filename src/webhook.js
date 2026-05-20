/**
 * Webhook integration — fires lead data to a configurable endpoint.
 * Accepts flat params from funnel.js checkout form.
 */

const WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID';

export async function submitLead(data) {
  const urlParams = new URLSearchParams(window.location.search);

  const payload = {
    lead_info: {
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      phone: data.phone || '',
      email: data.email || '',
    },
    financial_profile: {
      age_range: data.ageRange || '',
      primary_concern: data.primaryConcern || '',
      state: data.stateCode || '',
      home_value: data.homeValue || 0,
      liquid_assets: data.liquidAssets || 0,
      has_trust: data.hasTrust,
    },
    order: {
      bump: data.orderBump || false,
      total: data.orderTotal || 67,
    },
    source_campaign: urlParams.get('utm_campaign') || urlParams.get('source') || 'organic',
    submitted_at: new Date().toISOString(),
  };

  console.log('[Webhook] Lead payload:', JSON.stringify(payload, null, 2));

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });
    console.log('[Webhook] Submitted successfully');
    return true;
  } catch (err) {
    console.warn('[Webhook] Failed:', err.message);
    return false;
  }
}
