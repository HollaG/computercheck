const puppeteer = require("puppeteer")
const fs = require('fs-extra')

const links = {
    "Challenger": ['https://www.hachi.tech/pc-go/notebooks-desktops/notebooks-laptops'],
    "Best Denki": ['https://www.bestdenki.com.sg/catalog/computer/category/laptop-3094/category/gaming-laptop-3728'],
    "Courts": ['https://www.courts.com.sg/computing-mobile/laptops/all-laptops?product_list_limit=32'],
    "Harvey Norman": ['https://www.harveynorman.com.sg/computing/computers-en/laptops-en/'],
    "Gain City": ['https://www.gaincity.com/catalog/category/160/laptops']

}





const brands = []


    ; (async () => {
        try {
            const browser = await puppeteer.launch({ headless: false });

            /* SECTION FOR GAIN CITY */
            const gainPage = await browser.newPage()
            await gainPage.goto(links["Gain City"][0], {waitUntil: 'networkidle0'})
            gainPage.on('console', consoleObj => console.log(consoleObj.text()))
            // Gain city automatically loads more items if we scroll down, so run a function to scroll all the way down until we can't anymore
            await gainPage.evaluate(async() => {
                // Scroll to bottom function        
                const delay = 2000;
                const wait = (ms) => new Promise(res => setTimeout(res, ms));
                
                const scrollDown = async () => { 
                    // Scroll to footer, which is always at the bottom
                    document.querySelectorAll(".product-item-info")[document.querySelectorAll(".product-item-info").length-1] .scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' })
                }     
                
                const run = async()=> {
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
            
            let gainData = await gainPage.evaluate(() => {
                let items = document.querySelectorAll(".product-item-info") 
                let products = []
                items.forEach(item => { 
                    
                    let childName = item.querySelector(".product-item-link").innerText
                    if (!childName) childName = "MISSING INFO"
                    console.log(childName)
                    let price = item.querySelector(".price").innerText
                    let brand = childName.split(" ")[0]
                    

                    let link = item.querySelector(".product-item-link").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                    products.push({
                        name: childName, price, brand, link,
                        location: "Gain City"
                    })
                })
                return products
                    
                
            })
            await gainPage.close()
            // Write to file
            fs.writeFile(`${process.cwd()}/data/raw/gain.json`, JSON.stringify(gainData), (err, file) => { 
                if (err) console.log(err)
            })

            

            /* SECTION FOR HARVEY NORMAN */
            
            // Create new tab
            const harveyPage = await browser.newPage()

            // Go to harvey norman laptop page
            await harveyPage.goto(links["Harvey Norman"][0], {waitUntil: 'networkidle0'})

            // Get the number of pages (Total / 20)
            let harveyPages = await harveyPage.evaluate(() => Math.ceil(Number(document.querySelector("#pagination_contents > div.toolbar > div > div:nth-child(2) > div > div.pagination-amount.col-xs-4").innerText.split(" ")[0]) / 20))
            

            await harveyPage.close()

            let HARVEYPRODUCTS = []
            for (var i = 1; i <= harveyPages; i++) { 
                let url = `https://www.harveynorman.com.sg/computing/computers-en/laptops-en/page-${i}/`
                const productPage = await browser.newPage()
                await productPage.goto(url, {waitUntil: 'networkidle0'})
                let products = await productPage.evaluate(() => { 
                    let items = document.querySelector(".col-xs-12.col-sm-9.col-md-9.omega").querySelectorAll('form')
                    let products = []
                    items.forEach(item => { 
                        let childName = item.querySelector(".product-info > a").getAttribute("title").trim().toUpperCase()
                        if (!childName) childName = "MISSING INFO"

                        let price = item.querySelector(".price").innerText.trim().toUpperCase()
                        let brand = childName.split(" ")[0]
                        let link = item.querySelector(".product-info > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                        products.push({
                            name: childName, brand, price, link,
                            location: "Harvey Norman"
                        })
                    })
                    return products
                })

                HARVEYPRODUCTS.push(...products)
                await productPage.close()
            }
            fs.writeFile(`${process.cwd()}/data/raw/harvey.json`, JSON.stringify(HARVEYPRODUCTS), (err, file) => { 
                if (err) console.log(err)
            })
            
            


            /* SECTION FOR CHALLENGER */
            
            // Create new tab
            const challengerPage = await browser.newPage();

            // Go to Challenger home page (hachi.tech)            
            await challengerPage.goto(links["Challenger"][0], { waitUntil: 'networkidle2' })
            

            // Click on the 'Load More' button
            await challengerPage.$eval("button[class='ivu-btn ivu-btn-default']", loadMoreBtn => loadMoreBtn.click())
            

            // Challenger automatically loads more items if we scroll down, so run a function to scroll all the way down until we can't anymore
            await challengerPage.evaluate(async() => {
                // Scroll to bottom function        
                const delay = 2000;
                const wait = (ms) => new Promise(res => setTimeout(res, ms));
                const count = async () => document.querySelectorAll('.search-item-box').length;
                const scrollDown = async () => { 
                    // Scroll to footer, which is always at the bottom
                    document.querySelector('footer[class="footer text-muted"]').scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' })
                }     
                
                const run = async()=> {
                    let preCount = 0;
                    let postCount = 0;
                    do {
                        preCount = await count();
                        await scrollDown();
                        await wait(delay);
                        postCount = await count();
                    } while (postCount > preCount);
                    await wait(delay);
                    return
                }
                await run()
                
            })
            

            // Scrape the page to get the details of products

            let challengerData = await challengerPage.evaluate(() => {

                // Individual item
                let items = document.querySelectorAll("div[class='search-item-box']")
                

                let products = []
                
                items.forEach(item => {
                    
                   
                    let childName = item.querySelector(".product-name > div > span > span").getAttribute("aria-label").toUpperCase().trim()                    
                    if (!childName) childName = "MISSING INFO"
                    
                    let UPElement = item.children[0].children[0].children[2].children[0].children[2].children[0]
                    let price;
                    if (!UPElement) {
                        // Only has valueclub price
                        price = item.children[0].children[0].children[2].children[0].children[0].innerHTML
                    } else {
                        price = item.children[0].children[0].children[2].children[0].children[2].children[0].innerHTML
                    }
                    let cleanedNoBracket = childName.replace(/ *\[[^\]]*]/g, '').trim()
                    
                    let brand = cleanedNoBracket.split(" ")[0].trim().toUpperCase()
                    
                    let link = item.querySelector(".item-body > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                    
                    products.push({
                        name: childName, price, brand, link,
                        location: "Challenger"

                    })
                })



                return products
            })
            
            await challengerPage.close()
            // Write to file
            fs.writeFile(`${process.cwd()}/data/raw/challenger.json`, JSON.stringify(challengerData), (err, file) => { 
                if (err) console.log(err)
            })
            
            

            /* SECTION FOR BEST DENKI */
            
            let BESTPRODUCTS = []

            const bestPage = await browser.newPage();
            await bestPage.goto(links["Best Denki"][0], { waitUntil: 'networkidle0' })

            

            let bestData = await bestPage.evaluate((brands) => {

                let items = Array.from(document.querySelectorAll(".product-content"))
                let products = []
                items.forEach(item => {
                    let childName = item.querySelector(".title").querySelector('a').innerHTML.toUpperCase().trim()
                    if (!childName) childName = "MISSING INFO"
                    
                    let price = item.querySelector(".price").firstElementChild.innerHTML.toUpperCase().trim()
                    
                    
                    let brand = item.firstElementChild.innerHTML.trim().toUpperCase()
                    let link = item.querySelector(".title").querySelector('a').getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                    if (!brands.includes(brand)) brands.push(brand)
                    products.push({
                        name: childName, price, brand, link,
                        location: "Best Denki"

                    })


                })

                var pages = document.querySelector(".pager-current").innerHTML.split("of")[1]
                return {products, pages}


                
            }, brands)
            
            let bestPages = bestData.pages
            BESTPRODUCTS = bestData.products
            
            
            await bestPage.close()


            for (var i = 1; i < bestPages; i++) {
                
                let url = `https://www.bestdenki.com.sg/catalog/computer/category/laptop-3094/category/gaming-laptop-3728?page=${i}`
                console.log(url)

                const productPage = await browser.newPage();
                await productPage.waitForTimeout(1000)
                await productPage.goto(url, { waitUntil: 'networkidle0' })
                let products = await productPage.evaluate((brands) => {
                    let items = Array.from(document.querySelectorAll(".product-content"))
                    
                    let products = []
                    items.forEach(item => {
                        var childName = item.querySelector(".title").querySelector('a').innerHTML.trim()
                        var price = item.querySelector(".price").firstElementChild.innerHTML.trim()
                        let brand = item.firstElementChild.innerHTML.trim().toUpperCase()
                        let link = item.querySelector(".title").querySelector('a').getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                        if (!brands.includes(brand)) brands.push(brand)
                        products.push({
                            name: childName, price, brand, link,
                            location: "Best Denki"
                        })


                    })
                    return products

                }, brands)
                await productPage.close()

                
                BESTPRODUCTS.push(...products)

              
                

            }
            
            
            
            fs.writeFile(`${process.cwd()}/data/raw/best.json`, JSON.stringify(BESTPRODUCTS), (err, file) => { 
                if (err) console.log(err)
            })

            

            /* SECTION FOR COURTS */

            const courtsPage = await browser.newPage()
            await courtsPage.goto(links["Courts"][0], { waitUntil: 'networkidle0' })

            // Find out how many pages there are
            // Total products divided by # per page (32)
            let courtsPages = await courtsPage.evaluate(() => Math.ceil(Number(document.querySelector('.product-count').innerText.split(" ")[0]) / 32))
            console.log(courtsPages)

            let COURTSPRODUCTS = []
            for (let i = 1; i <= courtsPages; i++) { 
                let url = `https://www.courts.com.sg/computing-mobile/laptops/all-laptops?p=${i}&product_list_limit=32`
                const productPage = await browser.newPage();                
                await productPage.goto(url, { waitUntil: 'networkidle0' })

                let products = await productPage.evaluate(() => {
                    let items = Array.from(document.querySelectorAll(".equal-height-block"))
                    let products = []
                    items.forEach(item => { 
                        let childName = item.querySelector(".product-item-name").innerText.trim().toUpperCase()
                        if (!childName) childName = "MISSING INFO"

                        // First word is the brand
                        let brand = childName.split(" ")[0]
                        let price = item.querySelector(".price").innerText.trim().toUpperCase()
                        let link = item.querySelector(".product-item-name > a").getAttribute("href").match(/((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/i)[0]
                        products.push({
                            name: childName, brand, price, link,
                            location: "Courts"
                        })
                    })
                    return products
                })
                console.log(products)
                COURTSPRODUCTS.push(...products)

                
                
                await productPage.close()
                
            }
            fs.writeFile(`${process.cwd()}/data/raw/courts.json`, JSON.stringify(COURTSPRODUCTS), (err, file) => { 
                if (err) console.log(err)
            })
            

            
            await browser.close()


        } catch (e) {
            console.log(e)
        }


    })();


