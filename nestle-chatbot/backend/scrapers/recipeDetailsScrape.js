const sleepMs = ms => new Promise(res => setTimeout(res, ms));

export const scrapeRecipeDetails = async (page, recipe, WOFtitles) => {
    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.goto(recipe.link, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('h1.coh-heading', { timeout: 10000 });
        sleepMs(300);

        const data = await page.evaluate(wofArr => {
            const result = {};
            // stats
            Array.from(document.querySelectorAll('div.stat, div.recipe-stats')).forEach(div => {
                const lbl = div.querySelector('.stat-label')?.innerText.toLowerCase().trim() || '';
                const vt = (div.querySelector('span.value, p.coh-paragraph')?.innerText.trim() || '');
                const n = parseInt(vt.match(/\d+/)?.[0] || '0', 10);
                if (lbl.includes('prep')) result.prepTimeMinutes = n;
                if (lbl.includes('cook')) result.cookTimeMinutes = n;
                if (lbl.includes('total')) result.totalTimeMinutes = n;
                if (lbl.includes('serving')) result.servings = n;
                if (lbl.includes('skill')) result.skillLevel = vt;
            });
            // ingredients
            result.ingredients = Array.from(
                document.querySelectorAll(
                    'div.what-you-need-content article, ' +
                    'div.recipe-ingredients-content-wrapper article'
                )
            )
                .map(e => e.innerText.trim()).filter(Boolean);
            // prepSteps
            let steps = document.querySelectorAll('div.content-half article');
            if (!steps.length) {
                const hdr = Array.from(document.querySelectorAll('h3'))
                    .find(h => /directions|instructions/i.test(h.innerText));
                if (hdr) {
                    const c = hdr.nextElementSibling;
                    steps = c?.querySelectorAll('article') || c?.querySelectorAll('p') || [];
                }
            }
            result.prepSteps = Array.from(steps).map(e => e.innerText.replace(/\n/g, ' ').trim()).filter(Boolean);
            // tips
            let tips = [];
            for (const sec of document.querySelectorAll('.content-half')) {
                const h3s = Array.from(sec.querySelectorAll('h3'));
                if (h3s.some(h => h.innerText.trim().toLowerCase() === 'tips')) {
                    let sibling = h3s.find(h => h.innerText.trim().toLowerCase() === 'tips').nextElementSibling;
                    while (sibling && !sibling.classList.contains('coh-container')) sibling = sibling.nextElementSibling;
                    if (sibling) { tips = Array.from(sibling.querySelectorAll('article')).map(a => a.innerText.trim()).filter(Boolean); break; }
                }
            }
            if (!tips.length) {
                const th = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.trim().toLowerCase() === 'tips');
                const ps = th?.nextElementSibling?.querySelectorAll('p.coh-paragraph') || [];
                tips = Array.from(ps).map(p => p.innerText.trim()).filter(Boolean);
            }
            result.tips = tips;
            // tags
            const tagEls = document.querySelectorAll(
                'div.field--name-field-recipe-tag-free-tag a, div.coh-style-recipe-tags-button'
            );
            const tags = Array.from(tagEls).map(e => e.innerText.trim()).filter(Boolean);
            const ttl = document.querySelector('h1.global-recipe-title, h1')?.innerText.trim() || '';
            if (wofArr.includes(ttl) && !tags.includes('world of flavours')) tags.push('world of flavours');
            result.tags = tags;
            return result;
        }, Array.from(WOFtitles));

        return { ...recipe, ...data };
    } catch (err) {
        console.error(`⛔ Error scraping ${recipe.title}: ${err.message}`);
        return null;
    }
};
