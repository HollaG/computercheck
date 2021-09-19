console.log("----------------- EXECUTING FILE: scraper.js -----------------")

const puppeteer = require("puppeteer-extra");
const { Cluster } = require('puppeteer-cluster');
const fs = require('fs-extra');
const axios = require("axios");
const links = {
    "Challenger": [
        {
            "requests": [
                {
                    "indexName": "hachisearchengine",
                    "params": "filters=active_sites%3AHSG&maxValuesPerFacet=1&query=&hitsPerPage=1000&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=0&tagFilters=&facetFilters=%5B%5B%22boutiquecates.subcategory%3APc%20%26%20Notebooks%20%3E%20Notebooks%20%26%20Desktops%20%3E%20Monitors%22%5D%5D"
                }, // For normal monitors
                {
                    "indexName": "hachisearchengine",
                    "params": "filters=active_sites%3AHSG&maxValuesPerFacet=1&query=&hitsPerPage=1000&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=0&tagFilters=&facetFilters=%5B%5B%22boutiquecates.subcategory%3AGaming%20%3E%20Pc%20Gaming%20%3E%20Gaming%20Monitor%22%5D%5D"
                }, // for Gaming monitors
            ]
        }
    ],
    "Best Denki": ['https://www.bestdenki.com.sg/it-mobile/computer/monitors.html'],
    "Courts": ['https://www.courts.com.sg/computing-mobile/monitors-projectors/monitors?product_list_limit=32'],
    "Harvey Norman": ['https://www.harveynorman.com.sg/computing/computers-en/monitors-en/'],
    "Gain City": ['https://www.gaincity.com/catalog/category/166/monitors'],

    "ACER Store": ['https://store.acer.com/en-sg/monitors?product_list_limit=all'],
    "DELL Store": ['https://www.dell.com/en-sg/shop/monitors/ar/6481'],
    "HP Store": ['https://www.hp.com/sg-en/shop/monitors.html?product_list_limit=30'],
    "LENOVO Store": ['https://www.lenovo.com/sg/en/accessories-and-monitors/dc/monitors?sort=sortBy&currentResultsLayoutType=grid&visibleDatas=facet_Group%3AGroup%3AMonitors'],
    "LG Store": ['https://www.lg.com/sg/consumer-monitors/view-all']
};



const headless = false
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const { clearCustomQueryHandlers } = require("puppeteer");
puppeteer.use(StealthPlugin());

const pageTimeout = 5 * 1000 * 60
const CLUSTEROPTS = {
    puppeteer,
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 2,
    timeout: 30 * 1000 * 60,

    sameDomainDelay: 500,
    workerCreationDelay: 500,
    monitor: true,
    puppeteerOptions: {
        headless,
        // TOGGLE ARGS FOR PUSH
        args: [
            // '--disable-setuid-sandbox',
            // '--disable-dev-shm-usage',
            // '--disable-accelerated-2d-canvas',
            // '--no-first-run',
            // '--no-zygote',
            // '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu',
            // '--no-sandbox'
        ]
    }
}

