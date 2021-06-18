const fetch = require("node-fetch");
const Sitemapper = require('sitemapper');
const sitemap = new Sitemapper();
const siteMapUrls = [
    'https://www.example.com/sitemap_cms.xml',
    'https://www.example.com/sitemap_category.xml',
    'https://www.example.com/sitemap_product.xml'
];
let fullListOfURLs = [];
let listOfPromise = [];
let totalCacheMiss = 0;
const totalTime = Date.now();
const getUrls = (siteMapUrl) => {
    return new Promise((resolve) => sitemap.fetch(siteMapUrl).then((sites) => resolve(sites.sites)));
}

const buildListOfPromises = () => {
    try {
        for (const url of fullListOfURLs) {
            const funcPromise = () => {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { 
                        reject();
                    },12000);
                    const t = Date.now();
                    let cleanedURL = url.replace(';', '%3B').replace('&', '%26').replace(',', '%2C');
                    fetch(encodeURI(cleanedURL)).then((resp) => {
                        const t2 = Date.now();
                        resp.headers.forEach((val, key) => {
                            if (key === "age") {
                                if(Number(val) === 0) totalCacheMiss++;
                                console.log("Response Time:", t2 - t, " ", "Cache Age:", Number(val/3600).toFixed(2), "hr ", "URL: ", cleanedURL);
                            }
                        });
                        clearTimeout(timeout);
                        resolve();
                    }).catch(error => console.log(error));
                    //if takes longer than 12sec resolve and move on
                    //setTimeout(() => reject(console.log("rejected")), 10000);
                });
            };
            listOfPromise.push(funcPromise);
        }
    } catch (error) {
        console.log(error);
    }
};

const crawlUrls = async (rateLimit, allUrls) => {
    try {
        const totalNumUrls = allUrls.length;
        while (allUrls.length > 0) {
            const t = Date.now();
            console.log("==============================================================================");
            const batchOfUrls = allUrls.splice(0, rateLimit);
            const arrayOfPromises = batchOfUrls.map((fetchUrl) => fetchUrl().catch(e => console.log(e)));
            await Promise.all(arrayOfPromises);
            const t2 = Date.now();
            const percentageDone = ((((allUrls.length/totalNumUrls)*100 - 100)).toFixed(0)*-1);
            console.log(Number(percentageDone), "%", (allUrls.length + "/" + totalNumUrls), " Batch time: ", (t2-t), "Total Time: ", ((t2-totalTime)/60000).toFixed(2), "minutes", "Total Misses: ", totalCacheMiss);
            console.log("==============================================================================");
            console.log("\n");
        }    
    } catch (error) {
        console.log(error);
    }
};

const combineSiteMapUrls = async (listOfSiteMapUrls) => {
    console.log("Starting");
    for (const url of listOfSiteMapUrls) {
        const individualSiteMap = await getUrls(url); 
        fullListOfURLs = [...fullListOfURLs, ...individualSiteMap];
    }
    console.log("Got all the URL's ready to start crawling...");
}

(async () => {
    try {
        await combineSiteMapUrls(siteMapUrls);
        buildListOfPromises();
        await crawlUrls(5, listOfPromise);
        process.exit(1);    
    } catch (error) {
        console.log(error);
    }
})();