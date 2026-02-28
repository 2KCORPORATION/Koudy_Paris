/**
 * run_daily.js
 * ─────────────
 * Script principal — à lancer chaque matin pour générer et envoyer
 * tous les coupons du jour (Footia + BetAI).
 *
 * Usage:
 *   node run_daily.js
 *
 * Ce script :
 * 1. Ouvre 1xBet dans un navigateur Puppeteer
 * 2. Pour chaque coupon défini dans COUPONS_DU_JOUR :
 *    a. Ajoute les sélections au betslip
 *    b. Sauvegarde et récupère le code
 *    c. Envoie à Footia et/ou BetAI selon la plateforme
 * 3. Affiche un récap complet
 *
 * ─── IMPORTANT : RÈGLES ANTI-ERREURS ───────────────────────────────
 * ✅ Cote minimum par sélection : 1.50
 * ✅ Zéro doublon : une sélection ne peut apparaître que dans 1 coupon
 * ✅ Vérifier blessures + compos avant de finaliser
 * ────────────────────────────────────────────────────────────────────
 */

const puppeteer = require('puppeteer-core');
const { buildCoupon }    = require('./place_coupon_1xbet');
const { sendToFootia, sendToBetAI } = require('./send_coupon_api');

const XBET_URL    = 'https://1xlite-96866.pro/fr/line/basketball';
const BROWSER_PATH = '/usr/bin/google-chrome';

// ─── DÉFINIR ICI LES COUPONS DU JOUR ───────────────────────────────
// Modifier chaque jour avant de lancer le script
//
// platform  : "footia" ou "betai" (ou les deux ["footia","betai"])
// selections : [{ slug: "partie-de-url-du-match", label: "V1"|"V2"|"229.5 Plus de"|... }]
// total_odds : cote totale estimée (produit des cotes individuelles)
//
// ⚠️ RÈGLES :
//  - Cote min par sélection : 1.50
//  - Aucun doublon entre coupons (vérifier avant de remplir)
// ───────────────────────────────────────────────────────────────────
const COUPONS_DU_JOUR = [
  // Exemple Footia
  {
    name: 'Footia-1 - Classiker',
    platform: ['footia'],
    total_odds: 5.27,
    selections: [
      { slug: 'borussia-dortmund-bayern-munich', label: 'V2' },          // Bayern 1.713
      { slug: 'liverpool-west-ham-united',       label: 'V1' },          // Liverpool 1.445
      { slug: 'monaco-angers',                   label: 'V1' },          // Monaco 1.515
      { slug: 'como-lecce',                      label: 'V1' },          // Como 1.411
    ]
  },
  // Exemple BetAI
  {
    name: 'BetAI-1 - NBA Safe',
    platform: ['betai'],
    total_odds: 2.19,
    selections: [
      { slug: 'charlotte-hornets-portland-trail-blazers', label: 'V1' },  // 1.337
      { slug: 'miami-heat-houston-rockets',               label: 'V2' },  // 1.636
    ]
  },
];

// ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎯 KOUDY PARIS — Script journalier');
  console.log(`📅 Date: ${new Date().toLocaleDateString('fr-FR')}\n`);

  // Vérification anti-doublons
  const allSlugs = [];
  for (const c of COUPONS_DU_JOUR) {
    for (const s of c.selections) {
      if (allSlugs.includes(s.slug + s.label)) {
        console.error(`🚨 DOUBLON DÉTECTÉ: "${s.slug}" (${s.label}) apparaît dans plusieurs coupons!`);
        console.error('   Corriger COUPONS_DU_JOUR avant de relancer.');
        process.exit(1);
      }
      allSlugs.push(s.slug + s.label);
    }
  }
  console.log('✅ Vérification anti-doublons : OK\n');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto(XBET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const results = [];

  for (const coupon of COUPONS_DU_JOUR) {
    console.log(`\n━━━ ${coupon.name} ━━━`);

    const code = await buildCoupon(page, coupon.selections);
    if (!code) {
      console.log('   ⚠️ Coupon ignoré (code non généré)');
      results.push({ name: coupon.name, code: null, status: 'FAILED' });
      continue;
    }

    const platforms = Array.isArray(coupon.platform) ? coupon.platform : [coupon.platform];

    for (const platform of platforms) {
      if (platform === 'footia') {
        await sendToFootia(code, coupon.total_odds);
      }
      if (platform === 'betai') {
        await sendToBetAI({
          code,
          coupon_name: coupon.name,
          total_odds: coupon.total_odds,
          strategy: 'betai',
          events: coupon.selections.map(s => ({
            home_team: s.slug.split('-vs-')[0]?.replace(/-/g, ' ') || s.slug,
            away_team: s.slug.split('-vs-')[1]?.replace(/-/g, ' ') || '',
            bet_type:  '1X2',
            bet_value: s.label
          }))
        });
      }
    }

    results.push({ name: coupon.name, code, status: 'OK', odds: coupon.total_odds });
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  // ─── RÉCAP ──────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════');
  console.log('📊 RÉCAP FINAL');
  console.log('══════════════════════════════════');
  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${r.name} | Code: ${r.code || 'N/A'} | Cote: ×${r.odds || '-'}`);
  }
  console.log('══════════════════════════════════\n');
}

main().catch(e => {
  console.error('❌ Erreur fatale:', e.message);
  process.exit(1);
});