const brands = []


    ; (async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
        try {
            const browser = await puppeteer.launch({ headless, args: ['--no-sandbox'] });
            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)




            await fs.ensureDir(`${process.cwd()}/data/raw/monitors`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/harvey.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/challenger.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/gain.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/courts.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/best.json`)
            // await fs.ensureFile(`${process.cwd()}/data/raw/monitors/lg.json`) 

            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/acer.json`)
            // await fs.ensureFile(`${process.cwd()}/data/raw/monitors/asus.json`) // No monitors
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/dell.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/hp.json`)
            await fs.ensureFile(`${process.cwd()}/data/raw/monitors/lenovo.json`)




            await gain()

            await acer()

            await dell() 
            await hp()
            await lenovo()



            await harvey()
            await challenger()

            await courts() // Illegal
            await best()


            /* SECTION FOR ACER */
            async function acer() {
                console.log("PUPPETEER: Scraping Acer Store")

                const acerPage = await browser.newPage()


                await acerPage.goto(links["ACER Store"][0], { waitUntil: 'networkidle0' })

                await acerPage.exposeFunction("cleaner", cleaner)

                let acerData = await acerPage.evaluate(async () => {
                    try {
                        let items = document.querySelectorAll(".product-item")

                        let products = []
                        for (let i = 0; i < items.length; i++) {
                            let item = items[i]

                            let childName = item.querySelector(".product-item-link").innerText

                            let price = item.querySelector('.price').innerText

                            let brand = "ACER"

                            let link = item.querySelector(".product-item-link").getAttribute("href")


                            let model_ID = await cleaner(childName.includes("|") ? childName.split("|")[1].trim() : childName.trim())

                            let image_url = item.querySelector(".product-image-photo").src

                            let instock = item.querySelector(".stock.available") ? "" : "c-false"

                            products.push({
                                name: childName, price, brand, link, model_ID, image_url, instock,
                                location: "ACER Store"
                            })
                        }
                        return products

                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })

                await acerPage.close()



                // Write to file
                fs.writeFile(`${process.cwd()}/data/raw/monitors/acer.json`, JSON.stringify(acerData), (err, file) => {
                    if (err) console.log(err)
                })

                console.log("PUPPETEER: Completed scraping Acer Store")

                return true

            }

            /* SECTION FOR DELL Store (inoperable) */
            async function dell() {
                try {
                    console.log("PUPPETEER: Scraping DELL Store")

                    const dellPage = await browser.newPage()

                    await dellPage.goto(links['DELL Store'][0], { waitUntil: 'domcontentloaded' })

                    let pages = await dellPage.$eval(("#middle-content > div > div.accessories-result-product-stack > div.pageinfo-control.hide-xs.hide-sm.hide-md > div:nth-child(1) > div > span.resultcount"), e => Math.ceil(Number(e.innerText) / 12))

                    console.log("Found " + pages + " for Dell")

                    await dellPage.close()

                    const cluster = await Cluster.launch(CLUSTEROPTS);

                    for (let i = 1; i <= pages; i++) {
                        let url = `${links['DELL Store'][0]}?page=${i}`
                        console.log(url)
                        cluster.queue({
                            url, i
                        })
                    }

                    const DELLProducts = []

                    await cluster.task(async ({ page, data }) => {
                        let url = data.url
                        let i = data.i
                        await page.exposeFunction('cleaner', cleaner)
                        console.log("Scraping page " + i + " of " + pages)

                        await page.goto(url, { waitUntil: 'networkidle0', timeout: pageTimeout })
                        let products = await page.evaluate(async () => {
                            try {
                                let items = document.querySelectorAll(".stack-accessories.ps-stack")

                                let products = []
                                for (let i = 0; i < items.length; i++) {
                                    let item = items[i]

                                    let childName = item.querySelector(".ps-title > a").innerText

                                    let price = item.querySelector('.smart-popover-btn').innerText

                                    let brand = "DELL"

                                    let link = item.querySelector(".ps-title > a").getAttribute("href")
                                    if (!link.match(/^https?:\/\//g)) link = "https:" + link


                                    let model_ID = await cleaner(childName)
                                    // let model_ID = await cleaner(childName.includes("|") ? childName.split("|")[1].trim() : childName.trim())

                                    let image_url = item.querySelector("img").src
                                    if (!image_url.match(/^https?:\/\//g)) image_url = "https:" + image_url
                                    if (image_url.match('data:image')) {
                                        debugger;
                                        console.log(item) // TODO: WTF IS THIS? Do we ignore the image, and thus use the placeholder image?
                                    }
                                    let instock = item.querySelector(".stock-level-wrapper") ? "c-false" : "" // If present, out of stock

                                    products.push({
                                        name: childName, price, brand, link, model_ID, image_url, instock,
                                        location: "DELL Store"
                                    })
                                }
                                return products

                            } catch (e) {
                                console.log(e)
                                return e
                            }
                        })
                        DELLProducts.push(...products)

                    })


                    await cluster.idle()
                    await cluster.close()

                    // Write to file
                    fs.writeFile(`${process.cwd()}/data/raw/monitors/dell.json`, JSON.stringify(DELLProducts), (err, file) => {
                        if (err) console.log(err)
                    })

                    console.log("PUPPETEER: Completed scraping Dell Store")

                    return true
                } catch (e) {
                    console.log(e)
                }
            }

            /* SECTION FOR HP Store */
            async function hp() {
                try {
                    console.log("PUPPETEER: Scraping HP Store")

                    const hpPage = await browser.newPage()

                    await hpPage.goto(links['HP Store'][0], { waitUntil: "networkidle2", timeout: pageTimeout })

                    let pages = 1;
                    try { 
                        pages = await hpPage.$eval(("#category\\.product\\.list > div:nth-child(3) > div.pages > ul"), e => e.childElementCount - 1)
                    } catch (e) {
                        // no element, means that there's only one page
                    }
                    console.log("FOUND " + pages + " pages")

                    await hpPage.close()

                    const cluster = await Cluster.launch(CLUSTEROPTS);

                    cluster.on('taskerror', (err, data, willRetry) => {
                        if (willRetry) {
                            console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
                        } else {
                            console.error(`Failed to crawl ${data}: ${err.message}`);
                        }
                    });
                    for (let i = 1; i <= pages; i++) {
                        let url = `${links['HP Store'][0]}&p=${i}`
                        cluster.queue({
                            url, i
                        })
                    }

                    const HPProducts = []
                    await cluster.task(async ({ page, data }) => {
                        try {
                            let url = data.url
                            let i = data.i
                            await page.exposeFunction('cleaner', cleaner)
                            console.log("Scraping page " + i + " of " + pages)

                            await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeout })

                            let products = await page.evaluate(async () => {
                                try {
                                    let items = document.querySelectorAll(".product-item")
                                    let products = []
                                    for (let j = 0; j < items.length; j++) {
                                        let item = items[j]

                                        let childName = item.querySelector(".product-item-link").innerText

                                        let price = item.querySelector('.price').innerText

                                        let brand = "HP"

                                        let link = item.querySelector(".product-item-link").getAttribute("href")


                                        let model_ID = await cleaner(childName)


                                        let image_url = item.querySelector(".product-image-photo").dataset.src ? item.querySelector(".product-image-photo").dataset.src : item.querySelector(".product-image-photo").src

                                        let instock = item.querySelector(".out-stock-messaging") ? "c-false" : ""

                                        products.push({
                                            name: childName, price, brand, link, model_ID, image_url, instock,
                                            location: "HP Store"
                                        })

                                    }
                                    return products
                                } catch (e) {
                                    console.log(e)
                                    return e
                                }
                            })
                            console.log("Finished scraping page")
                            HPProducts.push(...products)
                            return true
                        } catch (e) {
                            console.log(e)
                            return false
                        }


                    })


                    await cluster.idle()
                    await cluster.close()


                    // console.log(ASUSProducts)
                    // Write to file
                    fs.writeFile(`${process.cwd()}/data/raw/monitors/hp.json`, JSON.stringify(HPProducts), (err, file) => {
                        if (err) console.log(err)
                    })
                    console.log("PUPPETEER: Completed scraping HP Store")

                    return true
                } catch (e) {
                    console.log(e)
                }
            }

            /* SECTION FOR LENOVO */
            async function lenovo() {
                try {
                    console.log("PUPPETEER: Scraping Lenovo Store")
                    const lenovoPage = await browser.newPage()
                    await lenovoPage.goto(links['LENOVO Store'][0], { waitUntil: 'networkidle2' })

                    let loadTimes = await lenovoPage.$eval(("#facetTop-count"), e => Math.ceil(Number(e.innerText.split(" ")[0]) / 20) - 1)

                    for (let i = 0; i < loadTimes; i++) {
                        console.log("Clicking load more button (" + (i + 1) + "/" + loadTimes + ")")
                        await lenovoPage.$eval((".loadmore-button"), e => e.click())
                        // await lenovoPage.waitForTimeout({waitUntil: "networkidle2"})
                        await timeout(1000)
                        let loading = true
                        while (loading) {
                            // Loading modal with class .searchLoader appears when loading (display: block)
                            loading = await lenovoPage.$eval((".searchLoader"), e => {
                                return e.style.display == "none" ? false : true
                            })
                            console.log("Waiting for loading...")
                            await timeout(1000)

                        }
                    }
                    console.log("All items loaded")
                    // await lenovoPage.exposeFunction("cleaner", cleaner)

                    let products = await lenovoPage.evaluate(() => {
                        try {
                            let items = document.querySelectorAll(".facetResults-item  ")
                            let products = []

                            for (let i = 0; i < items.length; i++) {
                                let item = items[i]

                                // Skip this if the price is NOT in the correct format
                                if (!item.querySelector(".xblodSize")) continue

                                let childName = item.querySelector('div.item-descriptions > a').innerText.replace(/\\n/g, "")

                                let price = item.querySelector(".xblodSize").innerText

                                let brand = "LENOVO"

                                let link = item.querySelector("div.item-descriptions > a").getAttribute("href")
                                link = 'https://www.lenovo.com' + link

                                let model_ID = item.dataset.productcode

                                let image_url = item.querySelector("div.image-container > a > img").dataset.original
                                if (!image_url.match(/^https?:\/\//g)) image_url = "https:" + image_url
                                if (image_url == "https:") image_url = "/images/missing.jpg"

                                let instock = item.dataset.productstatus != 'available' ? "c-false" : ""

                                let customizable = item.querySelector("button[type='submit']").innerText.toUpperCase().includes("CUSTOMIZE") ? true : false

                                products.push({
                                    name: childName, price, brand, link, model_ID, image_url, instock, customizable,
                                    location: "LENOVO Store"
                                })


                            }
                            console.log(products)
                            return products

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })

                    await lenovoPage.close()

                    console.log(products)

                    // Write to file
                    fs.writeFile(`${process.cwd()}/data/raw/monitors/lenovo.json`, JSON.stringify(products), (err, file) => {
                        if (err) console.log(err)
                    })
                    console.log("PUPPETEER: Completed scraping LENOVO Store")
                    return true

                } catch (e) {

                }
            }

            /* SECTION FOR RAZER */
            async function razer() {
                try {
                    console.log("PUPPETEER: Scraping RAZER Store")
                    const razerPage = await browser.newPage()

                    await razerPage.goto(links['RAZER Store'][0], { waitUntil: "networkidle2" })
                    await razerPage.waitForTimeout(2500)
                    // await razerPage.exposeFunction('cleaner', cleaner)
                    let products = await razerPage.evaluate(async () => {
                        try {
                            let items = document.querySelectorAll(".grid-item")
                            let products = []

                            for (let i = 0; i < items.length; i++) {
                                let item = items[i]

                                let childName = item.querySelector(".product-item-title").innerText

                                let price = item.querySelector(".final-price").innerText

                                let brand = "RAZER"

                                let link = item.querySelector(".product-item-title").getAttribute("href")
                                link = "https://www.razer.com" + link

                                let model_ID = item.querySelector(".product-item-title").dataset['productId']

                                let image_url = item.querySelector(".cx-product-image > img").src

                                let instock = item.querySelector(".gtm_notify_me") ? "c-false" : ""

                                let customizable = false

                                products.push({
                                    name: childName, price, brand, link, model_ID, image_url, instock, customizable,
                                    location: "RAZER Store"
                                })
                            }

                            return products

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })
                    await razerPage.close()
                    fs.writeFile(`${process.cwd()}/data/raw/laptops/razer.json`, JSON.stringify(products), (err, file) => {
                        if (err) console.log(err)
                    })
                    console.log("PUPPETEER: Completed scraping RAZER Store")

                    return true
                } catch (e) {
                    console.log(e)
                }
            }

            /* SECTION FOR GAIN CITY */
            async function gain() { // Confidence: 3
                console.log("PUPPETEER: Scraping Gain City")

                const gainPage = await browser.newPage()

                await gainPage.goto(links["Gain City"][0], { waitUntil: 'networkidle2', timeout: pageTimeout })
                await gainPage.exposeFunction("cleaner", cleaner)


                // Gain city automatically loads more items if we scroll down, so run a function to scroll all the way down until we can't anymore
                console.log("PUPPEETER: Scrolling page")
                gainPage.on('console', consoleObj => console.log(consoleObj.text()));

                await gainPage.evaluate(async () => {
                    // Scroll to bottom function        
                    const delay = 2000;
                    const wait = (ms) => new Promise(res => setTimeout(res, ms));

                    const scrollDown = async () => {
                        // Scroll to footer, which is always at the bottom
                        document.querySelectorAll(".product-item-info")[document.querySelectorAll(".product-item-info").length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' })
                    }

                    const run = async () => {
                        let reachedEnd = false
                        do {
                            console.log("Checking data")
                            let reachedEndElem = document.querySelector(".ias-noneleft")
                            console.log(reachedEndElem ? true : false)
                            if (reachedEndElem) reachedEnd = true
                            console.log("Scrolling")
                            await scrollDown();
                            await wait(delay);

                        } while (!reachedEnd);
                        await wait(delay);
                        return
                    }
                    await run()

                })
                console.log("PUPPEETER: Page completed scrolling")

                let gainData = await gainPage.evaluate(async () => {
                    let items = document.querySelectorAll(".product-item-info")
                    let products = []
                    for (item of items) {

                        let childName = item.querySelector(".product-item-link").innerText
                        if (!childName) childName = "MISSING INFO"
                        console.log(childName)
                        let price = item.querySelector(".price").innerText
                        let brand = childName.split(" ")[0]
                        let model_ID = await cleaner(item.querySelector(".product-model-number").innerText)
                        console.log(childName, " - ", model_ID)
                        let link = item.querySelector(".product-item-link").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                        if (!link.match(/^https?:\/\//g)) link = "https://" + link

                        let image_url = item.querySelector(".product-image-photo").src
                        if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url

                        let instock = item.querySelector(".stock.unavailable") ? "c-false" : ""

                        products.push({
                            name: childName, price, brand, link, model_ID, image_url, instock,
                            location: "Gain City"
                        })
                    }
                    return products


                })
                await gainPage.close()
                // Write to file
                fs.writeFile(`${process.cwd()}/data/raw/monitors/gain.json`, JSON.stringify(gainData), (err, file) => {
                    if (err) console.log(err)
                })
                console.log("PUPPETEER: Completed scraping GAIN CITY")

                return true
            }



            /* SECTION FOR HARVEY NORMAN */
            async function harvey() {
                try {
                    console.log("PUPPETEER: Scraping Harvey Norman")



                    // Create new tab
                    const harveyPage = await browser.newPage()

                    // Go to harvey norman laptop page
                    await harveyPage.goto(links["Harvey Norman"][0], { waitUntil: 'domcontentloaded', timeout: pageTimeout })

                    // Get the number of pages (Total / 20)



                    let harveyPages = await harveyPage.evaluate(() => Math.ceil(Number(document.querySelector("#pagination_contents > div.toolbar > div > div:nth-child(2) > div > div.pagination-amount.col-xs-4").innerText.split(" ")[0]) / 20))
                    console.log("PUPPEETER: Found pages: " + harveyPages)


                    await harveyPage.close()

                    const cluster = await Cluster.launch(CLUSTEROPTS);
                    cluster.on('taskerror', (err, data, willRetry) => {
                        if (willRetry) {
                            console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
                        } else {
                            console.error(`Failed to crawl ${data}: ${err.message}`);
                        }
                    });
                    console.log("After launching cluster")
                    await cluster.task(async ({ page, data }) => {
                        try {
                            let url = data.url

                            let i = data.i
                            console.log("PUPPEETER-CLUSTER: Scraping page " + i + " of " + harveyPages)
                            await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeout })

                            let products = await page.evaluate(() => {
                                let items = document.querySelector(".col-xs-12.col-sm-9.col-md-9.omega").querySelectorAll('form')
                                let products = []
                                items.forEach(item => {
                                    let childName = item.querySelector(".product-info > a").getAttribute("title").trim().toUpperCase()
                                    if (!childName) childName = "MISSING INFO"

                                    let price = item.querySelector(".price").innerText.trim().toUpperCase()
                                    let brand = childName.split(" ")[0]
                                    let link = item.querySelector(".product-info > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                                    if (!link.match(/^https?:\/\//g)) link = "https://" + link

                                    let image_url = item.querySelector(".product-image > a > img").src
                                    if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url

                                    let instock = item.querySelector(".out-of-stock-block") ? "c-false" : ""


                                    products.push({
                                        name: childName, brand, price, link, image_url, instock,
                                        location: "Harvey Norman"
                                    })
                                })
                                return products
                            })

                            for (let j = 0; j < products.length; j++) {
                                console.log("PUPPEETER-CLUSTER: Scraping model " + (j + 1) + " of " + products.length + " (Page " + i + ")")

                                let product = products[j]
                                // Query the product page to get the model data

                                await page.goto(product.link, { waitUntil: "networkidle2", timeout: pageTimeout })
                                let model_ID = await page.$eval("#content_features > div > table:nth-child(3)", table => {
                                    let headings = Array.from(table.querySelectorAll('tr > th'))
                                    let index;
                                    headings.forEach(heading => {
                                        if (heading.innerText.toUpperCase() == "MODEL") index = headings.indexOf(heading) + 1
                                    })
                                    return table.querySelector(`tr:nth-child(${index}) > td`).innerText.toUpperCase().trim()

                                })

                                product.model_ID = cleaner(model_ID)

                            }
                            HARVEYPRODUCTS.push(...products)
                            return true
                        } catch (e) {
                            console.log(e)
                            return false
                        }


                    })

                    let HARVEYPRODUCTS = []
                    for (let i = 1; i <= harveyPages; i++) {


                        let url = `${links["Harvey Norman"][0]}page-${i}/`
                        // console.log("queueing" + url)
                        console.log("QUEUEING: ", url)
                        cluster.queue({ url, i })
                    }

                    await cluster.idle()
                    await cluster.close()
                    fs.writeFile(`${process.cwd()}/data/raw/monitors/harvey.json`, JSON.stringify(HARVEYPRODUCTS), (err, file) => {
                        if (err) console.log(err)
                    })
                    console.log("PUPPEETER: Completed scraping Harvey Norman")
                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }


            }

            /* SECTION FOR CHALLENGER (using their API (AXIOS)) */
            async function challenger() { // MODEL CONFIDENCE : HIGH
                try {
                    console.log("AXIOS: Scraping Challenger")

                    // Get the object of every item ID in challenger's laptop database
                    const products = []

                    for (link of links["Challenger"]) {
                        let response = await axios.post("https://6bc318ijnf-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.10.3)%3B%20Browser%20(lite)%3B%20instantsearch.js%20(4.25.2)%3B%20Vue%20(2.6.14)%3B%20Vue%20InstantSearch%20(3.8.1)%3B%20JS%20Helper%20(3.5.4)&x-algolia-api-key=88c8a34f2b7653f93b1ce0053dbc64fe&x-algolia-application-id=6BC318IJNF",
                            link,
                            {
                                "headers": {
                                    "content-type": "application/json"
                                }
                            }
                        )
                        let results = response.data.results
                        // console.log(results)
                        for (let r = 0; r < results.length; r++) {
                            let hits = results[r].hits

                            for (let i = 0; i < hits.length; i++) {



                                let item_ID = hits[i].item_id
                                let productResponse = await axios.get(`https://www.hachi.tech/product/${item_ID}/details`)
                                let data = productResponse.data.data

                                console.log(data)
                                if (!data) continue

                                let name = data.short_desc.toUpperCase().trim()
                                let price = `$${data.prices.regular_price}`
                                let brand = data.settings.dimensions.brand_id.toUpperCase().trim()
                                let link = `https://www.hachi.tech/product/${item_ID}`

                                let model_ID = data.settings.dimensions.model_id.toUpperCase().trim()
                                // EXCEPTION: ACER PRODUCTS - CHALLENGER PLACES THE ID WRONGLY, SO WE NEED TO USE THE PRODUCT NAME INSTEAD
                                if (brand == "ACER") model_ID = cleaner(name)

                                let image_url = data.image_name
                                if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url

                                await timeout(500)
                                let stockStatus = await axios.get(`https://www.hachi.tech/product/${item_ID}/inventory`)
                                let stock = stockStatus.data.data

                                let instock = "c-true"
                                if (!stock['delv_options'].length && !stock['scl_options'].length) instock = "c-false"

                                products.push({
                                    name,
                                    price,
                                    brand,
                                    model_ID,
                                    link,
                                    location: "Challenger",
                                    image_url,
                                    instock
                                })

                                console.log(`AXIOS: Scraping model ${i + 1} of ${hits.length} (Page ${r + 1}/${results.length})`)
                                await delay(500)

                            }

                        }





                    }
                    console.log("AXIOS: Completed scraping Challenger")

                    fs.writeFile(`${process.cwd()}/data/raw/monitors/challenger.json`, JSON.stringify(products), (err, file) => {
                        if (err) console.log(err)
                    })
                    return true
                } catch (e) {
                    console.log(e)
                    throw e
                }


            }

            /* SECTION FOR BEST DENKI */
            async function best() {
                console.log("PUPPETEER-CLUSTER: Scraping Best Denki")

                let BESTPRODUCTS = []
                const bestPage = await browser.newPage()

                const cluster1 = await Cluster.launch(CLUSTEROPTS);

                await cluster1.task(async ({ page, data }) => {
                    try {

                        let url = data.url
                        let i = data.i
                        console.log("PUPPETEER-CLUSTER (1): Scraping page " + (i + 1) + " of " + pages)

                        await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeout })
                        await page.exposeFunction("cleaner", cleaner)
                        let products = await page.evaluate(async () => {
                            try {
                                let items = document.querySelectorAll(".product-item")

                                let products = []


                                for (let i = 0; i < items.length; i++) {
                                    let item = items[i]

                                    let instock = item.querySelector("button[type='submit']") ? "" : "c-false"

                                    // TODO: Best Denki lists everything (6XX items listed) but only a few are in stock (1XX in stock)
                                    // So, we ignore if it's out of stock
                                    // Special case
                                    if (instock == "c-false") continue


                                    var childName = item.querySelector(".product-item-link").innerText.trim()
                                    var price = item.querySelector(".custominhouseprice > .price").innerText.trim()
                                    let brand = item.querySelector(".product-item-brand").childName.split(" ")[0].toUpperCase()

                                    let link = item.querySelector(".product-item-link").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                                    if (!link.match(/^https?:\/\//g)) link = "https://" + link
                                    let model_ID = await cleaner(childName) // the model is the ending of the url
                                    let image_url = item.querySelector('.product-image-photo').dataset.src
                                    if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url



                                    products.push({
                                        name: childName, price, brand, link, image_url, model_ID, instock,
                                        location: "Best Denki"
                                    })



                                }

                                return products
                            } catch (e) {
                                console.log(e)
                                return e
                            }


                        })



                        BESTPRODUCTS.push(...products)
                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })

                let pages = 0

                for (let i = 1; i < 10000; i++) {
                    let url = `${links["Best Denki"][0]}?p=${i}`
                    await bestPage.goto(url, { waitUntil: 'domcontentloaded' })
                    let ended = await bestPage.$('#maincontent > div.row > div.column.main.col-lg-9.col-md-9.col-sm-12.col-xs-12.pull-right > div.message.info.empty')

                    if (ended) {
                        pages = i - 1
                        break;
                    }

                }

                for (let i = 1; i < pages; i++) {
                    let url = `${links["Best Denki"][0]}?p=${i}`
                    cluster1.queue({
                        url, i
                    })
                }

                console.log("PUPPETEER: Found pages: " + pages)
                await bestPage.close()


                await cluster1.idle()
                await cluster1.close()

                fs.writeFile(`${process.cwd()}/data/raw/monitors/best.json`, JSON.stringify(BESTPRODUCTS), (err, file) => {
                    if (err) console.log(err)

                })
                console.log("PUPPETEER-CLUSTER: Completed scraping Best Denki")
                return true



            }

            /* SECTION FOR COURTS */
            async function courts() {
                console.log("PUPPETEER-CLUSTER: Scraping Courts")


                const courtsPage = await browser.newPage()
                await courtsPage.goto(links["Courts"][0], { waitUntil: "networkidle2", timeout: pageTimeout })

                // Find out how many pages there are
                // Total products divided by # per page (32)
                let courtsPages = await courtsPage.evaluate(() => Math.ceil(Number(document.querySelector('.product-count').innerText.split(" ")[0]) / 32))
                console.log("PUPPETEER: Found pages: " + courtsPages)

                await courtsPage.close()

                const cluster = await Cluster.launch(CLUSTEROPTS);

                await cluster.task(async ({ page, data }) => {
                    try {

                        page.on('console', async msg => {
                            const args = await msg.args()
                            args.forEach(async (arg) => {
                                const val = await arg.jsonValue()
                                // value is serializable
                                if (JSON.stringify(val) !== JSON.stringify({})) console.log(val)
                                // value is unserializable (or an empty oject)
                                else {
                                    const { type, subtype, description } = arg._remoteObject
                                    console.log(`type: ${type}, subtype: ${subtype}, description:\n ${description}`)
                                }
                            })
                        });
                        let url = data.url
                        let i = data.i
                        console.log("PUPPETEER-CLUSTER: Scraping page " + i + " of " + courtsPages)
                        await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeout })
                        console.log("Page Loaded!")
                        await page.exposeFunction("cleaner", cleaner)
                        console.log("Function exposed!")

                        let products = await page.evaluate(async () => {
                            try {
                                let items = Array.from(document.querySelector(".columns").querySelector(".product-items").querySelectorAll(".product-item-info"))
                                let products = []
                                for (item of items) {
                                    // console.log("Here")
                                    let childName = item.querySelector(".product-item-name").innerText.trim().toUpperCase()
                                    if (!childName) childName = "MISSING INFO"
                                    // console.log("Here2")

                                    // First word is the brand
                                    let brand = childName.split(" ")[0]
                                    // console.log("Her3e")

                                    let price = item.querySelector(".price").innerText.trim().toUpperCase()
                                    // console.log("Here4")

                                    let link = item.querySelector(".product-item-name > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                                    if (!link.match(/^https?:\/\//g)) link = "https://" + link

                                    let model_ID = await cleaner(childName) ? await cleaner(childName) : childName
                                    // console.log("Here5")

                                    let image_url = item.querySelector(".product-image-photo").getAttribute("data-original")
                                    if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url
                                    // console.log("Here6")

                                    let instock = item.querySelector(".stock.unavailable") ? "c-false" : ""

                                    // console.log("Here7")

                                    products.push({
                                        name: childName, brand, price, link, model_ID, image_url, instock,
                                        location: "Courts"
                                    })
                                    // console.log("Here8")

                                }
                                return products
                            } catch (e) {
                                console.log(e)
                                return e
                            }

                        })
                        console.log(products)
                        COURTSPRODUCTS.push(...products)
                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })

                let COURTSPRODUCTS = []
                for (let i = 1; i <= courtsPages; i++) {
                    let url = `${links["Courts"][0]}&p=${i}`

                    console.log("Queuing: " + i + " of " + courtsPages)
                    cluster.queue({ url, i })


                }

                await cluster.idle()
                await cluster.close()
                fs.writeFile(`${process.cwd()}/data/raw/monitors/courts.json`, JSON.stringify(COURTSPRODUCTS), (err, file) => {
                    if (err) console.log(err)
                })
                console.log("PUPPETEER-CLUSTER: Completed scraping Courts")

                return true
            }

            // /* SECTION FOR LG */
            // async function lg() {
            //     console.log("PUPPETEER: SCRAPING LG Store")

            //     const lgPage = await browser.newPage()
            //     await lgPage.goto(links["LG Store"][0], { waitUntil: "networkidle2", timeout: pageTimeout })
            //     await lgPage.exposeFunction("cleaner", cleaner)
            //     let products = await lgPage.evaluate(async () => {
            //         let products = []
            //         let items = document.querySelector()
            //         let childName = 


            //         products.push({
            //             name: childName, brand, price, link, model_ID, image_url, instock,
            //             location: "Courts"
            //         })

            //         return products

            //     })

            // }

            await browser.close()
            function cleaner(string) {
                var original = string
                var string = string.trim().toLowerCase()


                // Replace all non-breaking space and underscores
                string = string.replace(/ |_/gi, " ")



                var finalArr = []

                // 3) Remove all special characters
                string = string.replace(/,|®|™|\+|\/\/|–|:/g, "")
                // 1) Remove remove all '-' that have spaces on either side - e.g. 
                // remove ' -', '- ', ' - ' but not 'adsfads-asdfasd'
                string = string.replace(/[- ][ -]/g, " ")



                // 2) Remove specifications (RAM / SSD)
                // string = string.replace(/(\s\d+[kgtp]b)+(?=\W)|^\d+[kgtb]b(?=\W)|\s\d+[kgtb]b/gi, "")
                string = string.replace(/\d+[gt]b/gi, "")
                string = string.replace(/\d\d\dSSD/gi, "")

                // GHZ
                string = string.replace(/\d.\d[gm]hz/gi, "")

                // 8-core
                string = string.replace(/\d-core/gi, "")

                // cpu name
                string = string.replace(/[ir]\d[-\s]\d\d\d\d\w?\w?[kqe]?/gi, "")
                string = string.replace(/ryzen\s\d\s\d\d\d\d(\d?|(\d\d)?)\w/gi, "")

                // GPU
                string = string.replace(/(R|G)TX\s?\d?\d\d\d(TI)?|(MX\s?\d\d\d)|RX\s?\d\d\d\d\s?(XT)?/gmi, "")
                // 4) remove pure alphanumerics?


                // 5) Remove sizing, either 
                // NN-inch, NNinch, NN-in, NNin, NN', NN"
                string = string.replace(/((\d\d\.)?\d+-?(in(ch)?|"|''?))/gi, "")


                // 1) Usually, stuff in (text)/[text]/*text*/ denotes additional information, like what challenger does.
                // Harvey norman puts the model number inside the () though, so what we do is we check each []/()/**, if 
                // inside has at least ONE word as defined in dictionary.json, then we remove the whole string, else, 
                // we only remove the brackets

                var foundBracket = string.match(/\[[^\]]*]|\([^)]*\)*|\*[^*]*\*/g)
                if (foundBracket) {
                    foundBracket.forEach(match => {
                        // Strip the brakcets for word comparison
                        match = match.replace(/\(|\)|\[|\]|\*/g, "")

                        var wordArr = match.split(" ")

                        for (var i = 0; i < wordArr.length; i++) {
                            var word = wordArr[i]
                            var toRemove = false
                            if (dictionary[word] || extras[word]) {
                                // Remove this bracket
                                toRemove = true
                                break;
                            }

                        }

                        if (toRemove) {
                            // // This bracket (the 'match') is to be removed
                            // string.replace(match, " ")
                        } else {
                            // Don't remove it, but strip the brackets
                            finalArr.push(match)
                        }
                    })
                }

                // BRACKETS HAVE BEEN DEALT WITH, now REMOVE ALL THE BRACKETS
                string = string.replace(/\[[^\]]*]|\([^)]*\)*|\*[^*]*\*/g, " ")

                // console.log("*****************")
                // console.log(string )
                // console.log(original)
                // console.log("*****************")

                // remove all '-' that have spaces on either side - e.g. 
                // remove ' -', '- ', ' - ' but not 'adsfads-asdfasd'
                string = string.replace(/[- ][ -]/g, " ")

                // Final remove special chars
                string = string.replace(/,|®|™|\+|\/\/|–|:/g, "")


                // Remove lone numbers
                string = string.replace(/(?<=[ \t])(\d+)(?=[ \t])/g, "")
                // Split into array
                var stringArr = string.toLowerCase().split(" ")


                // for each word, check if exists in dictionary or extras
                let cleanedArr = []
                for (var i = 0; i < stringArr.length; i++) {
                    var word = stringArr[i]

                    var toRemove = false
                    if (dictionary[word] || extras[word]) {

                        // to be removed
                        continue
                    }

                    if (!Number.isNaN(Number(word))) {
                        // if the word is a number, we don't add it
                        continue
                    }


                    // cleanedArr.push(word)
                    finalArr.push(word)

                }


                return finalArr.join(" ").trim().toUpperCase()


            }
            console.log("----------------- COMPLETED EXECUTING FILE: scraper.js -----------------")

            require(`${__dirname}/sorter.js`)
        } catch (e) {
            console.log(e)
        }


    })();
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

