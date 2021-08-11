const puppeteer = require("puppeteer-extra")
const { Cluster } = require('puppeteer-cluster');
const fs = require('fs-extra')
const axios = require("axios")
const links = {
    "Challenger": [
        {
            "requests": [
                {
                    "indexName": "hachisearchengine",
                    "params": "filters=active_sites%3AHSG&maxValuesPerFacet=1&query=&hitsPerPage=1000&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=0&tagFilters=&facetFilters=%5B%5B%22boutiquecates.subcategory%3APc%20%26%20Notebooks%20%3E%20Notebooks%20%26%20Desktops%20%3E%20Notebooks%20%26%20Laptops%22%5D%5D"
                }, // For Windows Laptops

                {
                    "indexName": "hachisearchengine",
                    "params": "filters=active_sites%3AHSG&maxValuesPerFacet=1&query=&hitsPerPage=1000&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=0&tagFilters=&facetFilters=%0A%0A%5B%5B%22boutiquecates.subcategory%3AApple%20%3E%20Mac%20%3E%20Macbook%20Pro%22%5D%5D%0A%0A"
                }, // For macbook pros

                {
                    "indexName": "hachisearchengine",
                    "params": "filters=active_sites%3AHSG&maxValuesPerFacet=1&query=&hitsPerPage=1000&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=0&tagFilters=&facetFilters=%5B%5B%22boutiquecates.subcategory%3AApple%20%3E%20Mac%20%3E%20Macbook%20Air%22%5D%5D"
                }
            ] // for macbook Airs
        }
    ],
    "Best Denki": ['https://www.bestdenki.com.sg/catalog/computer/category/laptop-3094/category/gaming-laptop-3728'],
    "Courts": ['https://www.courts.com.sg/computing-mobile/laptops/all-laptops?product_list_limit=32'],
    "Harvey Norman": ['https://www.harveynorman.com.sg/computing/computers-en/laptops-en/'],
    "Gain City": ['https://www.gaincity.com/catalog/category/160/laptops']

}

const puppeteerLinks = {
    "Best Denki": ['https://www.bestdenki.com.sg/catalog/computer/category/laptop-3094/category/gaming-laptop-3728'],
    "Courts": ['https://www.courts.com.sg/computing-mobile/laptops/all-laptops?product_list_limit=32'],
    "Harvey Norman": ['https://www.harveynorman.com.sg/computing/computers-en/laptops-en/'],
    "Gain City": ['https://www.gaincity.com/catalog/category/160/laptops']
}


const headless = true
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CLUSTEROPTS = {
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    timeout: 150 * 1000,
    puppeteer,
    sameDomainDelay: 500,
    workerCreationDelay: 500,
    monitor: true
}

