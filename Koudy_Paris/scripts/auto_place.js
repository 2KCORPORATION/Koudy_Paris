const puppeteer = require('puppeteer-core');

(async () => {
    console.log('🚀 Automatisation complète: Connexion et Placement...');
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('🌐 Ouverture de 1xBet...');
        await page.goto('https://1xlite-96866.pro/fr', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('🔑 Tentative de connexion...');
        await page.waitForSelector('.login-btn, .top-login__btn', { timeout: 10000 }).catch(() => console.log('Login button not found initially.'));
        const loginBtn = await page.$('.login-btn, .top-login__btn');
        if (loginBtn) {
            await loginBtn.click();
            await new Promise(r => setTimeout(r, 2000));
            
            await page.type('input[type="text"][name="username"], input[type="text"][id="auth-id"]', '1551336487');
            await page.type('input[type="password"]', 'AU5fvxbC');
            
            await page.keyboard.press('Enter');
            console.log('⏳ Attente de la connexion (10s)...');
            await new Promise(r => setTimeout(r, 10000));
        } else {
            console.log('⚠️ Déjà connecté ou bouton non trouvé.');
        }

        const matches = [
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306528402-atalanta-borussia-dortmund' },
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306501592-juventus-galatasaray' },
            { url: 'https://1xlite-96866.pro/fr/line/football/118587-uefa-champions-league/306529068-paris-saint-germain-as-monaco' }
        ];

        for (const match of matches) {
            console.log(`🌐 Navigation vers le match...`);
            await page.goto(match.url, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));
            
            console.log(`👉 Ajout de la sélection (clic sur la première cote principale 1X2 ou similaire)...`);
            try {
                const oddButtons = await page.$$('.bet_type');
                if (oddButtons.length > 0) {
                    await oddButtons[0].click();
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (e) {
                console.log('Erreur clic cote:', e.message);
            }
        }

        console.log('✅ Matchs chargés dans le coupon.');
        console.log('⚠️ L action de SAUVEGARDE du coupon requiert de cliquer sur "Enregistrer le coupon" dans le panneau latéral.');
        
        try {
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text && (text.includes('Sauvegarder') || text.includes('Enregistrer') || text.includes('Save'))) {
                    await btn.click();
                    console.log('💾 Clic sur Sauvegarder le coupon.');
                    await new Promise(r => setTimeout(r, 3000));
                    break;
                }
            }
        } catch (e) {
            console.log('Erreur sauvegarde coupon:', e.message);
        }

        console.log('Browser left open for 5 minutes. Check the window.');
        await new Promise(r => setTimeout(r, 300000));
        await browser.close();

    } catch (e) {
        console.error('❌ Erreur:', e);
        await browser.close();
    }
})();
