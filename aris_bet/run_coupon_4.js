const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

(async () => {
  const env = loadEnv(path.resolve(__dirname, '../.pi/1xbet.env'));
  const username = env.XBET_USERNAME;
  const password = env.XBET_PASSWORD;

  if (!username || !password) {
    console.error('Missing credentials in ../.pi/1xbet.env');
    process.exit(1);
  }

  const matchesFile = path.resolve(__dirname, 'xbet_matches_with_markets.json');
  const data = JSON.parse(fs.readFileSync(matchesFile, 'utf8'));
  const picks = (data.matches || [])
    .filter(m => m.match_url && m.home_team && m.away_team)
    .filter(m => !/paris spéciaux|à domicile|à l'extérieur|home|away/i.test(`${m.home_team} ${m.away_team}`))
    .slice(0, 4);

  if (picks.length < 4) {
    console.error('Not enough matches to build a 4-match coupon');
    process.exit(1);
  }

  console.log('Selected matches:');
  picks.forEach((m, i) => console.log(`${i + 1}. ${m.home_team} vs ${m.away_team}`));

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const base = 'https://1xlite-96866.pro/fr';

  try {
    console.log('Opening 1xBet...');
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 90000 });

    // login
    const loginBtn = await page.$('.login-btn, .top-login__btn, [data-id="login"]');
    if (loginBtn) {
      await loginBtn.click();
      await sleep(1500);
    }

    const userSel = 'input[type="text"][name="username"], input[type="text"][id="auth-id"], input[type="tel"], input[name="login"]';
    const passSel = 'input[type="password"], input[name="password"]';

    const hasPassInput = await page.$(passSel);
    if (hasPassInput) {
      const userInput = await page.$(userSel);
      if (userInput) {
        await userInput.click({ clickCount: 3 });
        await page.keyboard.type(username, { delay: 20 });
      }
      const passInput = await page.$(passSel);
      if (passInput) {
        await passInput.click({ clickCount: 3 });
        await page.keyboard.type(password, { delay: 20 });
      }

      await page.keyboard.press('Enter');
      await sleep(8000);
      console.log('Login attempt done.');
    } else {
      console.log('Login form not found (maybe already logged in / different UI). Continuing...');
    }

    let added = 0;
    for (const m of picks) {
      console.log(`Open match: ${m.home_team} vs ${m.away_team}`);
      await page.goto(m.match_url, { waitUntil: 'networkidle2', timeout: 90000 });
      await sleep(5000);

      const clicked = await page.evaluate(() => {
        const candidateSelectors = [
          '.bet_type',
          '.ui-market__toggle',
          '.dashboard-game-block__odd',
          '[data-type="event"] .coef',
          '.c-bets__bet'
        ];

        const nodes = [];
        for (const sel of candidateSelectors) {
          document.querySelectorAll(sel).forEach(el => nodes.push(el));
        }

        const uniq = Array.from(new Set(nodes));

        // prefer odds >= 1.5 and <= 3.5
        for (const el of uniq) {
          const txt = (el.textContent || '').replace(',', '.');
          const match = txt.match(/\d+(?:\.\d+)?/);
          if (!match) continue;
          const odd = parseFloat(match[0]);
          if (odd >= 1.5 && odd <= 3.5) {
            el.click();
            return { ok: true, odd, text: txt.trim().slice(0, 60) };
          }
        }
        return { ok: false };
      });

      if (clicked.ok) {
        added++;
        console.log(`  Added odd ${clicked.odd}`);
        await sleep(1500);
      } else {
        console.log('  No valid odd found >=1.5');
      }

      if (added >= 4) break;
    }

    if (added < 4) {
      throw new Error(`Only ${added} selections added`);
    }

    console.log('Trying to save coupon...');
    await sleep(2000);

    // try opening coupon area and save
    const saveInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, div, span'));
      const targets = buttons.filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return t.includes('sauveg') || t.includes('enregistrer') || t.includes('save') || t.includes('coupon');
      });

      for (const el of targets) {
        try {
          el.click();
        } catch (_) {}
      }

      const bodyText = document.body ? document.body.innerText : '';
      const codeMatch = bodyText.match(/(?:code\s*(?:coupon)?\s*[:#-]?\s*)([A-Z0-9]{6,12})/i)
        || bodyText.match(/\b[A-Z0-9]{8,12}\b/);

      return {
        clicked: targets.length,
        code: codeMatch ? codeMatch[1] || codeMatch[0] : null,
        snippet: bodyText.slice(0, 2000)
      };
    });

    await sleep(4000);

    const secondTry = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText : '';
      const codeMatch = bodyText.match(/(?:code\s*(?:coupon)?\s*[:#-]?\s*)([A-Z0-9]{6,12})/i)
        || bodyText.match(/\b[A-Z0-9]{8,12}\b/);
      return codeMatch ? (codeMatch[1] || codeMatch[0]) : null;
    });

    const couponCode = secondTry || saveInfo.code || null;

    const out = {
      timestamp: new Date().toISOString(),
      added,
      matches: picks.map(p => ({ home: p.home_team, away: p.away_team, url: p.match_url })),
      couponCode,
      saveClickedCandidates: saveInfo.clicked
    };

    fs.writeFileSync(path.resolve(__dirname, 'last_coupon_result.json'), JSON.stringify(out, null, 2));

    if (!couponCode) {
      console.log('Coupon code not detected automatically.');
      console.log('Saved diagnostic to last_coupon_result.json');
      process.exitCode = 2;
    } else {
      console.log('COUPON_CODE=' + couponCode);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
