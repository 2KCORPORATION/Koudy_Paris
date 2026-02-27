/**
 * ============================================================
 * KOUDY PARIS — Multi-Sport Match Fetcher
 * ============================================================
 * Scrape les matchs de plusieurs sports sur 1xBet.
 *
 * Sports couverts (du plus facile au moins facile à prédire):
 *   1. Tennis       → Favoris clairs (classements ATP/WTA fiables)
 *   2. Basketball   → Over/Under très stable, beaucoup de points
 *   3. Football     → 1X2, BTTS, Over/Under 2.5
 *   4. Hockey       → Favoris clairs, moins de nuls
 *   5. Volleyball   → Pas de nul possible, winner facile à prédire
 *   6. Table Tennis → Très nombreux matchs, cotes souvent claires
 *
 * Usage:
 *   node fetch_matches_multi_sport.js
 *   node fetch_matches_multi_sport.js --sports tennis,basketball
 *   node fetch_matches_multi_sport.js --limit 5
 * ============================================================
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://1xlite-96866.pro';
const CHROME_PATH = '/usr/bin/google-chrome';

// ============================================================
// CONFIG DES SPORTS
// Classés par facilité de prédiction (confiance décroissante)
// ============================================================
const SPORTS_CONFIG = {
  tennis: {
    name: 'Tennis',
    url: `${BASE_URL}/fr/line/tennis`,
    emoji: '🎾',
    difficulty: 1, // Plus facile — classements ATP/WTA fiables
    best_markets: ['winner', 'handicap_sets', 'over_under_games'],
    selector: '.dashboard-game-block',
    tips: 'Toujours parier sur le favori au classement ATP/WTA si cote ≤ 2.0',
    odds_range: { min: 1.3, max: 2.5 } // Cotes typiques en tennis
  },
  basketball: {
    name: 'Basketball',
    url: `${BASE_URL}/fr/line/basketball`,
    emoji: '🏀',
    difficulty: 2, // Over/Under très prévisible (matchs à 200+ pts)
    best_markets: ['over_under', 'winner', 'handicap'],
    selector: '.dashboard-game-block',
    tips: 'Over/Under total points très fiable en NBA/Euroleague',
    odds_range: { min: 1.5, max: 2.5 }
  },
  football: {
    name: 'Football',
    url: `${BASE_URL}/fr/line/football`,
    emoji: '⚽',
    difficulty: 3,
    best_markets: ['1X2', 'btts', 'over_under_25', 'double_chance'],
    selector: '.dashboard-game-block',
    tips: 'Grandes ligues uniquement. Double Chance si match incertain.',
    odds_range: { min: 1.5, max: 3.0 }
  },
  hockey: {
    name: 'Hockey sur Glace',
    url: `${BASE_URL}/fr/line/hockey`,
    emoji: '🏒',
    difficulty: 3, // Peu de nuls, favoris souvent fiables
    best_markets: ['winner', 'over_under', 'puck_line'],
    selector: '.dashboard-game-block',
    tips: 'Peu de nuls en hockey (prolongation/tirs au but). Winner fiable.',
    odds_range: { min: 1.4, max: 2.5 }
  },
  volleyball: {
    name: 'Volleyball',
    url: `${BASE_URL}/fr/line/volleyball`,
    emoji: '🏐',
    difficulty: 2, // Pas de nul possible, winner net
    best_markets: ['winner', 'handicap_sets', 'over_under_sets'],
    selector: '.dashboard-game-block',
    tips: 'Pas de match nul possible. Le favori gagne souvent.',
    odds_range: { min: 1.3, max: 2.0 }
  },
  table_tennis: {
    name: 'Tennis de Table',
    url: `${BASE_URL}/fr/line/table-tennis`,
    emoji: '🏓',
    difficulty: 2, // Très nombreux matchs, cotes claires
    best_markets: ['winner', 'over_under'],
    selector: '.dashboard-game-block',
    tips: 'Nombreux matchs 24h/24. Favoris souvent nets.',
    odds_range: { min: 1.3, max: 2.2 }
  }
};

// ============================================================
// CLASSE PRINCIPALE
// ============================================================
class MultiSportScraper {
  constructor(options = {}) {
    this.chromePath = options.chromePath || CHROME_PATH;
    this.headless = options.headless !== false; // true par défaut
    this.browser = null;
    this.page = null;
    this.results = {};
  }

  async init() {
    if (this.browser) return;
    console.log('🔄 Lancement du navigateur...');
    this.browser = await puppeteer.launch({
      executablePath: this.chromePath,
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1400,900'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await this.page.setViewport({ width: 1400, height: 900 });
    console.log('✅ Navigateur prêt');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  // ============================================================
  // NAVIGATION AVEC RETRY
  // ============================================================
  async navigateTo(url, sportName) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   🌐 Navigation ${sportName}... (tentative ${attempt}/${maxRetries})`);
        if (attempt > 1) await this._sleep((attempt - 1) * 5000);

        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        await this._sleep(3000);

        // Attendre les blocs de matchs (sélecteurs multiples)
        await this.page.waitForSelector(
          '.dashboard-game-block, .c-events__item, .game-block',
          { timeout: 30000 }
        );

        console.log(`   ✅ Page ${sportName} chargée`);
        return true;
      } catch (err) {
        console.error(`   ⚠️ Erreur tentative ${attempt}:`, err.message.slice(0, 80));
        if (attempt === maxRetries) return false;
      }
    }
    return false;
  }

  // ============================================================
  // EXTRACTION DES MATCHS (générique tous sports)
  // ============================================================
  async extractMatches(sportKey) {
    const sport = SPORTS_CONFIG[sportKey];
    try {
      // Scroll pour charger plus de matchs
      for (let i = 1; i <= 4; i++) {
        await this.page.evaluate(y => window.scrollTo(0, y), i * 1500);
        await this._sleep(800);
      }

      const matches = await this.page.evaluate((sportConfig) => {
        const results = [];
        const blocks = document.querySelectorAll('.dashboard-game-block');

        blocks.forEach((block, index) => {
          try {
            // === Noms des équipes / joueurs ===
            let team1 = '', team2 = '';

            // Méthode 1: sélecteurs précis
            const h1 = block.querySelector(
              '.dashboard-game-block__link > span > span > span > div:nth-child(1) > div > div > span:nth-child(2)'
            );
            const h2 = block.querySelector(
              '.dashboard-game-block__link > span > span > span > div:nth-child(2) > div > div > span:nth-child(2)'
            );

            if (h1 && h2) {
              team1 = h1.textContent.trim();
              team2 = h2.textContent.trim();
            } else {
              // Méthode 2: fallback spans
              const spans = Array.from(block.querySelectorAll('.dashboard-game-block__link span'))
                .filter(s => s.textContent.trim().length > 1 && !s.querySelector('span'));
              if (spans.length >= 2) {
                team1 = spans[0].textContent.trim();
                team2 = spans[1].textContent.trim();
              }
            }

            // Nettoyage
            team1 = team1.replace(/\d{2}[\/\:]\d{2}.*$/g, '').trim();
            team2 = team2.replace(/\d{2}[\/\:]\d{2}.*$/g, '').trim();

            // === Date/Heure ===
            const dateEl = block.querySelector('.dashboard-game-block__date, .date, [class*="date"]');
            const date = dateEl ? dateEl.textContent.trim() : '';

            // === Cotes ===
            const oddBtns = block.querySelectorAll('.ui-market__toggle, .dashboard-game-block__odd');
            const odds = {};
            oddBtns.forEach((btn, i) => {
              const val = (btn.textContent.trim()).replace(',', '.');
              const match = val.match(/[\d.]+/);
              if (match && i < 3) {
                const labels = ['team1', 'draw', 'team2'];
                odds[labels[i]] = parseFloat(match[0]);
              }
            });

            // === Ligue / Compétition ===
            let league = 'Unknown';
            let parent = block.parentElement;
            for (let d = 0; d < 12; d++) {
              if (!parent) break;
              const cap = parent.querySelector('.dashboard-champ-name__caption');
              if (cap) { league = cap.textContent.trim(); break; }
              parent = parent.parentElement;
            }

            // === URL et ID du match ===
            const linkEl = block.querySelector('a.dashboard-game-block__link');
            let matchUrl = null, matchId = null;
            if (linkEl && linkEl.href) {
              matchUrl = linkEl.href;
              const idMatch = matchUrl.match(/\/(\d+)-[^\/]+$/);
              if (idMatch) matchId = idMatch[1];
            }

            // === Filtre qualité ===
            const isValidName = (n) =>
              n && n.length > 2 &&
              !/paris spéciaux|à domicile|à l'extérieur|^home$|^away$/i.test(n);

            if (isValidName(team1) && isValidName(team2)) {
              results.push({
                index,
                sport: sportConfig.key,
                sport_name: sportConfig.name,
                team1,
                team2,
                league,
                date,
                odds,
                match_url: matchUrl,
                match_id: matchId,
                best_markets: sportConfig.best_markets,
                tips: sportConfig.tips
              });
            }
          } catch (_) {}
        });

        return results;
      }, { ...sport, key: sportKey });

      // Score de confiance par match (basé sur les cotes)
      const scored = matches.map(m => ({
        ...m,
        confidence_score: this._calcConfidence(m, sport)
      }));

      return scored;
    } catch (err) {
      console.error(`   ❌ Erreur extraction ${sportKey}:`, err.message);
      return [];
    }
  }

  // ============================================================
  // SCORE DE CONFIANCE
  // Plus le score est élevé, plus le match est "prenable"
  // ============================================================
  _calcConfidence(match, sportConfig) {
    let score = 0;
    const { odds } = match;

    if (!odds || Object.keys(odds).length === 0) return 0;

    const t1 = odds.team1;
    const t2 = odds.team2;
    const draw = odds.draw;

    // Critère 1: Un favori clair (une cote ≤ 1.8)
    if (t1 <= 1.8 || t2 <= 1.8) score += 40;
    else if (t1 <= 2.2 || t2 <= 2.2) score += 20;

    // Critère 2: Écart important entre les deux cotes (déséquilibre)
    if (t1 && t2) {
      const ratio = Math.max(t1, t2) / Math.min(t1, t2);
      if (ratio >= 2.5) score += 30;
      else if (ratio >= 1.8) score += 15;
      else if (ratio >= 1.3) score += 5;
    }

    // Critère 3: Pas de match nul possible (tennis, volleyball, table tennis)
    if (!draw) score += 20;

    // Critère 4: Cote gagnante dans la plage idéale du sport
    const minCote = sportConfig.odds_range?.min || 1.3;
    const maxCote = sportConfig.odds_range?.max || 3.0;
    const bestOdd = t1 <= t2 ? t1 : t2;
    if (bestOdd >= minCote && bestOdd <= maxCote) score += 10;

    return Math.min(score, 100); // Cap à 100
  }

  // ============================================================
  // FETCH TOUS LES SPORTS DEMANDÉS
  // ============================================================
  async fetchAllSports(sportKeys = null) {
    await this.init();

    const sportsToFetch = sportKeys || Object.keys(SPORTS_CONFIG);
    const allMatches = [];

    for (const sportKey of sportsToFetch) {
      const sport = SPORTS_CONFIG[sportKey];
      if (!sport) {
        console.warn(`⚠️ Sport inconnu: ${sportKey}`);
        continue;
      }

      console.log(`\n${sport.emoji} Récupération: ${sport.name.toUpperCase()}`);

      const ok = await this.navigateTo(sport.url, sport.name);
      if (!ok) {
        console.warn(`   ⚠️ Impossible de charger ${sport.name}, on continue...`);
        continue;
      }

      const matches = await this.extractMatches(sportKey);
      console.log(`   📊 ${matches.length} matchs trouvés`);

      this.results[sportKey] = {
        sport_name: sport.name,
        emoji: sport.emoji,
        difficulty: sport.difficulty,
        tips: sport.tips,
        count: matches.length,
        matches
      };

      allMatches.push(...matches);
    }

    return allMatches;
  }

  // ============================================================
  // SÉLECTION INTELLIGENTE DES MEILLEURS MATCHS MULTI-SPORT
  // Retourne les N meilleurs matchs triés par confiance
  // ============================================================
  selectBestMatches(allMatches, count = 4) {
    // Trier par score de confiance (décroissant)
    const sorted = [...allMatches]
      .filter(m => m.confidence_score > 0)
      .sort((a, b) => {
        // 1. Priorité au score de confiance
        if (b.confidence_score !== a.confidence_score) {
          return b.confidence_score - a.confidence_score;
        }
        // 2. Priorité aux sports plus faciles
        const diffA = SPORTS_CONFIG[a.sport]?.difficulty || 5;
        const diffB = SPORTS_CONFIG[b.sport]?.difficulty || 5;
        return diffA - diffB;
      });

    // Éviter de mettre trop de matchs du même sport
    const selected = [];
    const sportCount = {};

    for (const match of sorted) {
      const currentCount = sportCount[match.sport] || 0;
      const maxPerSport = Math.ceil(count / 2); // Max 50% d'un même sport

      if (currentCount < maxPerSport) {
        selected.push(match);
        sportCount[match.sport] = currentCount + 1;
        if (selected.length >= count) break;
      }
    }

    // Si pas assez avec la limite par sport, compléter sans limite
    if (selected.length < count) {
      for (const match of sorted) {
        if (!selected.find(s => s.match_id === match.match_id)) {
          selected.push(match);
          if (selected.length >= count) break;
        }
      }
    }

    return selected;
  }

  // ============================================================
  // SAUVEGARDE
  // ============================================================
  saveResults(allMatches, outputPath = null) {
    const defaultPath = path.join(__dirname, '..', 'data', 'multi_sport_matches.json');
    const filePath = outputPath || defaultPath;

    // Créer le dossier data si nécessaire
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const bestMatches = this.selectBestMatches(allMatches, 4);

    const data = {
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      total_matches: allMatches.length,
      sports_summary: Object.fromEntries(
        Object.entries(this.results).map(([k, v]) => [k, {
          name: v.sport_name,
          count: v.count,
          emoji: v.emoji
        }])
      ),
      best_coupon_selection: bestMatches.map(m => ({
        sport: m.sport_name,
        team1: m.team1,
        team2: m.team2,
        league: m.league,
        date: m.date,
        odds: m.odds,
        confidence: m.confidence_score,
        match_url: m.match_url
      })),
      all_matches: allMatches
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n📁 Résultats sauvegardés: ${filePath}`);

    // Afficher le coupon suggéré
    console.log('\n🎯 MEILLEURE SÉLECTION POUR LE COUPON:');
    console.log('━'.repeat(60));
    bestMatches.forEach((m, i) => {
      const bestOdd = m.odds.team1 <= (m.odds.team2 || 99) ? m.odds.team1 : m.odds.team2;
      const winner = m.odds.team1 <= (m.odds.team2 || 99) ? m.team1 : m.team2;
      console.log(`${i + 1}. [${m.sport_name}] ${m.team1} vs ${m.team2}`);
      console.log(`   → ${winner} @ ${bestOdd} | Confiance: ${m.confidence_score}/100`);
    });

    const totalOdds = bestMatches.reduce((acc, m) => {
      const bestOdd = m.odds.team1 <= (m.odds.team2 || 99) ? m.odds.team1 : m.odds.team2;
      return acc * (bestOdd || 1);
    }, 1);
    console.log('━'.repeat(60));
    console.log(`   Cote totale estimée: ${totalOdds.toFixed(2)}`);

    return filePath;
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ============================================================
// CLI
// ============================================================
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parser les arguments --sports tennis,basketball
  let sportsArg = null;
  const sportsIdx = args.indexOf('--sports');
  if (sportsIdx !== -1 && args[sportsIdx + 1]) {
    sportsArg = args[sportsIdx + 1].split(',').map(s => s.trim());
  }

  // Par défaut: sports les plus rentables
  const defaultSports = ['tennis', 'volleyball', 'basketball', 'football'];
  const sportsToRun = sportsArg || defaultSports;

  console.log('🚀 KOUDY PARIS — Multi-Sport Scraper');
  console.log(`📋 Sports sélectionnés: ${sportsToRun.join(', ')}`);
  console.log('');

  const scraper = new MultiSportScraper({ headless: true });

  scraper.fetchAllSports(sportsToRun)
    .then(allMatches => {
      console.log(`\n✅ Total: ${allMatches.length} matchs récupérés`);
      scraper.saveResults(allMatches);
    })
    .catch(err => {
      console.error('💥 Erreur fatale:', err.message);
      process.exit(1);
    })
    .finally(() => scraper.close());
}

module.exports = { MultiSportScraper, SPORTS_CONFIG };
