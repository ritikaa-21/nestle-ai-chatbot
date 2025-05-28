// scrapers/brandDetailsScraper.js

const baseUrl = 'https://www.madewithnestle.ca';

const normalizeUrl = raw =>
    /^https?:\/\//i.test(raw)
        ? raw
        : `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`;

export const scrapeBrandDetails = async (page, { brandUrl }) => {
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/120.0.0.0 Safari/537.36'
    );

    // 1) Go to the brand page
    const url = normalizeUrl(brandUrl);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 2) If there’s a “Products” or “Our Coffees” or “Liquid” or “Powder” tab, navigate there
    const tabUrls = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a'))
            .filter(a => ['Products', 'Our Coffees', 'Liquid', 'Powder']
                .includes(a.textContent.trim()))
            .map(a => a.href)
    );
    if (tabUrls.length) {
        await page.goto(tabUrls[0], { waitUntil: 'networkidle2', timeout: 60000 });
    }

    // 3) Paginate via “More” button and collect unique products
    const cardSelector = 'div.coh-column.product-column, div.nescafe-product';
    const seen = new Set();
    const uniqueProducts = [];
    let nextPageUrl = tabUrls.length ? tabUrls[0] : url;
    const sleepMs = ms => new Promise(res => setTimeout(res, ms));

    while (nextPageUrl) {
        await page.goto(nextPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector(cardSelector, { timeout: 15000 });
        await sleepMs(500);

        const products = await page.$$eval(cardSelector, cards =>
            cards.map(card => ({
                highlight: card
                    .querySelector('.product-highlight-label, .product-highlight')
                    ?.textContent.trim() ?? null,
                url: card
                    .querySelector('.views-field-field-package-image a, .product-title')
                    ?.href ?? null,
                image: card
                    .querySelector('.views-field-field-package-image img, .product-image img')
                    ?.src ?? null,
                title: card
                    .querySelector('.views-field-title a, .product-title')
                    ?.textContent.trim() ?? null,
                size: card
                    .querySelector('.views-field-field-size .field-content a')
                    ?.textContent.trim() ?? null,
            }))
        );

        for (const p of products) {
            if (p.url && !seen.has(p.url)) {
                seen.add(p.url);
                uniqueProducts.push(p);
            }
        }

        nextPageUrl = await page
            .$eval('a.button[rel="next"]', el => el.href)
            .catch(() => null);
    }

    // 4) Return de-duplicated products
    return uniqueProducts;
};
