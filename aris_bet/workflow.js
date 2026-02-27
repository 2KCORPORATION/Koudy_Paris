/**
 * ============================================================
 * KOUDY PARIS — Workflow Complet (1 commande = tout fait)
 * ============================================================
 * Enchaîne automatiquement:
 *   1. Fetch des matchs multi-sport
 *   2. Sélection intelligente des meilleurs matchs
 *   3. Placement du coupon sur 1xBet
 *   4. Affichage du résultat
 *
 * Usage:
 *   node workflow.js                    ← Sports par défaut
 *   node workflow.js --sports tennis,basketball,football
 *   node workflow.js --dry-run          ← Test sans placer
 *   node workflow.js --coupon-only      ← Placer avec matchs existants
 * ============================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const DATA_DIR = path.join(__dirname, '..', 'data');
const PERF_FILE = path.join(__dirname, '..', 'PERFORMANCE.md');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// ARGUMENTS CLI
// ============================================================
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isCouponOnly = args.includes('--coupon-only');

let sportsArg = null;
const sportsIdx = args.indexOf('--sports');
if (sportsIdx !== -1 && args[sportsIdx + 1]) {
  sportsArg = args[sportsIdx + 1];
}

// Sports par défaut triés par facilité
const DEFAULT_SPORTS = 'tennis,volleyball,basketball,football';

// ============================================================
// AFFICHAGE BANNIÈRE
// ============================================================
function banner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        🎯 KOUDY PARIS — WORKFLOW COMPLET     ║');
  console.log('║   Objectif: 900 000 F → 30 000 000 F (2026) ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  if (isDryRun) console.log('🧪 MODE DRY-RUN activé (aucun pari placé)\n');
}

// ============================================================
// ÉTAPE 1: FETCH DES MATCHS
// ============================================================
async function fetchMatches(sports) {
  console.log('📡 ÉTAPE 1/3 — Récupération des matchs...');
  console.log(`   Sports: ${sports}`);

  const cmd = `node "${path.join(SCRIPTS_DIR, 'fetch_matches_multi_sport.js')}" --sports ${sports}`;

  try {
    execSync(cmd, { stdio: 'inherit', cwd: SCRIPTS_DIR });
    console.log('✅ Matchs récupérés avec succès\n');
    return true;
  } catch (err) {
    console.error('❌ Erreur lors du fetch des matchs:', err.message);
    return false;
  }
}

// ============================================================
// ÉTAPE 2: AFFICHER LA SÉLECTION
// ============================================================
function showSelection() {
  console.log('📋 ÉTAPE 2/3 — Vérification de la sélection...');

  const matchesFile = path.join(DATA_DIR, 'multi_sport_matches.json');
  if (!fs.existsSync(matchesFile)) {
    console.error('❌ Fichier multi_sport_matches.json introuvable');
    return null;
  }

  const data = JSON.parse(fs.readFileSync(matchesFile, 'utf8'));
  const picks = data.best_coupon_selection || [];

  if (picks.length === 0) {
    console.error('❌ Aucun match dans la sélection');
    return null;
  }

  console.log(`\n   📊 Résumé par sport:`);
  const summary = data.sports_summary || {};
  Object.entries(summary).forEach(([k, v]) => {
    console.log(`      ${v.emoji} ${v.name}: ${v.count} matchs`);
  });

  console.log(`\n   🎯 Coupon suggéré (${picks.length} matchs):`);
  let totalOdds = 1;
  picks.forEach((m, i) => {
    const bestOdd = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.odds?.team1 : m.odds?.team2;
    const winner = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.team1 : m.team2;
    totalOdds *= (bestOdd || 1);
    console.log(`      ${i + 1}. [${m.sport}] ${winner} gagne @ ${bestOdd}`);
  });

  console.log(`\n   Cote totale: ${totalOdds.toFixed(2)}`);

  // Évaluation de la cote
  if (totalOdds < 2.0) {
    console.log('   ⚠️ Cote trop basse — peu de gain potentiel');
  } else if (totalOdds <= 8.0) {
    console.log('   ✅ Cote dans la plage idéale (2.0 - 8.0)');
  } else {
    console.log('   ⚠️ Cote élevée — risque important');
  }

  console.log('');
  return picks;
}

// ============================================================
// ÉTAPE 3: PLACER LE COUPON
// ============================================================
async function placeCoupon() {
  console.log('🎰 ÉTAPE 3/3 — Placement du coupon...');

  const extraArgs = isDryRun ? ' --dry-run' : '';
  const cmd = `node "${path.join(SCRIPTS_DIR, 'run_coupon_multi_sport.js')}"${extraArgs}`;

  try {
    execSync(cmd, { stdio: 'inherit', cwd: SCRIPTS_DIR });
    return true;
  } catch (err) {
    console.error('❌ Erreur lors du placement:', err.message);
    return false;
  }
}

// ============================================================
// MISE À JOUR DU FICHIER PERFORMANCE
// ============================================================
function updatePerformance(result, picks) {
  if (!result || !picks) return;

  const today = new Date().toISOString().split('T')[0];
  const matchList = picks.map(m => {
    const winner = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.team1 : m.team2;
    const bestOdd = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.odds?.team1 : m.odds?.team2;
    return `${winner}(${m.sport?.slice(0,3)})@${bestOdd}`;
  }).join(', ');

  const totalOdds = picks.reduce((acc, m) => {
    const o = m.odds?.team1 <= (m.odds?.team2 || 99) ? m.odds?.team1 : m.odds?.team2;
    return acc * (o || 1);
  }, 1).toFixed(2);

  const entry = `| ${today} | ${matchList} | ${totalOdds} | ??? | ⏳ En attente | ??? | ??? |`;

  if (fs.existsSync(PERF_FILE)) {
    let content = fs.readFileSync(PERF_FILE, 'utf8');

    // Ajouter après la ligne de header du tableau ou à la fin
    const tableMarker = '| Date | Matchs | Cote | Mise | Résultat | +/- | Solde |';
    if (content.includes(tableMarker)) {
      content = content.replace(
        tableMarker + '\n|------|--------|------|------|----------|-----|-------|',
        tableMarker + '\n|------|--------|------|------|----------|-----|-------|\n' + entry
      );
    } else {
      content += `\n${entry}\n`;
    }

    fs.writeFileSync(PERF_FILE, content);
    console.log(`\n📊 PERFORMANCE.md mis à jour (coupon du ${today} ajouté)`);
  }
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  banner();

  const startTime = Date.now();
  const sports = sportsArg || DEFAULT_SPORTS;

  let picks = null;
  let success = false;

  try {
    // Étape 1: Fetch (sauf si --coupon-only)
    if (!isCouponOnly) {
      const fetched = await fetchMatches(sports);
      if (!fetched) {
        console.error('❌ Impossible de récupérer les matchs. Arrêt.');
        process.exit(1);
      }
    } else {
      console.log('⏩ --coupon-only: Fetch ignoré, utilisation des matchs existants\n');
    }

    // Étape 2: Afficher la sélection
    picks = showSelection();
    if (!picks) {
      console.error('❌ Sélection vide. Arrêt.');
      process.exit(1);
    }

    // Étape 3: Placer le coupon
    success = await placeCoupon();

    // Mise à jour PERFORMANCE.md
    if (!isDryRun && picks) {
      const resultFile = path.join(DATA_DIR, 'last_coupon_result.json');
      const result = fs.existsSync(resultFile)
        ? JSON.parse(fs.readFileSync(resultFile, 'utf8'))
        : null;
      updatePerformance(result, picks);
    }

  } catch (err) {
    console.error('\n💥 Erreur fatale:', err.message);
    process.exit(1);
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '═'.repeat(50));
  console.log(`🏁 Workflow terminé en ${duration} minutes`);
  console.log(`   Résultat: ${success ? '✅ Succès' : '❌ Échec'}`);
  if (isDryRun) console.log('   (DRY-RUN — aucun pari réellement placé)');
  console.log('═'.repeat(50));

  process.exit(success ? 0 : 1);
})();
