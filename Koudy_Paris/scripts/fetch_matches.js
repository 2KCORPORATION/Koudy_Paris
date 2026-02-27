const puppeteer = require('puppeteer-core');

class XBetScraper {
    constructor(browserPath) {
        this.browserPath = browserPath || '/usr/bin/google-chrome';
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://1xlite-96866.pro';
    }

    async init() {
        if (this.browser) return;

        console.log('🔄 Initialisation du scraper 1xBet (headless)...');
        this.browser = await puppeteer.launch({
            executablePath: this.browserPath,
            headless: true, // Mode headless pour le scraping
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1400,900'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1400, height: 900 });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Navigue vers la section Football de 1xBet avec retry
     */
    async navigateToFootball() {
        const maxRetries = 3;
        const delays = [5000, 10000, 15000]; // Délais exponentiels

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 Navigation vers 1xBet Football... (tentative ${attempt}/${maxRetries})`);

                // Attente avant navigation (sauf première tentative)
                if (attempt > 1) {
                    console.log(`⏳ Attente de ${delays[attempt - 2] / 1000}s avant retry...`);
                    await new Promise(r => setTimeout(r, delays[attempt - 2]));
                }

                await this.page.goto(`${this.baseUrl}/fr/line/football`, {
                    waitUntil: 'networkidle2', // Moins strict que networkidle0
                    timeout: 90000 // 90 secondes
                });

                // Attente supplémentaire pour le chargement complet
                await new Promise(r => setTimeout(r, 3000));

                // Attendre que les matchs soient chargés
                await this.page.waitForSelector('.dashboard-game-block, .c-events__item, .game-block', { timeout: 30000 });
                console.log('✅ Page Football chargée');

                return true;
            } catch (error) {
                console.error(`❌ Erreur navigation Football (tentative ${attempt}):`, error.message);

                if (attempt === maxRetries) {
                    console.error('❌ Toutes les tentatives ont échoué');
                    return false;
                }
            }
        }
        return false;
    }

    /**
     * Extrait la liste des matchs disponibles sur 1xBet
     */
    async extractMatches() {
        try {
            console.log('📋 Extraction des matchs disponibles sur 1xBet (1X2 uniquement)...');

            // Scroll pour charger plus de matchs
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate((y) => {
                    window.scrollTo(0, y);
                }, (i + 1) * 1500);
                await new Promise(r => setTimeout(r, 1000));
            }

            // Extraire les matchs avec 1X2 uniquement
            const matches = await this.page.evaluate(() => {
                const results = [];
                const matchBlocks = document.querySelectorAll('.dashboard-game-block');

                matchBlocks.forEach((block, index) => {
                    try {
                        // Noms des équipes - sélecteurs corrects identifiés via DOM
                        const homeTeamEl = block.querySelector('.dashboard-game-block__link > span > span > span > div:nth-child(1) > div > div > span:nth-child(2)');
                        const awayTeamEl = block.querySelector('.dashboard-game-block__link > span > span > span > div:nth-child(2) > div > div > span:nth-child(2)');

                        let homeTeam = '';
                        let awayTeam = '';

                        if (homeTeamEl && awayTeamEl) {
                            homeTeam = homeTeamEl.textContent.trim();
                            awayTeam = awayTeamEl.textContent.trim();
                        } else {
                            // Fallback: chercher dans des spans imbriqués
                            const allSpans = block.querySelectorAll('.dashboard-game-block__link span');
                            const teamSpans = Array.from(allSpans).filter(s =>
                                s.textContent.trim().length > 2 &&
                                !s.textContent.match(/\d{2}[/:]\d{2}/) &&
                                !s.querySelector('span')
                            );
                            if (teamSpans.length >= 2) {
                                homeTeam = teamSpans[0].textContent.trim();
                                awayTeam = teamSpans[1].textContent.trim();
                            }
                        }

                        // Nettoyage des noms
                        homeTeam = homeTeam.replace(/\d{2}\/\d{2}.*$/g, '').trim();
                        awayTeam = awayTeam.replace(/\d{2}\/\d{2}.*$/g, '').trim();

                        // Date/Heure
                        const dateEl = block.querySelector('.dashboard-game-block__date, .date');
                        const date = dateEl ? dateEl.textContent.trim() : '';

                        // Cotes 1X2
                        const oddButtons = block.querySelectorAll('.ui-market__toggle, .dashboard-game-block__odd');
                        const odds = {};
                        oddButtons.forEach((btn, i) => {
                            const oddText = btn.textContent.trim();
                            const oddValue = oddText.match(/[\d.]+/);
                            if (oddValue && i < 3) {
                                if (i === 0) odds.home = parseFloat(oddValue[0]);
                                if (i === 1) odds.draw = parseFloat(oddValue[0]);
                                if (i === 2) odds.away = parseFloat(oddValue[0]);
                            }
                        });

                        // Ligue (depuis le parent ou le bloc supérieur)
                        let league = 'Unknown';

                        // Méthode 1: Chercher le parent .dashboard-champ-block
                        let champBlock = block.closest('.dashboard-champ-block');
                        if (champBlock) {
                            const leagueEl = champBlock.querySelector('.dashboard-champ-name__caption');
                            if (leagueEl) {
                                league = leagueEl.textContent.trim();
                            }
                        }

                        // Méthode 2: Chercher .dashboard-champ (différente structure possible)
                        if (league === 'Unknown') {
                            let champ = block.closest('.dashboard-champ');
                            if (champ) {
                                const leagueEl = champ.querySelector('.dashboard-champ-name__caption');
                                if (leagueEl) {
                                    league = leagueEl.textContent.trim();
                                }
                            }
                        }

                        // Méthode 3: Remonter les parents jusqu'à trouver la caption
                        if (league === 'Unknown') {
                            let parent = block.parentElement;
                            let depth = 0;
                            while (parent && depth < 10) {
                                const caption = parent.querySelector('.dashboard-champ-name__caption');
                                if (caption) {
                                    league = caption.textContent.trim();
                                    break;
                                }
                                parent = parent.parentElement;
                                depth++;
                            }
                        }


                        // --- MARCHÉS DISPONIBLES ---
                        // 1X2 est le SEUL marché garanti disponible sur tous les matchs
                        // Les autres marchés (BTTS, O/U, Corners) seront récupérés via la page de détail
                        const markets = ['1X2'];

                        // --- URL DU MATCH (pour récupérer les marchés détaillés) ---
                        const linkEl = block.querySelector('a.dashboard-game-block__link');
                        let matchUrl = null;
                        let matchId = null;
                        if (linkEl && linkEl.href) {
                            matchUrl = linkEl.href;
                            // Extraire l'ID du match depuis l'URL
                            // Format: /290864063-cardiff-city-chelsea
                            const idMatch = matchUrl.match(/\/(\d+)-[^\/]+$/);
                            if (idMatch) {
                                matchId = idMatch[1];
                            }
                        }

                        if (homeTeam && awayTeam && homeTeam.length > 2 && awayTeam.length > 2) {
                            results.push({
                                index,
                                home_team: homeTeam,
                                away_team: awayTeam,
                                league,
                                date,
                                odds,
                                match_url: matchUrl,
                                match_id: matchId,
                                available_markets: markets
                            });
                        }
                    } catch (e) {
                        // Ignorer les erreurs individuelles
                    }
                });

                return results;
            });

            console.log(`✅ ${matches.length} matchs extraits de 1xBet`);
            return matches;

        } catch (error) {
            console.error('❌ Erreur extraction matchs:', error.message);
            return [];
        }
    }

    /**
     * Sauvegarde les matchs avec leurs marchés disponibles dans un fichier JSON
     * @param {Array} matches - Liste des matchs extraits
     * @param {string} outputPath - Chemin du fichier de sortie
     */
    async saveMatchesWithMarkets(matches, outputPath = './xbet_matches_with_markets.json') {
        const fs = require('fs');
        const path = require('path');

        // Statistiques sur les marchés
        const stats = {
            matches_with_1x2_only: 0,
            matches_with_multiple_markets: 0,
            total_markets: 0,
            market_types: {}
        };

        matches.forEach(m => {
            const markets = m.available_markets || ['1X2'];
            if (markets.length === 1 && markets[0] === '1X2') {
                stats.matches_with_1x2_only++;
            } else {
                stats.matches_with_multiple_markets++;
            }
            stats.total_markets += markets.length;

            // Compter chaque type de marché
            markets.forEach(market => {
                stats.market_types[market] = (stats.market_types[market] || 0) + 1;
            });
        });

        const avgMarketsPerMatch = matches.length > 0 ? (stats.total_markets / matches.length).toFixed(2) : 0;

        const data = {
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            total_matches: matches.length,
            statistics: {
                matches_with_1x2_only: stats.matches_with_1x2_only,
                matches_with_multiple_markets: stats.matches_with_multiple_markets,
                avg_markets_per_match: parseFloat(avgMarketsPerMatch),
                market_types_count: stats.market_types
            },
            matches: matches.map(m => ({
                index: m.index,
                home_team: m.home_team,
                away_team: m.away_team,
                league: m.league,
                date: m.date,
                odds_1x2: m.odds || {},
                match_url: m.match_url || null,
                match_id: m.match_id || null,
                available_markets: m.available_markets || ['1X2'],
                market_count: (m.available_markets || ['1X2']).length
            }))
        };

        const fullPath = path.resolve(outputPath);
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`📁 Marchés sauvegardés: ${fullPath}`);
        console.log(`   📊 ${data.total_matches} matchs | Moyenne: ${avgMarketsPerMatch} marchés/match`);
        console.log(`   ✅ ${stats.matches_with_multiple_markets} matchs avec marchés multiples`);
        console.log(`   ⚠️  ${stats.matches_with_1x2_only} matchs avec 1X2 uniquement`);

        return fullPath;
    }

    /**
     * Récupère tous les matchs disponibles aujourd'hui sur 1xBet
     */
    async fetchAvailableMatches() {
        await this.init();

        const success = await this.navigateToFootball();
        if (!success) {
            return [];
        }

        const matches = await this.extractMatches();

        // Sauvegarder les matchs avec leurs marchés disponibles
        if (matches.length > 0) {
            await this.saveMatchesWithMarkets(matches);
        }

        return matches;
    }

    /**
     * Retourne le browser et la page pour réutilisation 
     * (pour placer les paris après)
     */
    getBrowserAndPage() {
        return { browser: this.browser, page: this.page };
    }
}

module.exports = XBetScraper;

if (require.main === module) {
    (async () => {
        const scraper = new XBetScraper();
        try {
            await scraper.fetchAvailableMatches();
        } catch (error) {
            console.error('Script error:', error);
        } finally {
            await scraper.close();
            process.exit(0);
        }
    })();
}
