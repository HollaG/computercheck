const fs = require("fs-extra")
const mysql = require("mysql2/promise")
const puppeteer = require("puppeteer")

const db = require("../configuration/database.json")
const pool = mysql.createPool(db)


var startTime = new Date().getTime()
console.log("Started script at " + startTime)

    
    ; (async () => {
        let conn = null
        try {
            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)
            const main = await fs.readJSON(`${process.cwd()}/data/main.json`)
            const unidentified = main["unidentified"]

            const browser = await puppeteer.launch({ headless: false });

            conn = await pool.getConnection()
            let stores = await conn.query(`SELECT DISTINCT location FROM data ORDER BY location ASC`)
            stores = stores[0] 

            for (let i = 0; i < unidentified.length; i++) {
                let model = unidentified[i]
                console.log(model.location)


                switch (model.location) { 
                    case "Harvey Norman":
                        break // TODO
                        console.log(model.link)
                        const hnPage = await browser.newPage()
                        await hnPage.goto(model.link, {waitUntil: "networkidle2"})
                        let model_ID = await hnPage.$eval("#content_features > div > table:nth-child(3)", table => {
                            let headings = Array.from(table.querySelectorAll('tr > th'))
                            let index;
                            headings.forEach(heading => { 
                                if (heading.innerText.toUpperCase() == "MODEL") index = headings.indexOf(heading) + 1
                            })  
                            return table.querySelector(`tr:nth-child(${index}) > td`).innerText.toUpperCase().trim()

                        })
                        console.log(model_ID)
                        if (!model_ID) searchMfgWebsite(model) 
                        else model.model_ID = model_ID
                        
                        break;
                    case "Challenger":
                        // Scrape the site for possible ID linking to minisite
                        console.log("Scraping for " + model.name)
                        const cPage = await browser.newPage()
                        await cPage.goto(model.link, {waitUntil: "networkidle0"})
                        
                        let modelName = await cPage.evaluate(() => {
                            let elem = document.querySelector(".flix-model-title")
                            if (!elem) { 
                                return ""
                            } else {
                                return elem.innerText.trim().toUpperCase()
                            }
                        })
                        console.log("Model: " + modelName)    

                        let isNotModel = false
                        for (word of modelName.split(" ")) { 
                            if (dictionary[word.toLowerCase()] || extras[word.toLowerCase]) { 
                                isNotModel = true
                                break;
                            }
                        }
                        
                        await cPage.close()
                        
                        if (isNotModel) { 
                            model.model_ID = ""
                            // await searchMfgWebsite(model)
                        } else { 
                            model.model_ID = modelName
                        }


                        // let possibleURLs = await cPage.evaluate(() => { 
                        //     document['getElementsByRegex'] = function(pattern){
                        //         var arrElements = [];   // to accumulate matching elements
                        //         var re = new RegExp(pattern);   // the regex to match with
                             
                        //         function findRecursively(aNode) { // recursive function to traverse DOM
                        //            if (!aNode) 
                        //                return;
                        //            if (aNode.id !== undefined && aNode.id.search(re) != -1)
                        //                arrElements.push(aNode);  // FOUND ONE!
                        //            for (var idx in aNode.childNodes) // search children...
                        //                findRecursively(aNode.childNodes[idx]);
                        //         };
                             
                        //         findRecursively(document); // initiate recursive matching
                        //         return arrElements; // return matching elements
                        //     };

                        //     let elements = document.getElementsByRegex('inpage-data-.*');
                        //     let possibleURLs = elements.map(x => `https://media.flixcar.com/delivery/minisite/show/7137/b7/${x.id.split("-")[2]}`)
                        //     return possibleURLs // Possible IDs for minisite                            
                        // })

                        // console.log("Found possible URLS: " , possibleURLs)
                        // if (possibleURLs.length) { 
                        //     // if there are possible minisites
                        //     let possibleModels = [] // possible models
                        //     const pSite = await browser.newPage()
                        //     for (let i = 0; i < possibleURLs.length; i++) { 
                        //         let possibleSite = possibleURLs[i]
                                
                        //         await pSite.goto(possibleSite, {waitUntil: "networkidle2"})
                        //         let model = await pSite.$eval(".flix-model-title", elem => elem.innerText)
                                                               
                        //         possibleModels.push(model)
    
                        //     }
                        //     console.log("Found possible models: ", possibleModels)
                        //     let finalModel = "Model identification failed"
                        //     if (possibleModels.length > 1) {
                        //         for (model of possibleModels) { 
                        //             let isModel = true
                        //             for (word of model.split(" ")) { 
                                        
                        //                 if (dictionary[word] || extras[word]) {
                        //                     // if the model text contains at least one english word, it probably isn't the model
                                            
                        //                     isModel = false
                        //                     break;
                        //                 }
                        //             }
                        //             if (isModel) finalModel = model
                        //         }
                        //     } else { 
                        //         finalModel = possibleModels[0]
                        //     }
                        //     console.log("Final model: " + finalModel)
                        //     await pSite.close()
                        //     await cPage.close()
                        // } else { 
                        //     // try other options
                        //     await cPage.close()
                        //     searchMfgWebsite(model)
                        // }
                        
                    
                        break;
                    // default: await searchMfgWebsite(model)
                }
                async function searchMfgWebsite(model) {

                    
                    switch (model.brand) {

                        case "ACER": 
                            break // TODO
                            const aPage = await browser.newPage()


                        case "LENOVO": 
                            break // TODO
                            const cPage = await browser.newPage()
                            await cPage.goto(`https://www.lenovo.com/sg/en/search?text=${model.name}`, {waitUntil: 'networkidle2'})
                            let productPage = await cPage.$eval('.product-card-link', elem => elem.getAttribute("href"))
                            await cPage.goto(productPage, {waitUntil: 'networkidle2'})
                            let model_ID = await cPage.$eval(".partNumber", elem => {
                                let text = elem.innerText
                                return elem.innerText.replace("Part Number:").trim().toUpperCase()
                            })
                            model.model_ID = model_ID
                            cPage.close()
                            break;
                        default: return
                    }
                }
            }
            await fs.writeFile(`${process.cwd()}/data/temp.json`, JSON.stringify(unidentified))
            await browser.close()
        } catch (e) {
            console.log(e)
        }




        }) ();