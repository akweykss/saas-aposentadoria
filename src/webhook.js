/**
 * Webhook — envia dados do lead para o Google Sheets via Apps Script.
 */

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyauEmbaa5N5vcob-uvLw17QjW_D2E_IMxHm3OWJYA4q41EaQb5hwo2lhtm_sqfxVc/exec';

export async function submitLead(data) {
  const urlParams = new URLSearchParams(window.location.search);

  const payload = {
    firstName:      data.firstName      || '',
    email:          data.email          || '',
    ageRange:       data.ageRange       || '',
    primaryConcern: data.primaryConcern || '',
    stateCode:      data.stateCode      || '',
    homeValue:      data.homeValue      || 0,
    liquidAssets:   data.liquidAssets   || 0,
    hasTrust:       data.hasTrust,
    riskLevel:      data.riskLevel      || '',
    atRisk:         data.atRisk         || 0,
    source:         urlParams.get('utm_source') || urlParams.get('source') || 'organic',
    campaign:       urlParams.get('utm_campaign') || '',
    submittedAt:    new Date().toISOString(),
  };

  console.log('[Webhook] Enviando lead:', JSON.stringify(payload, null, 2));

  try {
    // Google Apps Script não aceita CORS, usamos no-cors (funciona para POST)
    await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      mode:    'no-cors',
    });
    console.log('[Webhook] Enviado com sucesso para o Google Sheets!');
    return true;
  } catch (err) {
    console.warn('[Webhook] Falhou:', err.message);
    return false;
  }
}
