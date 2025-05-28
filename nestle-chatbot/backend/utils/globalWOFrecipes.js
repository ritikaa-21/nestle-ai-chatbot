export const WOFtagAddition = async (page) => {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto('https://www.madewithnestle.ca/WOF-world-flavours', {
        waitUntil: 'networkidle0', timeout: 30000
    });
 
    await page.waitForSelector('div.recipe-stats h3', { timeout: 15000 });

    const titles = await page.$$eval(
        'div.recipe-stats h3',
        (els) => els.map((el) => el.textContent.trim())
    );
    return new Set(titles);
  };