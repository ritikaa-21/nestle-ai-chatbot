// index.js
import puppeteer from 'puppeteer';
import { scrapeAllBrandCategories } from '../scrapers/brandListScrape.js';
import { scrapeWithPLimit } from '../utils/batchScrapingWithPLimit.js';
import { scrapeBrandDetails } from '../scrapers/brandDetailsScrape.js';
import { scrapeRecipeList } from '../scrapers/recipeListScrape.js'
import { scrapeRecipeDetails } from '../scrapers/recipeDetailsScrape.js'
import {WOFtagAddition} from '../utils/globalWOFrecipes.js'
import fs from 'fs';
import path from 'path';


export const scrapeAllContent = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1280,800',
            '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
        const url = req.url().toLowerCase();
        if (/\.(png|jpe?g|gif|css|woff2?|ttf)$/i.test(url)) req.abort();
        else req.continue();
    });

    const categories = await scrapeAllBrandCategories(page);

    const allBrands = categories.flatMap(cat => cat.brands);

    const enrichedBrands = await scrapeWithPLimit(
        browser,
        allBrands,
        5,
        // wrap your detail-scraper so it matches (page, brand)
        async (page, brand) => {
            try {
                const products = await scrapeBrandDetails(page, brand);
                return { ...brand, products };
            } catch (err) {
                console.error(`Error scraping ${brand.brandUrl}:`, err.message);
                return { ...brand, products: [] };
            }
        }
    );



    //Re-attach the products back into the category structure
    const result = categories.map(cat => ({
        category: cat.category,
        brands: cat.brands.map(b =>
            enrichedBrands.find(eb => eb.brandUrl === b.brandUrl) || b
        )
    }));

    const WOFtitles = await WOFtagAddition(page);
    console.log(`✅ Scraped ${WOFtitles.size} WOF recipes`);

    const recipes = await scrapeRecipeList(page);
    console.log(`✅ Scraped ${recipes.length} recipes`);
    await page.close();

    const detailedRecipes = await scrapeWithPLimit(
        browser, recipes, 8, scrapeRecipeDetails, WOFtitles
    );

    const outputDir = './output';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    fs.writeFileSync(
        path.join(outputDir, 'clusterRecipes.json'),
        JSON.stringify(detailedRecipes, null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'brands-with-products.json'),
        JSON.stringify(result, null, 2)
    );

    console.log('✅ Done! See output/brands-with-products.json');
    await browser.close();


};

//    // console.log(categories)
//     // 2) flatten all brands
//     const allBrands = categories.flatMap(cat => cat.brands);
//     //console.log(allBrands)
//     // 3) enrich each brand in parallel (5 at a time)
//     const enriched = [];
//     const batchSize = 5;
//     for (let i = 0; i < allBrands.length; i += batchSize) {
//         const batch = allBrands.slice(i, i + batchSize);
//         const results = await Promise.all(
//             batch.map(async brand => {
//                 const p = await browser.newPage();
//                 await p.setRequestInterception(true);
//                 p.on('request', req => {
//                     const u = req.url().toLowerCase();
//                     if (/\.(png|jpe?g|gif|css|woff2?|ttf)$/i.test(u)) req.abort();
//                     else req.continue();
//                 });
//                 try {
//                     return await productLineScrape(p, brand);
//                 } catch {
//                     return { ...brand, products: [] };
//                 } finally {
//                     await p.close();
//                 }
//             })
//         );
//         enriched.push(...results);
//     }
//     // 4) re-attach enriched products back into categories
//     const result = categories.map(cat => ({
//         category: cat.category,
//         brands: cat.brands.map(b =>
//             enriched.find(eb => eb.brandUrl === b.brandUrl) || b
//         )
//     }));

// 5) close browser

// 6) write out or log
// const outputDir = './output';
// if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
// fs.writeFileSync(
//     path.join(outputDir, 'brands-with-products.json'),
//     JSON.stringify(categories, null, 2)
// );

// console.log(`✅ Done! Wrote ${path.join(outputDir, 'brands-with-products.json')}`);

(async () => {
    console.time('full scrape');
    await scrapeAllContent();
    console.timeEnd('full scrape');
})();
