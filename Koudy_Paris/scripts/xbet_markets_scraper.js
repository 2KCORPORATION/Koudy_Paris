/**
 * XBet Markets Scraper
 * 
 * Récupère les marchés de paris depuis la page de détail d'un match 1xBet.
 * Marchés ciblés: 1X2, BTTS (Both Teams To Score), Double Chance, Over/Under 2.5
 * 
 * Usage:
 *   const scraper = new XBetMarketsScraper(browserPath);
 *   const markets = await scraper.fetchMatchMarkets(matchUrl);
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

class XBetMarketsScraper {
    constructor(browserPath) {
        this.browserPath = browserPath || '/usr/bin/google-chrome';
        this.browser = null;
        this.page = null;
    }

    async init() {
        if (this.browser) return;

        console.log('🔄 Initialisation du scraper de marchés...');
        this.browser = await puppeteer.launch({
            executablePath: this.browserPath,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Récupère les marchés d'un match depuis sa page de détail
     * @param {string} matchUrl - URL de la page du match
     * @param {Object} matchInfo - Infos du match (home_team, away_team) pour nommer le fichier
     * @returns {Object} - Marchés extraits avec cotes
     */
    async fetchMatchMarkets(matchUrl, matchInfo = null) {
        await this.init();

        return new Promise(async (resolve, reject) => {
            let gameZipData = null;
            const timeout = setTimeout(() => {
                if (!gameZipData) {
                    console.log('⏳ Timeout: GetGameZip non intercepté');
                    resolve(null);
                }
            }, 15000);

            // Intercepter la réponse API GetGameZip
            let intercepted = false;
            this.page.on('response', async (res) => {
                const url = res.url();
                if (!url.includes('/service-api/LineFeed/GetGameZip')) return;
                // Ignorer les données live
                if (url.includes('isLive=true')) return;

                try {
                    const json = await res.json();
                    if (json?.Success && !intercepted) {
                        intercepted = true;
                        console.log('   ✅ GetGameZip intercepté');
                        gameZipData = json;

                        // Sauvegarder le GetGameZip complet pour placement
                        if (matchInfo) {
                            this.saveDetailedGameZip(json, matchInfo);
                        }

                        clearTimeout(timeout);
                        const markets = this.parseMarkets(json);
                        resolve(markets);
                    }
                } catch (e) {
                    // Ignorer les erreurs de parsing
                }
            });

            try {
                console.log(`🌐 Navigation vers: ${matchUrl}`);
                await this.page.goto(matchUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Attendre le chargement des marchés
                await new Promise(r => setTimeout(r, 8000));

            } catch (error) {
                console.error('❌ Erreur navigation:', error.message);
                clearTimeout(timeout);
                resolve(null);
            }
        });
    }

    /**
     * Sauvegarde le GetGameZip complet avec toutes les infos de placement
     * Fichier: data/GetGameZip/{date}/{home}_vs_{away}_zip.json
     */
    saveDetailedGameZip(gameZipData, matchInfo) {
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const dirPath = path.join(__dirname, '../../data/GetGameZip', dateStr);

            // Créer le répertoire si nécessaire
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            // Nom du fichier basé sur les équipes
            const homeName = (matchInfo.home_team || 'home').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const awayName = (matchInfo.away_team || 'away').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const filename = `${homeName}_vs_${awayName}_zip.json`;
            const filePath = path.join(dirPath, filename);

            // Extraire les données détaillées pour le placement
            const detailedData = this.extractDetailedSelections(gameZipData, matchInfo);

            fs.writeFileSync(filePath, JSON.stringify(detailedData, null, 2));
            console.log(`   📁 GetGameZip sauvegardé: ${filename}`);
        } catch (e) {
            console.error('   ⚠️ Erreur sauvegarde GetGameZip:', e.message);
        }
    }

    /**
     * Extrait toutes les sélections avec leurs infos complètes pour le placement
     */
    extractDetailedSelections(gameZipData, matchInfo) {
        const value = gameZipData?.Value || {};
        const gameEvents = value.GE || [];

        const result = {
            match: {
                home_team: matchInfo.home_team,
                away_team: matchInfo.away_team,
                permanentId: value.I || null,
                gameId: value.CI || null,
                start_time: value.S ? new Date(value.S * 1000).toISOString() : null,
                league: value.L || value.LN || null
            },
            selections: {}
        };

        // Mapping des groupIds vers noms lisibles
        const groupNames = {
            1: '1X2',
            2: 'Handicap',
            8: 'Double Chance',
            10: 'Draw No Bet',
            17: 'Over/Under',
            19: 'BTTS',
            62: 'Asian Handicap',
            63: 'Asian Over/Under',
            225: 'Corners',
            238: 'Total Corners',
            239: 'Asian Corners'
        };

        for (const group of gameEvents) {
            const groupId = group.G;
            const groupName = groupNames[groupId] || `Group_${groupId}`;
            const events = (group.E || []).flat(2).filter(Boolean);

            if (!result.selections[groupName]) {
                result.selections[groupName] = {
                    groupId: groupId,
                    bets: []
                };
            }

            for (const e of events) {
                // Filtrer les paris bloqués (e.L = isLocked) - on n'en a pas besoin
                if (e.L === true) continue;

                // Filtrer les paris live si présents (on travaille en pré-match)
                if (e.LV === true) continue;

                result.selections[groupName].bets.push({
                    // Infos pour le placement
                    id: e.I || null,
                    gameId: value.CI || null,
                    permanentId: value.I || null,
                    typeId: e.T || null,
                    groupId: groupId,

                    // Infos du pari
                    coef: e.C || null,
                    param: e.P !== undefined ? e.P : null,
                    name: e.N || e.B || this.getSelectionName(groupId, e.T, e.P),

                    // Métadonnées - déjà filtré donc toujours false
                    isLive: false,
                    isLocked: false
                });
            }
        }

        // Filtrer pour ne garder que les paris populaires
        return this.filterPopularBets(result);
    }

    /**
     * Filtre les paris pour ne garder que les plus populaires
     * Réduit la complexité pour l'IA et évite les paris inexistants
     */
    filterPopularBets(data) {
        const filtered = { match: data.match, selections: {} };

        // Sélectionne le meilleur pari par cote (1.5-3, fallback ≥1.3)
        const selectBestBet = (bets) => {
            if (!bets || bets.length === 0) return null;
            let eligible = bets.filter(b => b.coef >= 1.5 && b.coef <= 3);
            if (eligible.length === 0) {
                eligible = bets.filter(b => b.coef >= 1.3);
            }
            if (eligible.length === 0) return null;
            return eligible[Math.floor(Math.random() * eligible.length)];
        };

        // Sélection AOU: param fixe [2.25, 2.75, 2.5, 1.75, 3.25]
        const selectAOUBets = (bets) => {
            if (!bets || bets.length === 0) return [];
            const overBets = bets.filter(b => b.typeId === 3827 || b.typeId === 9);
            const underBets = bets.filter(b => b.typeId === 3828 || b.typeId === 10);

            const preferredParams = [2.25, 2.75, 2.5, 1.75, 3.25];
            for (const targetParam of preferredParams) {
                const over = overBets.find(b => b.param === targetParam);
                const under = underBets.find(b => b.param === targetParam);
                if (over && under) return [over, under];
            }
            return [];
        };

        // Sélection AH: param fixe [0, 0.5, -0.5, 0.25, -0.25]
        const selectAHBets = (bets, groupId) => {
            if (!bets || bets.length === 0) return [];
            const homeTypeIds = [13, 3829, 1];
            const awayTypeIds = [14, 3830, 3];
            const homeBets = bets.filter(b => homeTypeIds.includes(b.typeId));
            const awayBets = bets.filter(b => awayTypeIds.includes(b.typeId));

            const preferredParams = [0, 0.5, -0.5, 0.25, -0.25];
            for (const targetParam of preferredParams) {
                const home = homeBets.find(b => b.param === targetParam);
                const away = awayBets.find(b => b.param === targetParam);
                if (home && away) return [home, away];
            }
            return [];
        };

        const filterRules = {
            '1X2': { keep: 'all' },
            'Double Chance': { keep: 'all' },
            'BTTS': { keep: 'all' },
            'Draw No Bet': { keep: 'all' },
            'Over/Under': { keep: 'all' },
            'Asian Over/Under': { type: 'aou' },
            'Group_99': { type: 'aou' },
            'Asian Handicap': { type: 'ah' },
            'Group_62': { type: 'ah' },
            'Group_2854': { type: 'ah' }
        };

        for (const [groupName, groupData] of Object.entries(data.selections)) {
            const rule = filterRules[groupName];

            if (!rule) {
                filtered.selections[groupName] = groupData;
                continue;
            }

            if (rule.keep === 'all') {
                filtered.selections[groupName] = groupData;
            } else if (rule.type === 'aou') {
                const selectedBets = selectAOUBets(groupData.bets);
                if (selectedBets.length > 0) {
                    filtered.selections[groupName] = {
                        groupId: groupData.groupId,
                        bets: selectedBets
                    };
                }
            } else if (rule.type === 'ah') {
                const selectedBets = selectAHBets(groupData.bets, groupData.groupId);
                if (selectedBets.length > 0) {
                    filtered.selections[groupName] = {
                        groupId: groupData.groupId,
                        bets: selectedBets
                    };
                }
            }
        }

        return filtered;
    }

    /**
     * Génère un nom lisible pour une sélection
     */
    getSelectionName(groupId, typeId, param) {
        const names = {
            1: { 1: 'Home', 2: 'Draw', 3: 'Away' },
            8: { 4: '1X', 5: '12', 6: 'X2' },
            10: { 1: 'Home', 3: 'Away' },
            19: { 180: 'Yes', 181: 'No' }
        };

        if (names[groupId] && names[groupId][typeId]) {
            return names[groupId][typeId];
        }

        // Pour handicap/O-U
        if (typeId === 9) return `Over ${param}`;
        if (typeId === 10) return `Under ${param}`;
        if (typeId === 1) return `Home ${param >= 0 ? '+' : ''}${param}`;
        if (typeId === 3) return `Away ${param >= 0 ? '+' : ''}${param}`;

        return `T${typeId}_P${param}`;
    }

    /**
     * Parse les marchés depuis la réponse GetGameZip
     * Structure 1xBet:
     * - G=1: 1X2 (T: 1=Home, 2=Draw, 3=Away)
     * - G=8: Double Chance (T: 4=1X, 5=12, 6=X2)
     * - G=19: BTTS Both Teams To Score (T: 180=Yes, 181=No)
     * - G=17: Over/Under avec P=valeur (ex: P=2.5)
     * @param {Object} gameZipData - Données brutes de l'API
     * @returns {Object} - Marchés structurés
     */
    parseMarkets(gameZipData) {
        const markets = {
            match_winner: null,      // 1X2
            btts: null,              // Both Teams To Score
            double_chance: null,     // Double Chance (1X, 12, X2)
            over_under_25: null,     // Over/Under 2.5 goals
            // Nouveaux marchés protecteurs
            draw_no_bet: null,       // DNB (remboursé si nul)
            asian_handicap: null,    // AH 0, +0.25, -0.5, +1...
            asian_over_under: null,  // Over/Under asiatique
            corners: null,           // Total Corners
            raw_markets_count: 0,
            all_groups: []           // Pour debug
        };

        try {
            const value = gameZipData?.Value;
            if (!value) return markets;

            const gameEvents = value.GE || [];
            markets.raw_markets_count = gameEvents.length;

            for (const group of gameEvents) {
                const groupId = group.G;
                const events = group.E || [];
                markets.all_groups.push(groupId);

                // Aplatir les événements ET filtrer ceux qui sont bloqués (e.L) ou live (e.LV)
                const flatEvents = events.flat(2).filter(e => e && e.L !== true && e.LV !== true);

                // === 1X2 (Group ID: 1) ===
                // T: 1=Home (1), 2=Draw (X), 3=Away (2)
                if (groupId === 1) {
                    markets.match_winner = {};
                    for (const e of flatEvents) {
                        if (e.T === 1) markets.match_winner['1'] = e.C;
                        if (e.T === 2) markets.match_winner['X'] = e.C;
                        if (e.T === 3) markets.match_winner['2'] = e.C;
                    }
                }

                // === Double Chance (Group ID: 8) ===
                // T: 4=1X, 5=12, 6=X2
                if (groupId === 8) {
                    markets.double_chance = {};
                    for (const e of flatEvents) {
                        if (e.T === 4) markets.double_chance['1X'] = e.C;
                        if (e.T === 5) markets.double_chance['12'] = e.C;
                        if (e.T === 6) markets.double_chance['X2'] = e.C;
                    }
                }

                // === BTTS Both Teams To Score (Group ID: 19) ===
                // T: 180=Yes, 181=No
                if (groupId === 19) {
                    markets.btts = {};
                    for (const e of flatEvents) {
                        if (e.T === 180) markets.btts['Oui'] = e.C;
                        if (e.T === 181) markets.btts['Non'] = e.C;
                    }
                }

                // === Over/Under (Group ID: 17) ===
                // Chercher P=2.5
                if (groupId === 17) {
                    const ou25Events = flatEvents.filter(e =>
                        e.P === 2.5 || e.P === '2.5' || String(e.P) === '2.5'
                    );
                    if (ou25Events.length > 0) {
                        markets.over_under_25 = {};
                        for (const e of ou25Events) {
                            // T: 9=Over, 10=Under (typique)
                            if (e.T === 9 || e.T === 180) markets.over_under_25['Over'] = e.C;
                            if (e.T === 10 || e.T === 181) markets.over_under_25['Under'] = e.C;
                        }
                    }
                }

                // === Draw No Bet (Group ID: 100) ===
                // DNB - remboursé si match nul
                if (groupId === 100 || groupId === 10) {
                    markets.draw_no_bet = {};
                    for (const e of flatEvents) {
                        if (e.T === 794) markets.draw_no_bet['1'] = e.C;  // Home wins
                        if (e.T === 795) markets.draw_no_bet['2'] = e.C;  // Away wins
                        // Fallback anciennes IDs
                        if (e.T === 1) markets.draw_no_bet['1'] = e.C;
                        if (e.T === 3) markets.draw_no_bet['2'] = e.C;
                    }
                }

                // === Asian Handicap ===
                // PARAM FIXE: 0 (le plus populaire), fallback 0.5
                if (groupId === 2854 || groupId === 62 || groupId === 2) {
                    const homeBets = [];
                    const awayBets = [];

                    for (const e of flatEvents) {
                        if (e.C && e.P !== undefined) {
                            if (e.T === 13 || e.T === 3829 || e.T === 1) {
                                homeBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                            if (e.T === 14 || e.T === 3830 || e.T === 3) {
                                awayBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                        }
                    }

                    // Params fixes à chercher dans l'ordre de priorité
                    const preferredParams = [0, 0.5, -0.5, 0.25, -0.25];

                    for (const targetParam of preferredParams) {
                        const home = homeBets.find(b => b.param === targetParam);
                        const away = awayBets.find(b => b.param === targetParam);

                        if (home && away) {
                            markets.asian_handicap = {};
                            markets.asian_handicap[`home_${targetParam >= 0 ? '+' : ''}${targetParam}`] = home.coef;
                            markets.asian_handicap[`away_${targetParam >= 0 ? '+' : ''}${targetParam}`] = away.coef;
                            break; // Premier trouvé = on arrête
                        }
                    }
                }

                // === Asian Over/Under (Group ID: 99) ===
                // PARAM FIXE: 2.25 (le plus courant), fallback 2.75, 2.5
                if (groupId === 99 || groupId === 63) {
                    const overBets = [];
                    const underBets = [];

                    for (const e of flatEvents) {
                        if (e.C && e.P !== undefined) {
                            if (e.T === 3827 || e.T === 9) {
                                overBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                            if (e.T === 3828 || e.T === 10) {
                                underBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                        }
                    }

                    // Params fixes à chercher dans l'ordre de priorité
                    const preferredParams = [2.25, 2.75, 2.5, 1.75, 3.25];

                    for (const targetParam of preferredParams) {
                        const over = overBets.find(b => b.param === targetParam);
                        const under = underBets.find(b => b.param === targetParam);

                        if (over && under) {
                            markets.asian_over_under = {};
                            markets.asian_over_under[`over_${targetParam}`] = over.coef;
                            markets.asian_over_under[`under_${targetParam}`] = under.coef;
                            break; // Premier trouvé = on arrête
                        }
                    }
                }

                // === Asian Corners (Group ID: 238, 239 ou 225) ===
                // PARAM FIXE: 9.5 (le plus courant), fallback 10.5, 8.5
                if (groupId === 238 || groupId === 239 || groupId === 225) {
                    const overBets = [];
                    const underBets = [];

                    for (const e of flatEvents) {
                        if (e.C && e.P !== undefined) {
                            // TypeIds: 9=Over, 10=Under (typique pour corners)
                            if (e.T === 9 || e.T === 3827) {
                                overBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                            if (e.T === 10 || e.T === 3828) {
                                underBets.push({ param: e.P, coef: e.C, typeId: e.T });
                            }
                        }
                    }

                    // Params fixes à chercher dans l'ordre de priorité
                    const preferredParams = [9.5, 10.5, 8.5, 9.25, 10.25, 9.75, 10.75];

                    for (const targetParam of preferredParams) {
                        const over = overBets.find(b => b.param === targetParam);
                        const under = underBets.find(b => b.param === targetParam);

                        if (over && under) {
                            markets.asian_corners = {};
                            markets.asian_corners[`over_${targetParam}`] = over.coef;
                            markets.asian_corners[`under_${targetParam}`] = under.coef;
                            break; // Premier trouvé = on arrête
                        }
                    }
                }

                // === Équipe Asiatique Total (Group ID: 8427, 8429) ===
                // Total de buts par équipe - PARAM FIXE: 0.75 ou 1.25
                // Group 8427 (Équipe 1): TypeIds 7778=Over, 7779=Under
                // Group 8429 (Équipe 2): TypeIds 7780=Over, 7781=Under
                if (groupId === 8427 || groupId === 8429) {
                    const overBets = [];
                    const underBets = [];

                    // TypeIds différents selon le groupe
                    const overTypeId = groupId === 8427 ? 7778 : 7780;
                    const underTypeId = groupId === 8427 ? 7779 : 7781;

                    for (const e of flatEvents) {
                        if (e.C && e.P !== undefined) {
                            if (e.T === overTypeId) overBets.push({ param: e.P, coef: e.C });
                            if (e.T === underTypeId) underBets.push({ param: e.P, coef: e.C });
                        }
                    }

                    // Params fixes à chercher
                    const preferredParams = [0.75, 1.25, 0.5, 1.5, 1.75];

                    for (const targetParam of preferredParams) {
                        const over = overBets.find(b => b.param === targetParam);
                        const under = underBets.find(b => b.param === targetParam);

                        if (over && under) {
                            // Identifier l'équipe par le groupId
                            const teamKey = groupId === 8427 ? 'team1' : 'team2';
                            if (!markets.asian_team_total) markets.asian_team_total = {};
                            markets.asian_team_total[`${teamKey}_over_${targetParam}`] = over.coef;
                            markets.asian_team_total[`${teamKey}_under_${targetParam}`] = under.coef;
                            break;
                        }
                    }
                }

                // === Comment le 1er but sera marqué (Group ID: 104) ===
                // TypeId 818 = Tir (le plus protecteur/probable)
                if (groupId === 104) {
                    const tirBet = flatEvents.find(e => e.T === 818 && e.P === 1);
                    if (tirBet && tirBet.C) {
                        markets.first_goal_method = {};
                        markets.first_goal_method['tir'] = tirBet.C;
                    }
                }
            }

            // Nettoyer les objets vides
            if (markets.match_winner && Object.keys(markets.match_winner).length === 0) {
                markets.match_winner = null;
            }
            if (markets.double_chance && Object.keys(markets.double_chance).length === 0) {
                markets.double_chance = null;
            }
            if (markets.btts && Object.keys(markets.btts).length === 0) {
                markets.btts = null;
            }
            if (markets.over_under_25 && Object.keys(markets.over_under_25).length === 0) {
                markets.over_under_25 = null;
            }
            if (markets.draw_no_bet && Object.keys(markets.draw_no_bet).length === 0) {
                markets.draw_no_bet = null;
            }
            if (markets.asian_handicap && Object.keys(markets.asian_handicap).length === 0) {
                markets.asian_handicap = null;
            }
            if (markets.asian_over_under && Object.keys(markets.asian_over_under).length === 0) {
                markets.asian_over_under = null;
            }
            if (markets.corners && Object.keys(markets.corners).length === 0) {
                markets.corners = null;
            }

        } catch (error) {
            console.error('❌ Erreur parsing marchés:', error.message);
        }

        return markets;
    }
}

// === TEST CLI ===
if (require.main === module) {
    const matchUrl = process.argv[2] || 'https://1xlite-96866.pro/fr/line/football/119237-england-league-cup/290864063-cardiff-city-chelsea';

    (async () => {
        const scraper = new XBetMarketsScraper('/usr/bin/google-chrome');

        console.log('🎯 Test du scraper de marchés...');
        console.log(`📌 URL: ${matchUrl}\n`);

        const markets = await scraper.fetchMatchMarkets(matchUrl, true);

        if (markets) {
            console.log('\n📊 MARCHÉS EXTRAITS:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('1X2:', markets.match_winner);
            console.log('Double Chance:', markets.double_chance);
            console.log('BTTS:', markets.btts);
            console.log('Over/Under 2.5:', markets.over_under_25);
            console.log('Groupes trouvés:', markets.all_groups);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Total groupes de marchés: ${markets.raw_markets_count}`);
        } else {
            console.log('❌ Aucun marché récupéré');
        }

        await scraper.close();
    })();
}

module.exports = XBetMarketsScraper;
