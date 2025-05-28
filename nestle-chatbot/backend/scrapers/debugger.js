const sleepMs = ms => new Promise(res => setTimeout(res, ms));

export async function scrapeAllBrandCategories(page, brand) {
    // 1) Stealth‐style headers (in case CF is still in play)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/120.0.0.0 Safari/537.36'
    );

    // 2) Navigate
    try {
        await page.goto(brand.brandUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
        console.error('⛔ Navigation failed:', brand.brandUrl, e.message);
        return { ...brand, products: [] };
    }

    // 3) Scroll to load infinite items
    await page.evaluate(async () => {
        let total = 0, dist = 400;
        while (total < document.body.scrollHeight) {
            window.scrollBy(0, dist);
            total += dist;
            await new Promise(r => setTimeout(r, 200));
        }
    });
    sleepMs(1000)

    // 4) Debug dump
    const wrapperExists = await page.$('.coh-view-contents') !== null;
    console.log(`🔍 [${brand.brandName}] .coh-view-contents exists?`, wrapperExists);
    if (wrapperExists) {
        const html = await page.$eval('.coh-view-contents', el => el.innerHTML.slice(0, 500));
        console.log(`--- .coh-view-contents HTML snippet ---\n${html}\n--- end snippet ---`);
    } else {
        console.log('⚠️ .coh-view-contents not found on', brand.brandUrl);
    }

    // 5) Attempt to extract cards
    const products = await page.$$eval(
        '.coh-view-contents .coh-column.product-column',
        cards => cards.map(card => {
            const highlight = card.querySelector('.product-highlight-label')?.textContent.trim() || null;
            const a = card.querySelector('a');
            const name = a?.textContent.trim() || null;
            const link = a?.href || null;
            const size = card.querySelector('.views-field-field-size .field__item')?.textContent.trim() || null;
            const img = card.querySelector('img');
            const src = img?.getAttribute('src') || '';
            const image = img
                ? (img.src.startsWith('http') ? img.src : `${window.location.origin}${src}`)
                : null;
            return name && link ? { highlight, name, link, size, image } : null;
        }).filter(Boolean)
    );

    console.log(`🛒 [${brand.brandName}] scraped ${products.length} products`);
    return { ...brand, products };
}
  