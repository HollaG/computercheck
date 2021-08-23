console.log("----------------- EXECUTING FILE: specifications.js -----------------")

const fs = require("fs-extra")
const mysql = require("mysql2/promise")
const puppeteer = require("puppeteer-extra")

const db = require("../../configuration/database.json")
const pool = mysql.createPool(db)
const { Cluster } = require('puppeteer-cluster');
const axios = require("axios")
const SearchScraper = require("puppeteer-search-scraper")
var startTime = new Date().getTime()
console.log("Started script at " + startTime)
const headless = true
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const pageTimeout = 5 * 1000 * 60
const CLUSTEROPTS = {
    puppeteer,
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 2,
    timeout: 60 * 1000 * 60 * 24,

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
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu',
            // '--no-sandbox'
        ]
    }
}
String.prototype.lowerLize = function () {
    return this.charAt(0).toLowerCase() + this.slice(1);
}

module.exports.specs = async () => {
    let conn = null
    try {
        conn = await pool.getConnection()

        let items = await conn.query(`SELECT * FROM temp_data`)
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
            // console.log(sortedModels[model_ID])
            cluster.queue({
                model: sortedModels[model_ID],
                model_ID,
                queue_number
            })

            


        }





    



        await cluster.task((async ({ page, data: model }) => {
            console.log("Running task " + model.queue_number + " of " + Object.keys(sortedModels).length)

            function getSpecifications(text) {
                if (!text) return "-"

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

                if (text.match(/(microsoft)|(surface)/i)) {
                    // Test for microsoft SQ1 chips
                    if (text.match(/SQ\d/i)) return text.match(/SQ\d/i)[0].toUpperCase()
                }

                if (text.match(/apple|mac(book)?/i)) {
                    // Test for apple M1 chips
                    if (text.match(/m\d/i)) return text.match(/m\d/i)[0].toUpperCase()
                }
                // Pentium chips
                if (text.match(/N\d\d\d\d/i)) return text.match(/N\d\d\d\d/i)[0].trim()
                if (text.match(/(m[3579][-\s])?\d\d\d\dy/i)) return text.match(/(m[3579][-\s])?\d\d\d\dy/i)[0].trim().lowerLize()

                // Detect strings that have spaces between the model i.e. <space>i5<space>
                if (text.match(/\si\d\s/i)) return text.match(/\si\d\s/i)[0].trim().lowerLize()

                // i7-117G6
                if (text.match(/([i]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)) return text.match(/([i]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)[0].replace(/\s/gi, "-").toUpperCase().lowerLize().trim()

                // r5 5800HX
                if (text.match(/([r]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)) return convertAMDShortToLong(text.match(/([r]\d[-\s]\d\d\d\d\w?\w?[kqe]?)/mi)[0].replace(/\s/gi, "-").toUpperCase().trim())
                if (text.match(/intel(\s?core)?\si\d/mi)) return text.match(/intel(\s?core)?\si\d/mi)[0].split(" ")[text.match(/intel(\s?core)?\si\d/mi)[0].split(" ").length - 1].lowerLize().trim() // For 'INTEL i7' / 'INTEL I5'
                return text.match(/((ryzen)?\s\d\s\d\d\d\d(\d?|(\d\d)?)\w\w?)|(ryzen [3579])/im) ? convertAMDShortToLong(text.match(/((ryzen)?\s\d\s\d\d\d\d(\d?|(\d\d)?)\w\w?)|(ryzen [3579])/im)[0].trim().toUpperCase()) : "-"
            }
            function getProcessorCompany(text) {
                if (!text) return "-"

                if (text == "-") return "-"
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                if (text.match(/(AMD)|(ryzen)/im)) return "AMD"
                if (text.match(/(intel)|(i\d)|(i\d[-\s]\d\d\d\d\w?\w?[kqe]?)|(pentium)|(celeron)/mi)) return "Intel"
                if (text.match(/N\d\d\d\d/i)) return "Intel" // Pentiun N4000
                if (text.match(/(microsoft)|(surface)/i)) {
                    // Test for microsoft SQ1/2 chips
                    if (text.match(/SQ\d/i)) return "Microsoft"
                }
                if (text.match(/apple|macbook/i)) return "Apple"
                return "AMD"
            }

            function convertAMDShortToLong(text) {
                let textArray = []
                if (text.match(/r\d\s\d\d\d\d/im)) {
                    // format: r5 5600U
                    textArray = text.split(" ")
                } else if (text.match(/r\d-\d\d\d\d/im)) {
                    // format: r5-5600U
                    textArray = text.split("-")
                } else {
                    return text
                }

                let ryzenType = textArray[0].replace(/r/ig, '')
                let ryzenModel = textArray[1]

                return `RYZEN ${ryzenType} ${ryzenModel.toUpperCase()}`
            }

            function getRam(text) {
                if (!text) return -1
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")


                return Number(text.match(/\d\d?\s?GB/im) ? text.match(/\d\d?\s?GB/im)[0].replace(/[^0-9\.]+/g, "") : -1)
            }
            function getOS(text) {
                if (!text) return "-"
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                let os = "-"

                if (text.match(/apple|mac/i)) {
                    os = "Mac OS"
                } else {
                    if (text.match(/(\spro\s)|(professional)/i)) os = "Windows 10 Pro"
                    else os = "Windows 10"
                }


                return os
            }
            function getScreenSize(text) {
                if (!text) return -1
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                let screenSize;

                // first check for cm
                if (text.match(/\d\d(\.\d)?\s?cm/mi)) {
                    return Math.round(Number(text.match(/\d\d(\.\d)?\s?cm/mi)[0].replace(/cm/gmi, "").trim()) / 2.54 * 10) / 10
                }

                screenSize = text.match(/\d\d([,.]\d)?[-\s]in(ch)?|\d\d\.\d/mi) ? text.match(/\d\d([,.]\d)?[-\s]in(ch)?|\d\d\.\d/mi)[0] : -1
                if (screenSize == -1) return -1
                // Replace , with .
                console.log(screenSize)
                return Number(screenSize.replace(/,/gi, ".").replace(/-|i|n|c|h/gi, "").replace(/-|i|n|c|h/gi, "").trim())

            }
            function getScreenResolution(text) {
                if (!text) return "-1X-1"
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                let screenResolution = text.match(/\d\d\d\d\s?x\s?\d\d\d\d?/im) ? text.match(/\d\d\d\d\s?x\s?\d\d\d\d?/im)[0].toUpperCase() : "-1X-1"
                if (screenResolution != "-1X-1") return screenResolution

                screenResolution = text.match(/(fhd)|full\s?hd/i) ? "1920X1080" : screenResolution
                screenResolution = text.match(/qhd/i) ? "2560X1440" : screenResolution
                screenResolution = text.match(/uhd/i) ? "3840X2160" : screenResolution
                screenResolution = text.match(/2.8k/i) ? "2880X1800" : screenResolution
                return screenResolution
            }

            function getScreenTech(text) {
                if (!text) return "-"

                return text.match(/IPS|TN|OLED|VA|QLED/mi) ? text.match(/IPS|TN|OLED|VA|QLED/mi)[0].toUpperCase() : "-"
            }

            function getStorage(text) {
                if (!text) return "-"
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                return text.match(/\d\d\d?\d?(GB|SSD)(\s?(SSD)|)?|\d(TB|SSD)(\s?(SSD)|)?/mi) ? text.match(/\d\d\d?\d?(GB|SSD)(\s?(SSD)|)?|\d(TB|SSD)(\s?(SSD)|)?/mi)[0].trim() : "-"
            }

            function getGraphics(text) {
                if (!text) return "-"
                text = text.toUpperCase()
                text = text.replace(/©|℗|®|™|\?/gi, "")
                text = text.replace(/ /g, " ")

                // Check for Nvidia
                if (text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)) return `${text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)[0].toUpperCase().replace(/nvidia/i, "").trim()}`

                // Check for AMD
                if (text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)) return `${text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)[0].replace(/amd/i, "").toUpperCase().trim()}`

                if (text.match(/(iris)|(intel)|(XE)/mi)) return text.replace(/intel/i, "").toUpperCase().trim()
                return "-"
            }
            function getGraphicsWithoutIntel(text) {
                if (!text) return "-"
                text = text.toUpperCase()
                text = text.replace(/©|℗|®|™|\?/gi, "")
                text = text.replace(/ /g, " ")

                // Check for Nvidia
                if (text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)) return `${text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)[0].toUpperCase().replace(/nvidia/i, "").trim()}`

                // Check for AMD
                if (text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)) return `${text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)[0].replace(/amd/i, "").toUpperCase().trim()}`


                return "-"
            }
            function getGraphicsCompany(text) {
                // Nvidia
                if (!text) return "-"
                if (text.match(/([GR]TX\s?\d\d\d\d(\s?ti)?(\s?super)?(\s?mobile)?(\s?max-?q)?)|MX\d\d\d/mi)) return "Nvidia"

                // Check for AMD
                if (text.match(/(RX\s?\d\d\d\dM?)|(RX\s?\d\d\dx?)|(RX\s?vega\s?.?)/mi)) return `AMD`

                if (text.match(/(iris)|(intel)|(XE)/mi)) return "Intel"
                return "-"


            }

            function getWeightInG(text) {
                if (!text) return -1
                if (Number.isNaN(Number(text))) {
                    // carry on with cleaning
                    text = text.replace(/,/g, ".")
                    if (text.match(/\d?\d((\.)\d\d?\d?)?\s?(kg|lbs)|(\d\d\d\d?\s?g\s)/mi)) {
                        text = text.match(/\d?\d((\.)\d\d?\d?)?\s?(kg|lbs)|(\d\d\d\d?\s?g\s)/mi)[0]
                        let textInNumber = Number(text.replace(/[^0-9.,]/g, ''))
                        let weightInG = textInNumber
                        if (text.match(/kg/i)) {
                            weightInG = Number(textInNumber * 1000)
                        } else if (text.match(/lbs/i)) {
                            weightInG = Number(textInNumber * 454)
                        } else { 
                            // assume kg if not specified
                            weightInG = Number(textInNumber * 1000)
 
                        }
                        return Math.round(weightInG)
                    } else return -1
                } else {
                    return Number(text)
                }
            }


            await page.exposeFunction("getSpecifications", getSpecifications)
            await page.exposeFunction("getProcessor", getProcessor)
            await page.exposeFunction("getProcessorCompany", getProcessorCompany)
            await page.exposeFunction("getRam", getRam)
            await page.exposeFunction("getOS", getOS)
            await page.exposeFunction("getScreenSize", getScreenSize)
            await page.exposeFunction("getScreenResolution", getScreenResolution)
            await page.exposeFunction("getScreenTech", getScreenTech)
            await page.exposeFunction("getStorage", getStorage)
            await page.exposeFunction("getGraphics", getGraphics)
            await page.exposeFunction("getGraphicsWithoutIntel", getGraphicsWithoutIntel)
            await page.exposeFunction("getGraphicsCompany", getGraphicsCompany)
            await page.exposeFunction('getWeightInG', getWeightInG)
            // page.on('console', consoleObj => console.log(consoleObj.text()));
            // page.on('console', async msg => {
            //     const args = await msg.args()
            //     args.forEach(async (arg) => {
            //       const val = await arg.jsonValue()
            //       // value is serializable
            //       if (JSON.stringify(val) !== JSON.stringify({})) console.log(val)
            //       // value is unserializable (or an empty oject)
            //       else {
            //         const { type, subtype, description } = arg._remoteObject
            //         console.log(`type: ${type}, subtype: ${subtype}, description:\n ${description}`)
            //       }
            //     })
            //   });

            let locations = Object.keys(model.model)
            // console.log(locations)



            if (locations.includes("ASUS Store")) {
                console.log("Trying ASUS")
                let pass = await tryAsus()
                if (pass) return true
            }
            if (locations.includes("HP Store")) {
                console.log("Trying HP")
                let pass = await tryHp()
                if (pass) return true
            }
            if (locations.includes("LENOVO Store")) {
                console.log("Trying LENOVO")
                let pass = await tryLenovo()
                if (pass) return true
            }
            if (locations.includes("RAZER Store")) {
                console.log("Trying RAZER")
                let pass = await tryRazer()
                if (pass) return true
            }


            if (locations.includes("Courts")) {
                // try courts
                console.log("Tryng courts")
                let pass = await tryCourts()
                if (pass) return true

            }
            if (locations.includes("Best Denki")) {
                // try best Denki
                console.log("Tryng best")

                let pass = await tryBest()
                if (pass) return true
            }
            if (locations.includes("Harvey Norman")) {
                // Try Harvey
                console.log("Tryng harvey")

                let pass = await tryHarvey()
                if (pass) return true
            }
            if (locations.includes("Gain City")) {
                // try gain city\
                console.log("Tryng gain")

                let pass = await tryGain()
                if (pass) return true
            }
            if (locations.includes("ACER Store")) {
                console.log("Trying acer")
                let pass = await tryAcer()
                if (pass) return true
            }
            if (locations.includes("Challenger")) {
                // Try Challenger (NOT RELIABLE)
                console.log("Tryng challenger")

                // Literally just analyze the name
                let pass = await tryChallenger()
                if (pass) return true
            }

            console.log("--------------------------------")
            console.log("Couldn't find a match: ", model.model_ID, " , resorting to identification from model name")
            console.log("--------------------------------")

            // let pass = await tryModelName()
            if (pass) return true
            return false
            // Order: 
            // Courts, Best, Harvey, Gain, Challenger


            async function tryAcer() { // sucks
                try {

                    let url = model.model["ACER Store"][0].link

                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let text = document.querySelector("#maincontent > div.alocolumns.clearfix > div > div.product-view > div > div.row > div.product-info-main.product-shop.col-md-7.col-sm-7.col-xs-12 > div > div.shop-content-left > div.product-info-title > ul").innerText
                            let weightText = document.querySelector("#description > div > div > div > div > div").innerText
                            let processor = await getProcessor(text)
                            let processorCompany = await getProcessorCompany(text)
                            let ram = await getRam(text)
                            let storage = await getStorage(text)
                            let graphics = await getGraphicsWithoutIntel(text) // cannot tell
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(text)

                            let screenSize = await getScreenSize(text)

                            let screenResolution = await getScreenResolution(text)

                            let screenTech = await getScreenTech(text)

                            let weight = await getWeightInG(weightText)

                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })

                    console.log(specifications, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]
                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam



                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }
            }

            async function tryAsus() { // excellent
                try {


                    let url = model.model["ASUS Store"][0].link
                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let specifications = {}
                            document.querySelector("#product-attribute-specs-table").querySelectorAll("td").forEach(td => {
                                specifications[td.dataset.th] = td.innerText
                            })

                            let processor = await getProcessor(specifications['Processor'])
                            let processorCompany = await getProcessorCompany(specifications['Processor'])
                            let ram = await getRam(specifications['Memory'])
                            let storage = specifications['Storage']
                            let graphics = await getGraphics(specifications["Graphics Card"])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(specifications["Operating System"])

                            let screenSize = await getScreenSize(specifications["Display"])

                            let screenResolution = await getScreenResolution(specifications["Display"])

                            let screenTech = await getScreenTech(specifications["Display"])

                            let weight = await getWeightInG(specifications["Weight"])
                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })

                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]


                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam

                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }
            }

            async function tryHp() { // excellent
                try {


                    let url = model.model["HP Store"][0].link
                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let specifications = {}
                            document.querySelector("#product-attribute-specs-table").querySelectorAll("td").forEach(td => {
                                specifications[td.dataset.th] = td.innerText
                            })

                            let processor = await getProcessor(specifications['Processor'])
                            let processorCompany = await getProcessorCompany(specifications['Processor'])
                            let ram = await getRam(specifications['Memory'])
                            let storage = specifications['Hard drive description']
                            let graphics = await getGraphics(specifications["Graphics Card"])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(specifications["Operating system"])

                            let screenSize = await getScreenSize(specifications["Display"])

                            let screenResolution = await getScreenResolution(specifications["Display"])

                            let screenTech = await getScreenTech(specifications["Display"])



                            let weight = await getWeightInG(specifications["Weight"])
                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]


                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam

                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }
            }

            async function tryLenovo() { // excellent
                try {

                    let url = model.model["LENOVO Store"][0].link
                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let specifications = {}
                            document.querySelectorAll(".configuratorItem-mtmTable-text").forEach(e => {
                                if (e.childElementCount)
                                    specifications[e.querySelector("h4").dataset.term] = e.querySelector("p").innerText
                            })

                            let processor = await getProcessor(specifications['Processor'])
                            let processorCompany = await getProcessorCompany(specifications['Processor'])
                            let ram = await getRam(specifications['Memory'])
                            let storage = specifications['Hard drive description']
                            let graphics = await getGraphics(specifications["Graphics"])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(specifications["Operating System"])

                            let screenSize = await getScreenSize(specifications["Display Type"])

                            let screenResolution = await getScreenResolution(specifications["Display Type"])

                            let screenTech = await getScreenTech(specifications["Display Type"])

                            let weightSpec = {}
                            document.querySelector(".techSpecs-table").querySelectorAll("tr").forEach(tr => {
                                if (tr.childElementCount)
                                    weightSpec[tr.firstElementChild.innerText] = tr.lastElementChild.innerText
                            })

                            let weight = await getWeightInG(weightSpec["Weight"])
                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]


                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam



                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }
            }

            async function tryRazer() {
                try {


                    let url = model.model["RAZER Store"][0].link
                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let specifications = {}
                            document.querySelectorAll("tr").forEach(tr => {
                                if (tr.childElementCount)
                                    specifications[tr.querySelector("th").innerText] = tr.querySelector("td").innerText
                            })

                            let processor = await getProcessor(specifications['PROCESSOR'])
                            let processorCompany = await getProcessorCompany(specifications['PROCESSOR'])
                            let ram = await getRam(specifications['MEMORY'])
                            let storage = specifications['STORAGE']
                            let graphics = await getGraphics(specifications["GRAPHICS"])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(specifications["OS"])

                            let screenSize = await getScreenSize(specifications["DISPLAY"])

                            let screenResolution = await getScreenResolution(specifications["DISPLAY"])

                            let screenTech = await getScreenTech(specifications["DISPLAY"])



                            let weight = await getWeightInG(specifications["WEIGHT"])
                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]


                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam

                    return true
                } catch (e) {
                    console.log(e)
                    return e
                }
            }



            async function tryCourts() {
                try {


                    let url = model.model["Courts"][0].link
                    await page.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: pageTimeout
                    })

                    console.log("Page loaded")
                    let specifications = await page.evaluate(async () => {
                        try {

                            let tableData = document.querySelector("#product-attribute-specs-table > tbody").querySelectorAll('td')

                            let specifications = {}
                            tableData.forEach(td => {
                                specifications[td.dataset.th] = td.innerText
                            })

                            let processor = await getProcessor(specifications['Processor Model'])
                            let processorCompany = await getProcessorCompany(specifications['Processor Model'])
                            let ram = await getRam(specifications['Main Memory'])
                            let storage = specifications['Internal Storage']
                            let graphics = await getGraphics(specifications["Dedicated Graphics Processor"])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let osText = specifications["Body Type"] ? specifications["Body Type"] : specifications["Operating System"]
                            let os = await getOS(osText)

                            let screenSize = await getScreenSize(specifications["Screen Size"])

                            let screenResText = specifications["Maximum Resolution"] ? specifications["Maximum Resolution"] : specifications["Screen Size"]
                            let screenResolution = await getScreenResolution(screenResText)

                            let screenTech = await getScreenTech(specifications["Screen Technology"])

                            let weight = await getWeightInG(specifications["Weight"])
                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e)
                            return e
                        }


                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, Number(specifications.screenResolution.split("X")[0]), Number(specifications.screenResolution.split("X")[1]), specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]


                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam

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
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
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

                            let graphics, graphicsCompany, os, screenSize, screenResolution, screenTech

                            let weight = -1 // not listed anywhere

                            if (text.match(/graphics/i)) {
                                graphics = await getGraphics(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)
                                graphicsCompany = await getGraphicsCompany(graphics)

                                os = await getOS(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(6) > span.usp_value").innerText)

                                screenSize = await getScreenSize(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)

                                screenResolution = await getScreenResolution(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)

                                screenTech = await getScreenTech(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)
                            } else {
                                graphics = "-"
                                graphicsCompany = "-"
                                os = await getOS(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(5) > span.usp_value").innerText)

                                screenSize = await getScreenSize(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)

                                screenResolution = await getScreenResolution(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)
                                screenTech = await getScreenTech(document.querySelector("#product\\.info\\.description > div > div > ul > li:nth-child(4) > span.usp_value").innerText)
                            }

                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }


                        } catch (e) {
                            console.log(e)
                            throw e
                        }

                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false

                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]

                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)
                    await page.waitForTimeout(1000) // Timeout to prevent spam

                    return true


                } catch (e) {
                    console.log(e)
                    return false
                }

            }

            async function tryBest() {

                let url = model.model["Best Denki"][0].link
                try {

                    await page.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: pageTimeout
                    })
                    console.log("Loaded page")

                    let specifications = await page.evaluate(async () => {
                        try {
                            let text = document.querySelector("#maincontent > div.row > div > div.row.product-detail-infomation-sticky-parent > div.col-sm-6.col-xs-12.product-detail-infomation.product-detail-infomation-sticky > div > div > div.product.attribute.overview > div").innerText
                            // Split into lines by \n
                            let textArray = text.split("\n")

                            let processor = await getProcessor(textArray[0])
                            text = text.replace(processor, "")

                            let processorCompany = await getProcessorCompany(textArray[0])

                            let ram = await getRam(textArray[2])
                            text = text.replace(ram, "")

                            let storage = await getStorage(text)

                            let graphics = await getGraphics(textArray[3])
                            let graphicsCompany = await getGraphicsCompany(graphics)

                            let os = await getOS(text)

                            let screenSize = await getScreenSize(textArray[4])

                            let screenResolution = await getScreenResolution(textArray[4])

                            let screenTech = await getScreenTech(textArray[4])

                            let weight = -1 // cannot identify

                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e.toString())
                            throw e
                        }

                    })
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false


                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]

                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)
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
                    let graphicsCompany = "-"

                    let os = getOS(text)

                    let screenSize = -1

                    let screenResolution = "-1X-1"

                    let screenTech = "-"

                    let weight = -1

                    let arr = [processorCompany, processor, ram, storage, screenSize, screenResolution.split("X")[0], screenResolution.split("X")[1], screenTech, graphics.toUpperCase(), graphicsCompany, os, weight, model.model_ID]
                    console.log(arr, model.model_ID)
                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)
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
                        waitUntil: "domcontentloaded",
                        timeout: pageTimeout
                    })

                    console.log(url)
                    let specifications = await page.evaluate(async (model) => {
                        try {

                            // 2 scenarios: "specifications tab" vs "main tab"  
                            let text = document.querySelector("#content_description > div > ul:nth-child(4)")
                            let processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
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
                                graphicsCompany = await getGraphicsCompany(graphics)

                                screenTech = "-"

                                os = await getOS(text)
                                weight = -1 // unable to determine
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
                                ram = await getRam(obj["RAM (GB)"])

                                let storageText = obj["Storage Capacity (GB)"] ? obj["Storage Capacity (GB)"] + " GB" : "-"
                                storage = storageText

                                screenSize = await getScreenSize(obj["Screen Size"])
                                screenResolution = await getScreenResolution(obj["Screen Size"])
                                screenTech = await getScreenTech(obj["Screen Size"])



                                graphics = await getGraphics(obj["Graphics Card"])
                                graphicsCompany = await getGraphicsCompany(graphics)



                                os = await getOS(obj["Operating System"])

                                weight = obj["Weight (kg)"] ? Number(obj["Weight (kg)"]) * 1000 : -1
                                // let name = model.model["Harvey Norman"][0].name
                                // ram = await getRam(name)
                                // name = name.replace(ram, "")


                                // storage = await getStorage(name)
                                // screenSize = -1 // Unable to determine
                                // screenResolution = await getScreenResolution(text)
                                // graphics = await getGraphics(name) // Unable to determine
                                // os = await getOS(name)

                            }




                            return {
                                processorCompany, processor, ram, storage, screenSize, screenResolution, screenTech, graphics, graphicsCompany, os, weight
                            }

                        } catch (e) {
                            console.log(e.toString())
                            throw e
                        }

                    }, model)
                    console.log(specifications, url)
                    if (!Object.keys(specifications).length) return false


                    let arr = [specifications.processorCompany, specifications.processor, specifications.ram, specifications.storage, specifications.screenSize, specifications.screenResolution.split("X")[0], specifications.screenResolution.split("X")[1], specifications.screenTech, specifications.graphics.toUpperCase(), specifications.graphicsCompany, specifications.os, specifications.weight, model.model_ID]

                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(1000) // Timeout to prevent spam

                    return true


                } catch (e) {
                    console.log(e)
                    return false
                }
            }

            async function tryModelName() {
                console.log("Trying from name")

                try {// Only processor, ram, storage
                    console.log(model.model[Object.keys(model.model)[0]], "<<<<<<<<")
                    let text = model.model[Object.keys(model.model)[0]][0].name
                    let processor = getProcessor(text)

                    let processorCompany = processor == "-" ? "-" : getProcessorCompany(text)

                    let ram = getRam(text)
                    text = text.replace(ram, "")

                    let storage = getStorage(text)

                    let os = getOS(text)

                    let screen_size = -1
                    let screen_resolution_w = -1
                    let screen_resolution_h = -1
                    let graphics = "-"
                    let graphicsCompany = "-"
                    let weight = -1

                    let arr = [processorCompany, processor, ram, storage, screen_size, screen_resolution_w, screen_resolution_h, graphics, graphicsCompany, os, weight, model.model_ID]
                    console.log(arr, model.model_ID)

                    await conn.query(`UPDATE temp_model_data SET processor_company = ?, processor_model = ?, ram = ?, storage = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, graphics_card = ?, graphics_company = ?, os = ?, weight = ? WHERE model_ID = ?`, arr)

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


        // ---------------------------------------
        // Try to classify CPUs
        // let cpuClass = await conn.query(`SELECT row_ID, processor_company, processor_model FROM `)




        console.log("----------------- COMPLETED EXECUTING FILE: specifications.js -----------------")



        await conn.release()

        return true
    } catch (e) {
        console.log(e)
        return e
    }
}



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


