// import pLimit from 'p-limit';

// /*
//  * Generic parallel scraper using p-limit. Can be used for recipes, brands, products, etc.
//  *
//  * @param {import('puppeteer').Browser} browser - Puppeteer browser instance.
//  * @param {Array<any>} items - List of items to process (e.g., recipes or brands).
//  * @param {number} concurrency - How many pages to run in parallel.
//  * @param {Function} extractorFn - Async function(page, item, ...args) that scrapes data for one item.
//  * @param {...any} args - Additional arguments to pass to extractorFn.
//  * @returns {Promise<Array<any>>} - Array of extracted results, filtered to remove null/failed items.
//  */

// export const scrapeWithPLimit = async (browser, items, concurrency, extractorFn, ...args) => {
//     const limit = pLimit(concurrency);

//     const tasks = items.map(item =>
//         limit(async () => {
//             const page = await browser.newPage();
//             await page.setRequestInterception(true);
//             page.on('request', req => {
//                 const url = req.url().toLowerCase();
//                 if (/\.(png|jpe?g|gif|css|woff2?|ttf)$/i.test(url)) req.abort();
//                 else req.continue();
//             });
      
//             try {
//                 //call extractor function with the Puppeteer page, the current item, and any extra args
//                 const result = await extractorFn(page, item, ...args);
//                 console.log("from inside p-limit: ", result)
//                 return result;
//             } catch (err) {
//                 const id = item.title || item.brandName || 'unknown';
//                 console.error(`❌ Failed to scrape ${id}: ${err.message}`);
//                 return null;
//             } finally {
//                 await page.close();
//             }
//         })
//     );

//     const resolved = await Promise.all(tasks);
//     return resolved.filter(Boolean);
// };


import pLimit from 'p-limit';

export const scrapeWithPLimit = async (
    browser, items, concurrency, extractorFn, ...args
) => {
    const limit = pLimit(concurrency);

    const tasks = items.map(item =>
        limit(async () => {
            let page;
            try {
                page = await browser.newPage();
                await page.setRequestInterception(true);
                page.on('request', req => {
                    const url = req.url().toLowerCase();
                    if (/\.(png|jpe?g|gif|css|woff2?|ttf)$/i.test(url)) req.abort();
                    else req.continue();
                });
                return await extractorFn(page, item, ...args);
            } catch (err) {
                console.error(`❌ Error scraping ${item.brandName || item.title}: ${err.message}`);
                return null;
            } finally {
                if (page) {
                    try { await page.close(); } catch { }
                }
            }
        })
    );

    const results = await Promise.all(tasks);
    return results.filter(Boolean);
};
