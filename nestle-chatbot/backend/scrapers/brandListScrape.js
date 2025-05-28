// // scrapeCategoryBrands.js
// export const extractBrandsFromCategoryLI = (li) => {
//     const categoryName = li.querySelector('span')?.innerText?.trim() || 'Unknown';
//     const brandElements = li.querySelectorAll('ul.coh-menu-list-container li.coh-menu-list-item');

//     const brands = Array.from(brandElements).map((brandLI) => {
//         const a = brandLI.querySelector('a');
//         const brandName = a?.innerText?.trim();
//         const brandUrl = a?.href;
//         const img = a?.querySelector('img');
//         const rawSrc = img?.getAttribute('src') || '';
//         const brandImage = rawSrc.startsWith('/') ? `https://www.madewithnestle.ca${rawSrc}` : rawSrc;
//         console.log(brandName)
//         return brandName && brandUrl ? { brandName, brandUrl, brandImage } : null;
//     }).filter(Boolean);

//     return {
//         category: categoryName,
//         brands,
//     };
// };

// // scrapeAllBrands.js
// //import { extractBrandsFromCategoryLI } from './scrapeCategoryBrands.js';

// export const scrapeAllBrandCategories = async (page) => {
//     await page.goto('https://www.madewithnestle.ca', {
//         waitUntil: 'domcontentloaded',
//         timeout: 30000,
//     });

//     const allCategories = await page.$$eval(
//         'div.sub-menu-container-inner ul.coh-unordered-list > li.coh-menu-list-item',
//         (categoryItems, extractFnString) => {
//             const extractFn = new Function('li', `return (${extractFnString})(li);`);
//             return Array.from(categoryItems).map((li) => extractFn(li));
//         },
//         extractBrandsFromCategoryLI.toString() // pass inner function string to browser context
//     );

//     return allCategories;
// };


// helpers/brandCategoriesScrape.js
export async function scrapeAllBrandCategories(page) {
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto("https://www.madewithnestle.ca/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
    });

    // wait for the sub-menu container to be present
    await page.waitForSelector("span.coh-inline-element", { visible: true, timeout: 2000 });

    const data = await page.evaluate(() => {
        //of all spans in the dom find the one that says "brand"
        const brandSpan = Array.from(
            document.querySelectorAll("span.coh-inline-element")
        ).find(el => el.textContent.trim() === "Brand");
        if (!brandSpan) return [];

        //scope into the second-level <ul> under found Brand
        const secondLevelUL = brandSpan
            .closest("span.js-coh-menu-item-link")
            .nextElementSibling
            .querySelector(".sub-menu-container-inner ul");
        if (!secondLevelUL) return [];

      //for each category <li> in that specific ul
        return Array.from(secondLevelUL.children).map(categoryLI => {
            const categoryName = categoryLI
                .querySelector("span.coh-link.js-coh-menu-item-link")
                .textContent.trim();

            //into the sub-sub-menu container that has brands
            const brandContainerUL = categoryLI
                .querySelector("div.sub-sub-menu-container .menu-level-3-ul");
            if (!brandContainerUL) return null;

            //=now building the brands array
            const brands = Array.from(brandContainerUL.children)
                .map(brandLI => {
                    const a = brandLI.querySelector("a.image-menu-wrapper");
                    if (!a) return null;
                    const spanName = a.querySelector("span.menu-link-3-level");
                    const img = a.querySelector("img");
                    return {
                        brandName: spanName?.textContent.trim(),
                        brandUrl: a.href,
                        brandImage: img
                            ? (img.src.startsWith("http")
                                ? img.src
                                : "https://www.madewithnestle.ca" + img.getAttribute("src"))
                            : null
                    };
                })
                .filter(b => b && b.brandName && b.brandUrl);

            return {
                category: categoryName,
                brands
            };
        })
            // filter out any null entries
            .filter(entry => entry && entry.brands.length);
            
    });

  //  console.log("✅ scrapeBrandCategories result:", data);
    return data;
}
  