const brands = []


    ; (async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
        try {
            const browser = await puppeteer.launch({ headless, args: ['--no-sandbox'] });
            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)


            await harvey()
            await challenger()
            await gain()
            await courts()
            await best()


            /* SECTION FOR GAIN CITY */
            async function gain() { // Confidence: 3
                console.log("PUPPETEER: Scraping Gain City")

                const gainPage = await browser.newPage()

                await gainPage.goto(links["Gain City"][0], { waitUntil: 'networkidle0' })
                await gainPage.exposeFunction("cleaner", cleaner)


                // Gain city automatically loads more items if we scroll down, so run a function to scroll all the way down until we can't anymore
                console.log("PUPPEETER: Scrolling page")
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

                        products.push({
                            name: childName, price, brand, link, model_ID, image_url,
                            location: "Gain City"
                        })
                    }
                    return products


                })
                await gainPage.close()
                // Write to file
                fs.writeFile(`${process.cwd()}/data/raw/gain.json`, JSON.stringify(gainData), (err, file) => {
                    if (err) console.log(err)
                })
                return true
            }



            /* SECTION FOR HARVEY NORMAN */

            async function harvey() {
                console.log("PUPPETEER: Scraping Harvey Norman")



                // Create new tab
                const harveyPage = await browser.newPage()

                // Go to harvey norman laptop page
                await harveyPage.goto(links["Harvey Norman"][0], { waitUntil: 'networkidle0', timeout: 0 })

                // Get the number of pages (Total / 20)
                let harveyPages = await harveyPage.evaluate(() => Math.ceil(Number(document.querySelector("#pagination_contents > div.toolbar > div > div:nth-child(2) > div > div.pagination-amount.col-xs-4").innerText.split(" ")[0]) / 20))
                console.log("PUPPEETER: Found pages: " + harveyPages)


                await harveyPage.close()

                const cluster = await Cluster.launch({
                    CLUSTEROPTS
                });

                await cluster.task(async ({ page, data }) => {
                    try {
                        let url = data.url
                        console.log(url)
                        let i = data.i
                        console.log("PUPPEETER-CLUSTER: Scraping page " + i + " of " + harveyPages)
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 })
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



                                products.push({
                                    name: childName, brand, price, link, image_url,
                                    location: "Harvey Norman"
                                })
                            })
                            return products
                        })

                        for (let j = 0; j < products.length; j++) {
                            console.log("PUPPEETER-CLUSTER: Scraping model " + (j + 1) + " of " + products.length + " (Page " + i + ")")

                            let product = products[j]
                            // Query the product page to get the model data

                            await page.goto(product.link, { waitUntil: "domcontentloaded", timeout: 0 })
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


                    let url = `https://www.harveynorman.com.sg/computing/computers-en/laptops-en/page-${i}/`
                    // console.log("queueing" + url)
                    cluster.queue({ url, i })
                }

                await cluster.idle()
                await cluster.close()
                fs.writeFile(`${process.cwd()}/data/raw/harvey.json`, JSON.stringify(HARVEYPRODUCTS), (err, file) => {
                    if (err) console.log(err)
                })
                console.log("PUPPEETER: Completed scraping Harvey Norman")

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

                    fs.writeFile(`${process.cwd()}/data/raw/challenger.json`, JSON.stringify(products), (err, file) => {
                        if (err) console.log(err)
                    })
                    return true
                } catch (e) {
                    console.log(e)
                    throw e
                }


            }
            // await challenger()




            /* SECTION FOR BEST DENKI */
            async function best() {
                console.log("PUPPETEER-CLUSTER: Scraping Best Denki")

                let BESTPRODUCTS = []
                const bestPage = await browser.newPage()
                await bestPage.goto(links["Best Denki"][0], { waitUntil: 'domcontentloaded' })
                let pages = await bestPage.$eval("#grid-view > div > div > div.item-list > ul > li.pager-current", elem => elem.innerHTML.split("of")[1])
                console.log("PUPPETEER: Found pages: " + pages)

                await bestPage.close()

                const cluster1 = await Cluster.launch({
                    CLUSTEROPTS
                });

                await cluster1.task(async ({ page, data }) => {
                    try {
                        let url = data.url
                        let i = data.i
                        console.log("PUPPETEER-CLUSTER (1): Scraping page " + (i + 1) + " of " + pages)

                        await page.goto(url, { waitUntil: 'networkidle2' })
                        await page.exposeFunction("cleaner", cleaner)
                        let products = await page.evaluate(async () => {
                            let items = Array.from(document.querySelectorAll(".portfolio-wrapper"))

                            let products = []


                            for (item of items) {
                                var childName = item.querySelector(".title").querySelector('a').innerHTML.trim()
                                var price = item.querySelector(".price").firstElementChild.innerHTML.trim()
                                let brand = item.querySelector(".product-content").firstElementChild.innerHTML.trim().toUpperCase()
                                let link = item.querySelector(".title").querySelector('a').getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                                if (!link.match(/^https?:\/\//g)) link = "https://" + link
                                // let model_ID = await cleaner(link.split("/")[link.split("/").length-1]) // the model is the ending of the url
                                let image_url = item.querySelector('img').getAttribute("data-echo")
                                if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url



                                products.push({
                                    name: childName, price, brand, link, image_url,
                                    location: "Best Denki"
                                })



                            }

                            return products

                        })



                        BESTPRODUCTS.push(...products)
                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })


                for (var i = 0; i < pages; i++) {

                    let url = `https://www.bestdenki.com.sg/catalog/computer/category/laptop-3094/category/gaming-laptop-3728?page=${i}`

                    cluster1.queue({ url, i })

                }

                await cluster1.idle()
                await cluster1.close()

                const cluster2 = await Cluster.launch({
                    CLUSTEROPTS
                });
                await cluster2.task(async ({ page, data }) => {

                    try {
                        let url = data.url
                        let i = data.i
                        console.log("PUPPETEER-CLUSTER (2): Scraping model " + (i + 1) + " of " + BESTPRODUCTS.length)
                        await page.exposeFunction("cleaner", cleaner)

                        await page.goto(url, { waitUntil: "networkidle0" })
                        // bestPage.on('console', consoleObj => console.log(consoleObj.text()));
                        let model_ID = await page.evaluate(() => {
                            let elem = document.querySelector('#mCSB_1_container > div > div > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2)')
                            if (!elem) {
                                // fallback to using the URL

                                return location.href.split("/")[location.href.split("/").length - 1]

                            } else {
                                return elem.innerText
                            }
                        })
                        BESTPRODUCTS[i].model_ID = await cleaner(model_ID) ? await cleaner(model_ID) : "UNIDENTIFIED"
                        return true
                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })


                for (let i = 0; i < BESTPRODUCTS.length; i++) {



                    let product = BESTPRODUCTS[i]
                    let url = product.link

                    cluster2.queue({url, i})
                    continue
                    // Open the product page, grab the model
                    await bestPage.goto(url, { waitUntil: "networkidle0" })
                    // bestPage.on('console', consoleObj => console.log(consoleObj.text()));
                    let model_ID = await bestPage.evaluate(() => {
                        let elem = document.querySelector('#mCSB_1_container > div > div > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2)')
                        if (!elem) {
                            // fallback to using the URL

                            return location.href.split("/")[location.href.split("/").length - 1]

                        } else {
                            return elem.innerText
                        }
                    })
                    product.model_ID = await cleaner(model_ID) ? await cleaner(model_ID) : "UNIDENTIFIED"

                }


                await cluster2.idle()
                await cluster2.close()

                fs.writeFile(`${process.cwd()}/data/raw/best.json`, JSON.stringify(BESTPRODUCTS), (err, file) => {
                    if (err) console.log(err)

                })
                console.log("PUPPETEER-CLUSTER: Completed scraping Best Denki")


            }





            /* SECTION FOR COURTS */
            async function courts() {
                console.log("PUPPETEER-CLUSTER: Scraping Courts")


                const courtsPage = await browser.newPage()
                await courtsPage.goto(links["Courts"][0], { waitUntil: 'networkidle0' })

                // Find out how many pages there are
                // Total products divided by # per page (32)
                let courtsPages = await courtsPage.evaluate(() => Math.ceil(Number(document.querySelector('.product-count').innerText.split(" ")[0]) / 32))
                console.log("PUPPETEER: Found pages: " + courtsPages)

                await courtsPage.close()

                const cluster = await Cluster.launch({
                    CLUSTEROPTS
                });

                await cluster.task(async ({page, data}) => { 
                    try { 
                        let url = data.url
                        let i = data.i
                        console.log("PUPPETEER-CLUSTER: Scraping page " + i + " of " + courtsPages)
                        await page.goto(url, { waitUntil: 'networkidle0' })

                        await page.exposeFunction("cleaner", cleaner)
                        let products = await page.evaluate(async () => {
                            let items = Array.from(document.querySelector(".columns").querySelector(".product-items").querySelectorAll(".product-item-info"))
                            let products = []
                            for (item of items) {
                                let childName = item.querySelector(".product-item-name").innerText.trim().toUpperCase()
                                if (!childName) childName = "MISSING INFO"
    
                                // First word is the brand
                                let brand = childName.split(" ")[0]
                                let price = item.querySelector(".price").innerText.trim().toUpperCase()
                                let link = item.querySelector(".product-item-name > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                                if (!link.match(/^https?:\/\//g)) link = "https://" + link
    
                                let model_ID = await cleaner(childName) ? await cleaner(childName) : "UNIDENTIFIED"
    
                                let image_url = item.querySelector(".product-image-photo").getAttribute("data-original")
                                if (!image_url.match(/^https?:\/\//g)) image_url = "https://" + image_url
    
    
    
                                products.push({
                                    name: childName, brand, price, link, model_ID, image_url,
                                    location: "Courts"
                                })
                            }
                            return products
                        })
                        // console.log(products)
                        COURTSPRODUCTS.push(...products)
                    } catch (e) {
                        console.log(e)
                        return e
                    }
                })

                let COURTSPRODUCTS = []
                for (let i = 1; i <= courtsPages; i++) {
                    let url = `https://www.courts.com.sg/computing-mobile/laptops/all-laptops?p=${i}&product_list_limit=32`

                    cluster.queue({url, i})
                    

                }

                await cluster.idle()
                await cluster.close()
                fs.writeFile(`${process.cwd()}/data/raw/courts.json`, JSON.stringify(COURTSPRODUCTS), (err, file) => {
                    if (err) console.log(err)
                })
                console.log("PUPPETEER-CLUSTER: Completed scraping Courts")

                return true
            }


            await browser.close()
            function cleaner(string) {
                var original = string
                var string = string.trim().toLowerCase()


                // Replace all non-breaking space
                string = string.replace(/ /gi, " ")



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

        } catch (e) {
            console.log(e)
        }


    })();
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

