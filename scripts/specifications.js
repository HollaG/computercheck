const fs = require("fs-extra")
const mysql = require("mysql2/promise")
const puppeteer = require("puppeteer-extra")

const db = require("../configuration/database.json")
const pool = mysql.createPool(db)
const { Cluster } = require('puppeteer-cluster');
const axios = require("axios")
const SearchScraper = require("puppeteer-search-scraper")
var startTime = new Date().getTime()
console.log("Started script at " + startTime)
const headless = true
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const CLUSTEROPTS = {
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
    timeout: 150 * 1000,
    puppeteer,
    sameDomainDelay: 500,
    workerCreationDelay: 500,
    monitor: true,
    
}
String.prototype.lowerLize = function () {
    return this.charAt(0).toLowerCase() + this.slice(1);
}
    ; (async () => {
        let conn = null
        try {
            conn = await pool.getConnection()

            let items = await conn.query(`SELECT * FROM data`)
            items = items[0]
            // Sort into models

            const cluster = await Cluster.launch(CLUSTEROPTS)


            let sortedModels = items.reduce((r, a) => {
                r[a.model_ID] = [...r[a.model_ID] || [], a];
                return r;
            }, {});

            let queue_number = 0
            for (model_ID of Object.keys(sortedModels)) {
                sortedModels[model_ID] = sortedModels[model_ID].reduce((r, a) => {
                    r[a.location] = [...r[a.location] || [], a];
                    return r;
                }, {});

                queue_number++

                cluster.queue({
                    model: sortedModels[model_ID],
                    model_ID,
                    queue_number
                })

            }
            console.log(sortedModels)

            // cluster.queue({
            //     model_ID: 'FA506IV-1',
            //     model: { "Gain City": [{ link: 'https://www.gaincity.com/catalog/product/view/id/106853/s/T0156540/category/160/', name: 'ASUS LAPTOP 15.6" R7-4800H FA506IV-RTX20601' }] }
            // })



            let models = await conn.query(`SELECT * FROM model_data`)
            models = models[0]
            


            await cluster.task((async ({ page, data: model }) => {
                console.log("Running task " + model.queue_number + " of " + Object.keys(sortedModels).length)

                function getSpecifications(text) {
                    // Return specs:
                    // 1) Processor Brand (Intel / AMD / ARM)
                    // 2) Processor Model
                    // 3) RAM (int)
                    // 0) Storage (SEPARATE)
                    // 0) Graphics Card
                    // 6) Operating System (Windows 10 (Pro) / Mac OS)
                    // 7) Screen Size (int)
                    // 8) Screen Resolution [YYYYXZZZZ]


                    let processor = getProcessor(text)

                    return {
                        processorCompany: getProcessorCompany(processor), processor,
                        ram: getRam(text),
                        os: getOS(text),
                        screenSize: getScreenSize(text),
                        screenResolution: getScreenResolution(text)

                    }


                }


                function getProcessor(text) {
                    if (!text) return "-"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    if (text.match(/microsoft|surface/)) { 
                        // Test for microsoft SQ1 chips
                        if (text.match(/SQ\d/i)) return text.match(/SQ\d/i)[0].toUpperCase
                    }

                    if (text.match(/apple|mac(book)?/i)) {
                        // Test for apple M1 chips
                        if (text.match(/m\d/i)) return text.match(/m\d/i)[0].toUpperCase()
                    }
                    // Pentium chips
                    if (text.match(/N\d\d\d\d/i)) return text.match(/N\d\d\d\d/i)[0]
                    if (text.match(/\d\d\d\dy/i)) return text.match(/\d\d\d\dy/i)[0]
                    // Detect strings that have spaces between the model i.e. <space>i5<space>
                    if (text.match(/\si\d\s/i)) return text.match(/\si\d\s/i)[0].trim().lowerLize()

                    // R5-5600U / i7-117G6
                    if (text.match(/([ir]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)) return text.match(/([ir]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)[0].replace(/\s/gi, "-").toUpperCase().lowerLize()
                    if (text.match(/intel(\s?core)?\si\d/mi)) return text.match(/intel(\s?core)?\si\d/mi)[0].split(" ")[text.match(/intel(\s?core)?\si\d/mi)[0].split(" ").length - 1].lowerLize() // For 'INTEL i7' / 'INTEL I5'
                    return text.match(/((ryzen)?\s\d\s\d\d\d\d(\d?|(\d\d)?)\w\w?)|(ryzen [3579])/im) ? text.match(/((ryzen)?\s\d\s\d\d\d\d(\d?|(\d\d)?)\w\w?)|(ryzen [3579])/im)[0].trim().toUpperCase() : "-"
                }
                function getProcessorCompany(text) {
                    if (!text) return "-"

                    if (text == "-") return "-"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    
                    if (text.match(/(intel)|(i\d)|(i\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)) return "Intel"
                    if (text.match(/N\d\d\d\d/i)) return "Intel" // Pentiun N4000
                    if (text.match(/microsoft|surface/i)) return "Microsoft"
                    if (text.match(/apple|macbook/i)) return "Apple"
                    return "AMD"
                }
                function getRam(text) {
                    if (!text) return -1
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")


                    return Number(text.match(/\d\d?GB/im) ? text.match(/\d\d?GB/im)[0].replace(/[^0-9\.]+/g, "") : -1)
                }
                function getOS(text) {
                    if (!text) return "-"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    let os = text.match(/apple|mac/i) ? "Mac OS" : "Windows 10"
                    if (text.match(/pro/i)) os = os + " Pro"
                    return os
                }
                function getScreenSize(text) {
                    if (!text) return -1
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    let screenSize = text.match(/\d\d([,.]\d)?[-\s]in(ch)?/mi) ? text.match(/\d\d([,.]\d)?[-\s]in(ch)?/mi)[0] : -1
                    if (screenSize == -1) return -1
                    // Replace , with .
                    console.log(screenSize)
                    return Number(screenSize.replace(/,/gi, ".").replace(/-|i|n|c|h/gi, "").replace(/-|i|n|c|h/gi, "").trim())

                }
                function getScreenResolution(text) {
                    if (!text) return "-1X-1"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    let screenResolution = text.match(/\d\d\d\dx\d\d\d\d?/im) ? text.match(/\d\d\d\dx\d\d\d\d?/im)[0].toUpperCase() : "-1X-1" //
                    screenResolution = text.match(/(fhd)|full\s?hd/i) ? "1920X1080" : screenResolution
                    screenResolution = text.match(/qhd/i) ? "2560X1440" : screenResolution
                    screenResolution = text.match(/uhd/i) ? "3840X2160" : screenResolution
                    screenResolution = text.match(/2.8k/i) ? "2880X1800" : screenResolution
                    return screenResolution
                }

                function getStorage(text) {
                    if (!text) return "-"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    return text.match(/\d\d\d?\d?(GB|SSD)(\s?(SSD)|)?|\d(TB|SSD)(\s?(SSD)|)?/mi) ? text.match(/\d\d\d?\d?(GB|SSD)(\s?(SSD)|)?|\d(TB|SSD)(\s?(SSD)|)?/mi)[0] : "-"
                }

                function getGraphics(text) {
                    if (!text) return "-"
                    text = text.replace(/©|℗|®|™|/gi, "")
                    text = text.replace(/ /g, " ")

                    // Check for Nvidia
                    if (text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)) return `NVIDIA ${text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)[0].toUpperCase()}`

                    // Check for AMD
                    if (text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)) return `AMD ${text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)[0]}`

                    return "-"
                }

                await page.exposeFunction("getSpecifications", getSpecifications)
                await page.exposeFunction("getProcessor", getProcessor)
                await page.exposeFunction("getProcessorCompany", getProcessorCompany)
                await page.exposeFunction("getRam", getRam)
                await page.exposeFunction("getOS", getOS)
                await page.exposeFunction("getScreenSize", getScreenSize)
                await page.exposeFunction("getScreenResolution", getScreenResolution)
                await page.exposeFunction("getStorage", getStorage)
                await page.exposeFunction("getGraphics", getGraphics)
                // page.on('console', consoleObj => console.log(consoleObj.text()));

                let locations = Object.keys(model.model)
                // console.log(locations)
                if (locations.includes("Courts")) {
                    // try courts
                    let pass = await tryCourts()
                    if (pass) return true

                }
                if (locations.includes("Best Denki")) {
                    // try best Denki
                    let pass = await tryBest()
                    if (pass) return true
                }
                if (locations.includes("Harvey Norman")) { 
                    // Try Harvey
                    let pass = await tryHarvey()
                    if (pass) return true
                }
                if (locations.includes("Gain City")) {
                    // try gain city
                    let pass = await tryGain()
                    if (pass) return true
                }

                if (locations.includes("Challenger")) {
                    // Try Challenger (NOT RELIABLE)
                    // Literally just analyze the name
                    let pass = await tryChallenger()
                    if (pass) return true
                }

                console.log("--------------------------------")
                console.log("Couldn't find a match: ", model.model_ID, " , resorting to identification from model name")
                console.log("--------------------------------")

                let pass = await tryModelName()
                if (pass) return true
                return false
                // Order: 
                // Courts, Best, Harvey, Gain, Challenger



                async function tryCourts() {
                    try {
                        let url = model.model["Courts"][0].link
                        await page.goto(url, {
                            waitUntil: "networkidle2"
                        })


                        let specifications = await page.evaluate(async () => {
                            try {
                                let processor = await getProcessor(document.querySelector("#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(2) > span:nth-child(2)").innerText)

                                let processorCompany = await getProcessorCompany(document.querySelector("#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(2) > span:nth-child(2)").innerText)

                                let ram = await getRam(document.querySelector('#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(3) > span:nth-child(2)').innerText)

                                let storage = document.querySelector('#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(4) > span:nth-child(2)').innerText

                                let graphics = "-"

                                let os = await getOS(document.querySelector("#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(5) > span:nth-child(2)").innerText)

                                let screenSize = await getScreenSize(document.querySelector("#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.product-navision-desc > ul > li:nth-child(1) > span:nth-child(2)").innerText)

                                let screenResolution = "-1X-1"

                                return {
                                    processorCompany, processor, ram, storage, screenSize, screenResolution, graphics, os,
                                }

                            } catch (e) {
                                console.log(e)
                                return false

                            }


                        })
                        if (!specifications) return false
                        let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.graphics.toUpperCase(), specifications.os, model.model_ID]
                        console.log(specifications, model.model_ID)
                        console.log(arr)
                        await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, os = ? WHERE model_ID = ?`, arr)

                        await page.waitForTimeout(1000) // Timeout to prevent spam

                        return true

                    } catch (e) {
                        console.log(e)
                        return false
                    }
                }
                async function tryGain() {
                    let url = model.model["Gain City"][0].link
                    // Go to gain city home page, enter data into search bar, search
                    try {
                        await page.goto(url, {
                            waitUntil: 'networkidle2'
                        })

                        console.log("Running for model: ", model.model_ID)
                        let specifications = await page.evaluate(async () => {
                            try {

                                let text;

                                let elem = document.querySelector("#product\\.info\\.description > div > div > ul")
                                if (elem.childElementCount > 3) text = elem.innerText
                                else return false

                                let processor = await getProcessor(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(1) > span.usp_value").innerText)

                                let processorCompany = await getProcessorCompany(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(1) > span.usp_value").innerText)

                                let ram = await getRam(document.querySelector('#product\\.info\\.description > div > div > ul > li:nth-child(3) > span.usp_value').innerText)

                                let storage = document.querySelector('#product\\.info\\.description > div > div > ul > li:nth-child(2) > span.usp_value').innerText

                                let graphics, os, screenSize, screenResolution

                                if (text.match(/graphics/i)) {
                                    graphics = document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText

                                    os = await getOS(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(6) > span.usp_value").innerText)

                                    screenSize = await getScreenSize(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)

                                    screenResolution = await getScreenResolution(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)
                                } else {
                                    graphics = "-"

                                    os = await getOS(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)

                                    screenSize = await getScreenSize(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)

                                    screenResolution = await getScreenResolution(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)
                                }

                                return {
                                    processorCompany, processor, ram, storage, screenSize, screenResolution, graphics, os,
                                }


                            } catch (e) {
                                console.log(e)
                                throw e
                            }

                        })

                        if (!specifications) return false
                        console.log(specifications, model.model_ID)
                        let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.graphics.toUpperCase(), specifications.os, model.model_ID]

                        await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, os = ? WHERE model_ID = ?`, arr)
                        await page.waitForTimeout(1000) // Timeout to prevent spam

                        return true


                    } catch (e) {
                        console.log(e)
                        return false
                    }

                }

                async function tryBest() {
                    console.log("TRYING BEST ", model.model_ID)
                    let url = model.model["Best Denki"][0].link
                    try {
                        await page.goto(url, {
                            waitUntil: 'networkidle2'
                        })

                        let specifications = await page.evaluate(async () => {
                            try {
                                let text = document.querySelector("#main-content > div.row.display-content > div.col-lg-4.col-sm-12.col-md-12.col-xs-12 > div > div.fsz-14 > div > div > div > p:nth-child(1)").innerText
                                // Split into lines by \n
                                let textArray = text.split("\n").filter(e => e);

                                let processor = await getProcessor(textArray[0])
                                text = text.replace(processor, "")

                                let processorCompany = await getProcessorCompany(textArray[0])

                                let ram = await getRam(textArray[2])
                                text = text.replace(ram, "")

                                let storage = await getStorage(text)

                                let graphics = textArray[3]

                                let os = await getOS(text)

                                let screenSize = await getScreenSize(textArray[4])

                                let screenResolution = await getScreenResolution(textArray[4])

                                return {
                                    processorCompany, processor, ram, storage, screenSize, screenResolution, graphics, os,
                                }

                            } catch (e) {
                                console.log(e.toString())
                                throw e
                            }

                        })
                        if (!specifications) return false

                        console.log(specifications, model.model_ID)
                        let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.graphics.toUpperCase(), specifications.os, model.model_ID]

                        await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, os = ? WHERE model_ID = ?`, arr)
                        await page.waitForTimeout(1000) // Timeout to prevent spam
                        return true


                    } catch (e) {
                        console.log(e)
                        return false
                    }

                }

                async function tryChallenger() {
                    // VERY NOT GOOD
                    let url = model.model["Challenger"][0].link
                    let product_ID = url.split("/")[url.split("/").length - 1]

                    try {
                        let text = model.model["Challenger"][0].name
                        

                        let processor = getProcessor(text)


                        let processorCompany = processor == "-" ? "-" : getProcessorCompany(text)
                        text = text.replace(new RegExp(`${processor}`, 'i'), "")

                        let ram = getRam(text)
                        text = text.replace(ram, "")

                        let storage = getStorage(text)

                        let graphics = '-'

                        let os = getOS(text)

                        let screenSize = "-1"

                        let screenResolution = "-1X-1"


                        let arr = [processorCompany, processor, ram, storage, screenSize, screenResolution.split("X")[0], screenResolution.split("X")[1], graphics.toUpperCase(), os, model.model_ID]
                        console.log(arr, model.model_ID)
                        await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, os = ? WHERE model_ID = ?`, arr)
                        return true
                    } catch (e) {
                        console.log(e)
                        return false
                    }

                }

                async function tryHarvey() {
                    let url = model.model["Harvey Norman"][0].link
                    try {
                        await page.goto(url, {
                            waitUntil: "networkidle2"
                        })
                        console.log(url)
                        let specifications = await page.evaluate(async (model) => {
                            try {

                                // 2 scenarios: "specifications tab" vs "main tab"  
                                let text = document.querySelector("#content_description > div > ul:nth-child(4)")
                                let processorCompany, processor, ram, storage, screenSize, screenResolution, graphics, os
                                if (text) {
                                    processor = await getProcessor(text)
                                    processorCompany = await getProcessorCompany(text)
                                    ram = await getRam(text)
                                    // Remove the ram
                                    text = text.replace(ram, "")
                                    storage = await getStorage(text)
                                    screenSize = -1 // Unable to determine
                                    screenResolution = await getScreenResolution(text)
                                    graphics = await getGraphics(text) // Unable to determine
                                    os = await getOS(text)

                                } else {

                                    // First, form an object with table headers as keys
                                    let obj = {}
                                    document.querySelectorAll("th").forEach(thElem => {
                                        let td = thElem.parentElement.lastElementChild
                                        let header = thElem.innerText
                                        obj[header] = td.innerText
                                    })




                                    processor = await getProcessor(`${obj["Processor Type"]} ${obj["Processor Model"]}`)
                                    processorCompany = obj["Processor Brand"] ? obj["Processor Brand"] : await getProcessorCompany(processor)
                                    // ram = await getRam(obj["RAM (GB)"])

                                    let name = model.model["Harvey Norman"][0].name
                                    ram = await getRam(name)
                                    name = name.replace(ram, "")


                                    storage = await getStorage(name)
                                    screenSize = -1 // Unable to determine
                                    screenResolution = await getScreenResolution(text)
                                    graphics = await getGraphics(name) // Unable to determine
                                    os = await getOS(name)
                                }




                                return {
                                    processorCompany, processor, ram, storage, screenSize, screenResolution, graphics, os,
                                }

                            } catch (e) {
                                console.log(e.toString())
                                throw e
                            }

                        }, model)
                        if (!specifications) return false
                        console.log(specifications, model.model_ID)

                        let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.graphics.toUpperCase(), specifications.os, model.model_ID]

                        await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, os = ? WHERE model_ID = ?`, arr)

                        await page.waitForTimeout(1000) // Timeout to prevent spam

                        return true


                    } catch (e) {
                        console.log(e)
                        return false
                    }
                }

                async function tryModelName() {
                    try {// Only processor, ram, storage
                        console.log(model.model[Object.keys(model.model)[0]], "<<<<<<<<")
                        let text = model.model[Object.keys(model.model)[0]][0].name
                        let processor = getProcessor(text)

                        let processorCompany = processor == "-" ? "-" : getProcessorCompany(text)

                        let ram = getRam(text)
                        text = text.replace(ram, "")

                        let storage = getStorage(text)

                        let os = getOS(text)

                        let arr = [processorCompany, processor, ram, storage, os, model.model_ID]
                        console.log(arr, model.model_ID)

                        // await conn.query(`UPDATE model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, os = ? WHERE model_ID = ?`, arr)

                        await page.waitForTimeout(1000) // Timeout to prevent spam

                        return true
                    } catch (e) {
                        console.log(e)
                    }
                }


            }))
            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)


            await cluster.idle()
            // await conn.commit()
            await cluster.close();
            return true
        } catch (e) {
            console.log(e)
        }


        // console.log(cleaner("MICROSOFT SURFACE LAPTOP 4 5PB-00018 13IN AMD RYZEN 5 8GB 256SSD WIN10"))
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
            var stringArr = string.split(" ")


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
    })();




