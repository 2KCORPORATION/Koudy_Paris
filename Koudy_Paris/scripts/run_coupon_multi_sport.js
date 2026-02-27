/**
 * ============================================================
 * KOUDY PARIS — Placement de Coupon Multi-Sport
 * ============================================================
 * Lit multi_sport_matches.json, sélectionne les meilleurs matchs
 * de différents sports, ouvre Chrome et place le coupon sur 1xBet.
 *
 * Sports supportés: Football ⚽, Tennis 🎾, Basketball 🏀,
 *                   Hockey 🏒, Volleyball 🏐, Tennis de Table 🏓
 *
 * Usage:
 *   node run_coupon_multi_sport.js
 *   node run_coupon_multi_sport.js --dry-run   (sans placer vraiment)
 * ============================================================
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/usr/bin/google-chrome';
const ENV_PATH = path.resolve(__dirname, '../../.pi/1xbet.env');
const MATCHES_FILE = path.resolve(__dirname, '../data/multi_sport_matches.json');
const RESULT_FILE = path.resolve(__dirname, '../data/last_coupon_result.json');
const BASE_URL = 'https://1xlite-96866.pro/fr';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// CHARGEMENT DES CREDENTIALS
// ============================================================
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier .env introuvable: ${filePath}`);
  }
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

// ============================================================
// CONNEXION À 1XBET
// ============================================================
async function login(page, username, password) {
  console.log('🔑 Tentative de connexion...');

  // Vérifier si déjà connecté
  const alreadyLogged = await page.evaluate(() =>
    !!(document.querySelector('.user-info') ||
       document.querySelector('.profile-btn') ||
       document.querySelector('.balance') ||
       document.querySelector('[class*="user-balance"]'))
  );

  if (alreadyLogged) {
    console.log('✅ Déjà connecté.');
    return true;
  }

  // Chercher le bouton de connexion
  const loginSelectors = [
    '.login-btn', '.top-login__btn', '[data-id="login"]', 'a[href*="login"]'
  ];

  let clicked = false;
  for (const sel of loginSelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      await sleep(2000);
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.warn('⚠️ Bouton login non trouvé');
    return false;
  }

  // Remplir le formulaire
  const userSel = [
    'input[name="username"]', 'input[id="auth-id"]',
    'input[type="tel"]', 'input[name="login"]',
    'input[type="text"]'
  ].join(', ');

  const passSel = 'input[type="password"], input[name="password"]';

  try {
    await page.waitForSelector(passSel, { timeout: 5000 });

    const userInput = await page.$(userSel);
    if (userInput) {
      await userInput.click({ clickCount: 3 });
      await page.keyboard.type(username, { delay: 30 });
    }

    const passInput = await page.$(passSel);
    if (passInput) {
      await passInput.click({ clickCount: 3 });
      await page.keyboard.type(password, { delay: 30 });
    }

    await page.keyboard.press('Enter');
    console.log('⏳ Attente connexion (10s)...');
    await sleep(10000);

    // Vérifier la connexion
    const loggedIn = await page.evaluate(() =>
      !!(document.querySelector('.user-info') ||
         document.querySelector('.balance') ||
         document.querySelector('[class*="user-balance"]'))
    );

    if (loggedIn) {
      console.log('✅ Connexion réussie !');
      return true;
    } else {
      console.warn('⚠️ Connexion incertaine (éléments non détectés)');
      return true; // On continue quand même
    }
  } catch (err) {
    console.warn('⚠️ Erreur login:', err.message);
    return false;
  }
}

// ============================================================
// CLIQUER UNE COTE SUR LA PAGE D'UN MATCH
// Stratégie: chercher la cote du favori (la plus basse valide)
// ============================================================
async function clickBestOdd(page, match) {
  const result = await page.evaluate((matchData) => {
    // Tous les sélecteurs de cotes possibles
    const selectors = [
      '.bet_type',
      '.ui-market__toggle',
      '.dashboard-game-block__odd',
      '[data-type="event"] .coef',
      '.c-bets__bet',
      '[class*="odd"]',
      '[class*="coef"]',
      '[class*="rate"]',
      'span[class*="value"]'
    ];

    const candidates = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        const text = (el.textContent || '').replace(',', '.').trim();
        const match = text.match(/^(\d+(?:\.\d+)?)$/);
        if (match) {
          const odd = parseFloat(match[1]);
          if (odd >= 1.3 && odd <= 4.0) {
            candidates.push({ el, odd, sel });
          }
        }
      });
    }

    if (candidates.length === 0) return { ok: false, reason: 'no_odds_found' };

    // Trier par cote (favoris d'abord: cote basse mais ≥ 1.3)
    candidates.sort((a, b) => a.odd - b.odd);

    // Prendre le favori (cote la plus basse dans la plage)
    const best = candidates[0];

    try {
      best.el.click();
      return { ok: true, odd: best.odd, selector: best.sel };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }, match);

  return result;
}

// ============================================================
// SAUVEGARDER LE COUPON
// ============================================================
async function saveCoupon(page) {
  await sleep(2000);

  // Chercher et cliquer le bouton de sauvegarde
  const saveResult = await page.evaluate(() => {
    const keywords = ['sauveg', 'enregistrer', 'save', 'coupon', 'charger'];
    const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));

    const targets = elements.filter(el => {
      const t = (el.textContent || '').toLowerCase().trim();
      return keywords.some(kw => t.includes(kw)) && t.length < 50;
    });

    targets.forEach(el => {
      try { el.click(); } catch (_) {}
    });

    return { clickedCount: targets.length };
  });

  await sleep(4000);

  // Extraire le code coupon
  const code = await page.evaluate(() => {
    const bodyText = document.body ? document.body.innerText : '';
    const patterns = [
      /code\s*(?:coupon)?\s*[:#-]?\s*([A-Z0-9]{6,14})/i,
      /coupon[^:]*[:#]\s*([A-Z0-9]{6,14})/i,
      /([A-Z]{2,4}[0-9]{4,10})/,
      /\b([0-9]{8,14})\b/,
      /\b([A-Z0-9]{8,14})\b/
    ];

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  });

  return { code, saveClicks: saveResult.clickedCount };
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) console.log('🧪 MODE DRY-RUN — Simulation sans placement réel\n');

  // === 1. Charger les credentials ===
  let env;
  try {
    env = loadEnv(ENV_PATH);
  } catch (err) {
    console.error('❌', err.message);
    console.error('   Créer le fichier: ' + ENV_PATH);
    console.error('   Contenu: XBET_USERNAME=... et XBET_PASSWORD=...');
    process.exit(1);
  }

  if (!env.XBET_USERNAME || !env.XBET_PASSWORD) {
    console.error('❌ XBET_USERNAME ou XBET_PASSWORD manquant dans .env');
    process.exit(1);
  }

  // === 2. Charger les matchs ===
  if (!fs.existsSync(MATCHES_FILE)) {
    console.error(`❌ Fichier introuvable: ${MATCHES_FILE}`);
    console.error('   Lance d\'abord: node fetch_matches_multi_sport.js');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));
  const picks = data.best_coupon_selection || [];

  if (picks.length < 4) {
    console.error(`❌ Seulement ${picks.length} matchs dans la sélection. Minimum: 4`);
    console.error('   Relance: node fetch_matches_multi_sport.js');
    process.exit(1);
  }

  console.log('🎯 KOUDY PARIS — Placement du coupon multi-sport\n');
  console.log('📋 Sélection:');
  picks.forEach((m, i) => {
    const bestOdd = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.odds?.team1 : m.odds?.team2;
    console.log(`   ${i + 1}. [${m.sport}] ${m.team1} vs ${m.team2} @ ${bestOdd} (confiance: ${m.confidence}/100)`);
  });

  const totalOdds = picks.reduce((acc, m) => {
    const o = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.odds?.team1 : m.odds?.team2;
    return acc * (o || 1);
  }, 1);
  console.log(`\n   Cote totale estimée: ${totalOdds.toFixed(2)}`);

  if (isDryRun) {
    console.log('\n✅ [DRY-RUN] Simulation terminée. Coupon non placé.');
    process.exit(0);
  }

  // === 3. Lancer le navigateur ===
  console.log('\n🌐 Ouverture du navigateur...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Visible pour surveillance
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const result = {
    timestamp: new Date().toISOString(),
    picks,
    added: 0,
    details: [],
    couponCode: null,
    total_odds: totalOdds,
    success: false
  };

  try {
    // === 4. Connexion ===
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await login(page, env.XBET_USERNAME, env.XBET_PASSWORD);

    // === 5. Ajouter chaque match au coupon ===
    for (const match of picks) {
      if (!match.match_url) {
        console.warn(`   ⚠️ Pas d'URL pour ${match.team1} vs ${match.team2}`);
        continue;
      }

      console.log(`\n🎯 [${match.sport}] ${match.team1} vs ${match.team2}`);
      console.log(`   URL: ${match.match_url.slice(0, 80)}...`);

      await page.goto(match.match_url, { waitUntil: 'networkidle2', timeout: 90000 });
      await sleep(5000);

      const clickResult = await clickBestOdd(page, match);

      if (clickResult.ok) {
        result.added++;
        result.details.push({
          match: `${match.team1} vs ${match.team2}`,
          sport: match.sport,
          odd_clicked: clickResult.odd,
          selector_used: clickResult.selector
        });
        console.log(`   ✅ Cote ajoutée: ${clickResult.odd}`);
        await sleep(1500);
      } else {
        console.warn(`   ⚠️ Impossible d'ajouter la cote: ${clickResult.reason}`);
        result.details.push({
          match: `${match.team1} vs ${match.team2}`,
          sport: match.sport,
          error: clickResult.reason
        });
      }

      if (result.added >= 4) break;
    }

    // === 6. Vérification ===
    if (result.added < 4) {
      throw new Error(`Seulement ${result.added}/4 sélections ajoutées`);
    }

    // === 7. Sauvegarder le coupon ===
    console.log('\n💾 Sauvegarde du coupon...');
    const saveResult = await saveCoupon(page);
    result.couponCode = saveResult.code;

    if (result.couponCode) {
      console.log(`\n🎉 COUPON SAUVEGARDÉ ! Code: ${result.couponCode}`);
      result.success = true;
    } else {
      console.warn('\n⚠️ Code coupon non détecté automatiquement.');
      console.warn('   Vérifie la fenêtre Chrome pour le code.');
      // Prendre un screenshot de debug
      await page.screenshot({ path: path.join(__dirname, '../data/coupon_debug.png'), fullPage: false });
      console.log('   📸 Screenshot sauvegardé: data/coupon_debug.png');
    }

    // Garder la fenêtre ouverte 2 min pour vérification manuelle
    console.log('\n⏳ Fenêtre ouverte 2 minutes pour vérification...');
    await sleep(120000);

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    result.error = err.message;

    // Screenshot de l'erreur
    try {
      await page.screenshot({ path: path.join(__dirname, '../data/error_screenshot.png') });
      console.log('   📸 Screenshot erreur: data/error_screenshot.png');
    } catch (_) {}

  } finally {
    // Sauvegarder le résultat
    const dir = path.dirname(RESULT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n📁 Résultat sauvegardé: ${RESULT_FILE}`);

    await browser.close();

    // Résumé final
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RÉSUMÉ COUPON:');
    console.log(`   Sélections ajoutées : ${result.added}/4`);
    console.log(`   Code coupon         : ${result.couponCode || 'Non détecté'}`);
    console.log(`   Cote totale         : ${result.total_odds.toFixed(2)}`);
    console.log(`   Succès              : ${result.success ? '✅ OUI' : '❌ NON'}`);
    console.log('═'.repeat(50));

    process.exit(result.success ? 0 : 1);
  }
})();
