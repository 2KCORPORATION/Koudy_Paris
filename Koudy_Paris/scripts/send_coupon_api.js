/**
 * send_coupon_api.js
 * ──────────────────
 * Envoie un coupon aux APIs Footia et BetAI
 *
 * Footia  : GET  https://appfootia.com/tipster/public/add-cupon-api
 * BetAI   : POST https://api.appbetai.com/api/admin/coupons
 *
 * Validé le 28/02/2026 par Koudy
 */

const fetch = require('node-fetch');

const FOOTIA_URL = 'https://appfootia.com/tipster/public/add-cupon-api';
const BETAI_URL  = 'https://api.appbetai.com/api/admin/coupons';
const BETAI_KEY  = 'vkjuhriouhgrljherihenokhbreoiughggpiub_BAI';

/**
 * Envoie le coupon à appfootia.com
 * @param {string} code  - code 1xBet du coupon
 * @param {number} cote  - cote totale du coupon
 */
async function sendToFootia(code, cote) {
  const url = `${FOOTIA_URL}?code=${encodeURIComponent(code)}&cote=${parseFloat(cote).toFixed(2)}`;
  console.log(`\n📤 Footia: ${code} @ ×${cote}...`);
  try {
    const res = await fetch(url, { method: 'GET', timeout: 10000 });
    const data = await res.json();
    if (res.ok) {
      console.log(`   ✅ Envoyé! ID: ${data.data?.coupon_id || 'N/A'}`);
      return data;
    } else {
      console.log(`   ❌ Erreur ${res.status}: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
    return null;
  }
}

/**
 * Envoie le coupon à api.appbetai.com
 * @param {Object} couponData
 * @param {string} couponData.code         - code 1xBet
 * @param {string} couponData.coupon_name  - nom du coupon
 * @param {number} couponData.total_odds   - cote totale
 * @param {string} couponData.strategy     - "betai" ou "footia"
 * @param {Array}  couponData.events       - liste des sélections
 *   Chaque event : { home_team, away_team, bet_type, bet_value }
 */
async function sendToBetAI(couponData) {
  const body = {
    date:         new Date().toISOString().split('T')[0],
    coupon_name:  couponData.coupon_name,
    code:         couponData.code,
    strategy:     couponData.strategy || 'betai',
    total_odds:   couponData.total_odds,
    start_time:   new Date().toISOString(),
    end_time:     new Date(Date.now() + 7200000).toISOString(),
    events:       couponData.events
  };

  console.log(`\n📤 BetAI: ${couponData.coupon_name} [${couponData.code}] @ ×${couponData.total_odds}...`);
  try {
    const res = await fetch(BETAI_URL, {
      method: 'POST',
      headers: {
        'X-API-Key':     BETAI_KEY,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(body),
      timeout: 10000
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`   ✅ Envoyé! ID: ${data.id || data.coupon_id || JSON.stringify(data).slice(0, 60)}`);
      return data;
    } else {
      console.log(`   ❌ Erreur ${res.status}: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
    return null;
  }
}

module.exports = { sendToFootia, sendToBetAI };
