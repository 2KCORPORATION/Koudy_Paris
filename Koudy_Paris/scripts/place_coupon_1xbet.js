/**
 * place_coupon_1xbet.js
 * ─────────────────────
 * Ajoute des sélections au betslip 1xBet, sauvegarde le coupon
 * et retourne le code généré.
 *
 * Technique validée le 28/02/2026 par Koudy :
 *  - Cibler les matchs via `a[href*="slug"]`
 *  - Cliquer les boutons par aria-label ("V1", "V2", "229.5 Plus de", etc.)
 *  - Sauvegarder via .coupon-loader__button
 *  - Lire le code dans .coupon-loader input
 *
 * Usage :
 *   const { buildCoupon } = require('./place_coupon_1xbet');
 *   const code = await buildCoupon(page, selections);
 */

const SAVE_BTN_SEL  = '.coupon-loader__button';
const CODE_INPUT_SEL = '.coupon-loader input';
const LOADER_TOGGLE = 'button.coupon-loader-toggle__button';

/**
 * Vide le betslip actuel
 */
async function clearBetslip(page) {
  await page.evaluate(() => {
    document.querySelectorAll(
      '.bet-slip__delete, .coupon-head__remove, button[class*="remove"], button[class*="delete"], .c-bets__remove'
    ).forEach(b => b.click());
  });
  await new Promise(r => setTimeout(r, 500));
}

/**
 * Clique une cote sur la page courante
 * @param {Page} page - page Puppeteer
 * @param {string} matchSlug - partie de l'URL du match (ex: "charlotte-hornets-portland")
 * @param {string} ariaLabel - label du bouton de cote ("V1", "V2", "229.5 Plus de", etc.)
 */
async function clickOdd(page, matchSlug, ariaLabel) {
  const result = await page.evaluate((slug, label) => {
    const link = document.querySelector(`a[href*="${slug}"]`);
    if (!link) return `❌ Match non trouvé: ${slug}`;
    const li = link.closest('li');
    if (!li) return `❌ li parent non trouvé: ${slug}`;
    const btn = [...li.querySelectorAll('button')].find(
      b => b.getAttribute('aria-label') === label
    );
    if (!btn) {
      const all = [...li.querySelectorAll('button')]
        .map(b => b.getAttribute('aria-label'))
        .filter(Boolean);
      return `❌ Bouton "${label}" non trouvé. Disponibles: ${all.join(', ')}`;
    }
    btn.click();
    return `✅ ${slug} → ${label} (cote: ${btn.nextElementSibling?.textContent || '?'})`;
  }, matchSlug, ariaLabel);
  console.log(`   ${result}`);
  return result.startsWith('✅');
}

/**
 * Ouvre le panneau loader et sauvegarde le coupon
 * Retourne le code généré ou null
 */
async function saveCoupon(page) {
  // S'assurer que le panneau est ouvert
  await page.evaluate((sel) => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, LOADER_TOGGLE);
  await new Promise(r => setTimeout(r, 800));

  // Cliquer sur "Enregistrer"
  await page.evaluate((sel) => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, SAVE_BTN_SEL);
  await new Promise(r => setTimeout(r, 2000));

  // Lire le code
  const code = await page.evaluate((sel) => {
    const loader = document.querySelector('.coupon-loader');
    if (!loader) return null;
    const input = loader.querySelector('input');
    return input ? input.value.trim() : null;
  }, CODE_INPUT_SEL);

  return code || null;
}

/**
 * Construit un coupon complet
 * @param {Page} page - page Puppeteer ouverte sur 1xBet
 * @param {Array} selections - [{ slug: "charlotte-hornets-portland", label: "V1" }, ...]
 * @returns {string|null} code du coupon ou null si échec
 */
async function buildCoupon(page, selections) {
  console.log(`\n🎯 Construction du coupon (${selections.length} sélections)...`);

  // 1. Vider le betslip
  await clearBetslip(page);
  console.log('   🧹 Betslip vidé');

  // 2. Ajouter chaque sélection
  let added = 0;
  for (const sel of selections) {
    const ok = await clickOdd(page, sel.slug, sel.label);
    if (ok) added++;
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`   ✅ ${added}/${selections.length} sélections ajoutées`);

  if (added === 0) {
    console.log('   ❌ Aucune sélection ajoutée, abandon');
    return null;
  }

  // 3. Sauvegarder
  const code = await saveCoupon(page);
  if (code) {
    console.log(`   🔑 Code généré: ${code}`);
  } else {
    console.log('   ❌ Code non récupéré');
  }
  return code;
}

module.exports = { buildCoupon, clearBetslip, clickOdd, saveCoupon };
