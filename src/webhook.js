/**
 * Webhook integration — fires lead data to a configurable endpoint.
 */

const WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID';

/**
 * Submit lead data to webhook.
 * @param {Object} params
 * @param {Object} params.leadInfo - { firstName, lastName, phone, email }
 * @param {Object} params.financialProfile - { age, maritalStatus, state, netWorth, hasTrust }
 * @param {Object} params.calculatedRisk - { totalAtRisk, probateRisk, medicaidRisk, stateTax }
 * @returns {Promise<boolean>} true if successful
 */
export async function submitLead({ leadInfo, financialProfile, calculatedRisk }) {
  // Get campaign source from URL params or fallback
  const urlParams = new URLSearchParams(window.location.search);
  const sourceCampaign = urlParams.get('utm_campaign') || urlParams.get('source') || 'organic';

  const payload = {
    lead_info: {
      first_name: leadInfo.firstName,
      last_name: leadInfo.lastName,
      phone: leadInfo.phone,
      email: leadInfo.email,
    },
    financial_profile: {
      age: financialProfile.age,
      marital_status: financialProfile.maritalStatus,
      state: financialProfile.state,
      net_worth: financialProfile.netWorth,
      has_trust: financialProfile.hasTrust,
    },
    calculated_risk: {
      total_at_risk: calculatedRisk.totalAtRisk,
      probate_risk: calculatedRisk.probateCost,
      medicaid_risk: calculatedRisk.medicaidRisk,
      state_tax: calculatedRisk.stateTax,
      risk_level: calculatedRisk.riskLevel,
    },
    source_campaign: sourceCampaign,
    submitted_at: new Date().toISOString(),
  };

  // Log payload for development / testing
  console.log('[Webhook] Lead payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors', // Fire-and-forget for third-party webhooks
    });

    console.log('[Webhook] Response status:', response.status || 'no-cors (opaque)');
    return true;
  } catch (error) {
    console.warn('[Webhook] Failed to submit lead:', error.message);
    // Don't block user experience on webhook failure
    return false;
  }
}
