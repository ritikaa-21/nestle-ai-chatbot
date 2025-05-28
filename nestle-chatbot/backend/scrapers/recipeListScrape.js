export const scrapeRecipeList = async (page) => {
    const baseUrl = 'https://www.madewithnestle.ca';
    let nextPageUrl = `${baseUrl}/en/recipes`;
    const allExtractedRecipes = new Map();

    //loop through all paginated recipe pages until no more pages remain
    while (nextPageUrl) {
        //load the current page and wait for less than 2 netwrok requests/settle requests
        await page.goto(nextPageUrl, { waitUntil: 'networkidle2' });

        //extract all recipes from current page
        const recipes = await page.$$eval('.recipe-search-card-wrapper', cards =>
            cards.map(card => {
                const anchorTagExtract = card.querySelector('a.recipe-search-block');
                const link = anchorTagExtract?.href;

                //from image tag extract image link, directly or prepend base url if needed for a relative img path
                const imgTagExtract = card.querySelector('img');
                const image = imgTagExtract?.src?.startsWith('http')
                    ? imgTagExtract.src
                    : `${baseUrl}${imgTagExtract?.getAttribute('src')}`;

                //extract title from text of heading text or fallback to untitled if missing    
                const title = card.querySelector('.coh-heading')?.innerText?.trim() || 'Untitled Recipe';
                return { title, link, image };
            })
        );

        // loop through each recipe extracted and add to the final list only if it has title, link, image
        // making sure it does not have duplicates on the basis of link
        // for (const recipe of recipes) {
        //     if (recipe.title && recipe.link && recipe.image) {
        //         allExtractedRecipes.set(recipe.link, recipe);
        //     }
        // }
        recipes
            .filter(r => r.title && r.link && r.image)
            .forEach(r => allExtractedRecipes.set(r.link, r));

        // Check for next page with more button
        const moreLink = await page.$('a.button[rel="next"]');
        if (moreLink) {
            /* nextPageUrl updated with the URL acquired from <a> tag class button
          href looks like: _wrapper_format=html&page=1 with appends to baseurl/recipes 
          helping in taking to next page */
            nextPageUrl = await page.$eval('a.button[rel="next"]', el => el.href);
        } else {
            //if more button is not present anymore, then URL set to null & while loop stops
            nextPageUrl = null;
        }
    }

    //all values in a flattened array with no keys
    const result = [...allExtractedRecipes.values()];
    console.log(`Scraped recipes count:  ${result.length} `);
    return result;
};
