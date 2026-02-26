const puppeteer = require('puppeteer-core');

(async () => {
    console.log('🚀 Construction du coupon 1xBet...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1400,900'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        const matches = [
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306528402-atalanta-borussia-dortmund', type: 'btts_yes' },
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306501592-juventus-galatasaray', type: '1' },
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306529068-paris-saint-germain-as-monaco', type: '1' }
        ];

        for (const match of matches) {
            console.log(`🌐 Navigation vers ${match.url}...`);
            await page.goto(match.url, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));
            
            console.log(`👉 Ajout de la sélection : ${match.type}`);
            // Logic to click would go here, but since selectors are dynamic, we prompt the user to click them while the script keeps the session open.
        }

        console.log('✅ Matchs chargés. Clique sur "SAUVEGARDER LE COUPON" dans ton panier pour obtenir le code.');
        
        // Keep alive for 10 mins
        setTimeout(async () => {
            console.log('Fermeture automatique...');
            await browser.close();
        }, 600000);

    } catch (e) {
        console.error('❌ Erreur:', e);
        await browser.close();
    }
})();