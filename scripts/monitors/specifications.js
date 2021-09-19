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

function keepNumbers(string) {
    if (!string) return -1
    return Number(string.trim().match(/[0-9]*\.?[0-9]*/i)[0])
}

module.exports.specs = async () => {
    let conn = null
    try {
        conn = await pool.getConnection()

        let items = await conn.query(`SELECT * FROM monitors__temp_data`)
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

            function getRefreshRate(text) { // return Number
                if (!text) return -1

                if (text.match(/\d?\d\d[-|\s]?hz/mi)) return keepNumbers(text.match(/\d?\d\d[-| ]?hz/mi)[0]) // Return refresh rate
                return -1
            }

            function getBrightness(text) { // return Number
                if (!text) return -1
                if (!Number.isNaN(Number(text))) return Number(text)
                let match = text.match(/\d\d\d\s?(cd[\/|\s]?[m|㎡][²|2]?|nits?)/mi)
                if (match) {
                    let cleaned = keepNumbers(match[0])
                    return Number(cleaned)
                }
                return -1
            }

            function getContrastRatio(text) { // return Number
                if (!text) return -1
                text = text.replace(/,/g, "")
                if (text.match(/(^|\s|;|:)\d\d\d\d?:\d/mi)) return Number(text.match(/\d+:\d/mi)[0].split(":")[0]) // Match is 3000:1, split among ":" and return first element
                return -1
            }

            function getResponseTime(text) { // return Number
                if (!text) return -1
                text = text.replace(/\(.*\)/g, "")
                if (!Number.isNaN(Number(text))) return Number(text)
                if (text.match(/(\d\.)?\d+\s?ms/mi)) return keepNumbers(text.match(/\d+\s?ms/mi)[0]) // return response time (in ms)
                return -1
            }

            function getBitDepth(text) { // return Number
                if (!text) return -1

                // Match for 1.xx  billion <-- first
                if (text.match(/billion/i)) return 10
                if (text.match(/million/i)) return 8
                else return -1
            }

            function getAspectRatio(text) { // return Text
                if (!text) return "-"
                if (text.match(/(^|\D)\d\d:\d\d?/i)) return text.match(/(^|\D)\d\d:\d\d?/i)[0].substring(1)
                // if (text.match("ultrawide")) return "21:9"
                else return '-'
            }

            function getScreenSize(text) { // return Number
                if (!text) return -1
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                let screenSize;

                // first check for cm
                if (text.match(/\d\d(\.\d)?\s?cm/mi)) {
                    return Math.round(Number(text.match(/\d\d(\.\d)?\s?cm/mi)[0].replace(/cm/gmi, "").trim()) / 2.54 * 10) / 10
                }

                // TODO: Check if you really want to match all dd.d numnbers without requiring INCH or IN or "
                // Add  |\d\d\.\d  to end of regex
                screenSize = text.match(/\d\d([,.]\d)?[-\s]?(in(ch)?|"|')/mi) ? text.match(/\d\d([,.]\d)?[-\s]?(in(ch)?|"|')/mi)[0] : -1
                if (screenSize == -1) return -1
                // Replace , with .
                console.log(screenSize)
                return Number(keepNumbers(screenSize.replace(/,/gi, ".")))

            }
            function getScreenResolution(text) { // return String split by 'X'
                if (!text) return "-1X-1"
                text = text.replace(/©|℗|®|™|/gi, "")
                text = text.replace(/ /g, " ")

                let screenResolution = text.match(/\d\d\d\d\s?x\s?\d\d\d\d?/im) ? text.match(/\d\d\d\d\s?x\s?\d\d\d\d?/im)[0].toUpperCase() : "-1X-1"
                if (screenResolution != "-1X-1") return screenResolution

                screenResolution = text.match(/(fhd)|full\s?hd/i) ? "1920X1080" : screenResolution
                screenResolution = text.match(/qhd/i) ? "2560X1440" : screenResolution
                screenResolution = text.match(/uhd/i) ? "3840X2160" : screenResolution
                screenResolution = text.match(/2.8k/i) ? "2880X1800" : screenResolution
                screenResolution = text.match(/\s4k\s/i) ? "3840X2160" : screenResolution

                return screenResolution
            }

            function getScreenTech(text) { // return String
                if (!text) return "-"
                if (text.match(/In-plane Switching/mi)) return "IPS"
                return text.match(/IPS|TN|OLED|VA|QLED/mi) ? text.match(/IPS|TN|OLED|VA|QLED/mi)[0].toUpperCase() : "-"
            }


            await page.exposeFunction("getRefreshRate", getRefreshRate)
            await page.exposeFunction("getBrightness", getBrightness)
            await page.exposeFunction("getContrastRatio", getContrastRatio)
            await page.exposeFunction("getResponseTime", getResponseTime)
            await page.exposeFunction("getBitDepth", getBitDepth)
            await page.exposeFunction("getAspectRatio", getAspectRatio)
            await page.exposeFunction("getScreenSize", getScreenSize)
            await page.exposeFunction("getScreenResolution", getScreenResolution)
            await page.exposeFunction("getScreenTech", getScreenTech)
            await page.exposeFunction("keepNumbers", keepNumbers)
            // page.on('console', consoleObj => console.log(consoleObj.text()));
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

            let locations = Object.keys(model.model)
            // console.log(locations)


            if (locations.includes("DELL Store")) {
                console.log("Trying Dell")
                let pass = await tryDell()
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




            if (locations.includes("Courts")) {
                // try courts
                console.log("Tryng courts")
                let pass = await tryCourts()
                if (pass) return true

            }
            
            if (locations.includes("ACER Store")) {
                console.log("Trying acer")
                let pass = await tryAcer()
                if (pass) return true
            }
            if (locations.includes("Gain City")) { // above best denki but still bad
                // try gain city\
                console.log("Tryng gain")

                let pass = await tryGain()
                if (pass) return true
            }
            if (locations.includes("Best Denki")) { // Bad
                // try best Denki
                console.log("Tryng best")

                let pass = await tryBest()
                if (pass) return true
            }

            if (locations.includes("Harvey Norman")) { // Worse, rank this below best denki
                // Try Harvey
                console.log("Tryng harvey")

                let pass = await tryHarvey()
                if (pass) return true
            }


            

            
            if (locations.includes("Challenger")) {
                // Try Challenger (NOT RELIABLE)
                console.log("Tryng challenger")

                // Literally just analyze the name
                let pass = await tryModelName()
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

            async function tryDell() {
                let url = model.model["DELL Store"][0].link

                await page.goto(url, {
                    waitUntil: "networkidle0",
                    timeout: pageTimeout
                })

                let specifications = await page.evaluate(async () => {
                    try {
                        let properties = document.querySelector("#accessoriesTechSpecs").querySelectorAll(".six.columns")
                        let specifications = {}
                        properties.forEach(prop => {
                            specifications[prop.firstElementChild.innerText.trim()] = prop.lastChild.textContent.trim()
                        })

                        let refreshRate = await getRefreshRate(specifications["Native Resolution"])
                        let brightness = await getBrightness(specifications["Brightness"])
                        let contrastRatio = await getContrastRatio(specifications["Contrast Ratio"])
                        let responseTime = await getResponseTime(specifications["Response Time"])
                        let bitDepth = await getBitDepth(specifications["Colour Support"])
                        let aspectRatio = specifications["Aspect Ratio"]
                        let screenSize = await keepNumbers(specifications["Viewable Size"])
                        let screenResolution = await getScreenResolution(specifications["Native Resolution"])
                        let screenTech = await getScreenTech(specifications["Panel Type"])

                        return {
                            refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: specifications
                        }
                    } catch (e) {
                        console.log(e)
                        return e
                    }

                })
                console.log({ specifications }, '-------------------------------------------------------', url)
                if (!Object.keys(specifications).length) return false
                let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

                await page.waitForTimeout(500) // Timeout to prevent spam
                return true

            }

            async function tryAcer() { // sucks
                try {

                    let url = model.model["ACER Store"][0].link

                    await page.goto(url, {
                        waitUntil: "networkidle2",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            // desc plus title
                            let text = document.querySelector("#maincontent > div.alocolumns.clearfix > div > div.product-view > div > div.row > div.product-info-main.product-shop.col-md-7.col-sm-7.col-xs-12 > div > div.shop-content-left > div.product-info-title > ul").innerText + " " + document.querySelector("#description > div").innerText

                            let refreshRate = await getRefreshRate(text)
                            let brightness = await getBrightness(text)
                            let contrastRatio = await getContrastRatio(text)
                            let responseTime = await getResponseTime(text)
                            let bitDepth = await getBitDepth(text)
                            let aspectRatio = await getAspectRatio(text)
                            let screenSize = await getScreenSize(text)
                            let screenResolution = await getScreenResolution(text)
                            let screenTech = await getScreenTech(text)

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: text
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

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
                        waitUntil: "domcontentloaded",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let properties = document.querySelector("#product-attribute-specs-table").querySelectorAll(".data")
                            let specifications = {}
                            properties.forEach(td => {
                                specifications[td.dataset.th.trim()] = td.innerText.trim()
                            })

                            let rrArray = specifications["Display scan frequency (vertical)"].split("-")
                            let refreshRate;
                            if (rrArray.length > 1)
                                refreshRate = await getRefreshRate(rrArray[1]) // 48-75 Hz --> split by "-" and take the second element
                            else refreshRate = await getRefreshRate(rrArray[0])
                            let brightness = await getBrightness(specifications["Brightness"])
                            let contrastRatio = await getContrastRatio(specifications["Contrast ratio"])
                            let responseTime = await getResponseTime(specifications["Response time"])
                            let bitDepth = -1 // unable to determine
                            let aspectRatio = specifications["Aspect ratio"]
                            let screenSize = await getScreenSize(specifications["Laptop Size"])
                            let screenResolution = await getScreenResolution(specifications["Resolution (native)"])
                            let screenTech = await getScreenTech(specifications["Display type"])

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: specifications
                            }


                        } catch (e) {
                            console.log(e)
                            return e
                        }
                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam
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
                            let properties = document.querySelector(".techSpecs-table").querySelectorAll("tr")
                            let specifications = {}
                            properties.forEach(tr => {
                                specifications[tr.firstElementChild.innerText.trim()] = tr.lastElementChild.innerText.trim()
                            })

                            let refreshRate = -1 // cannot determine
                            let brightness = await getBrightness(specifications["Brightness"])
                            let contrastRatio = await getContrastRatio(specifications["Contrast Ratio"])
                            let responseTime = (await keepNumbers(specifications["Refresh Time"]) ? specifications["Refresh Time"] : -1)
                            let bitDepth = await keepNumbers(specifications["Colour Depth"] ? specifications["Colour Depth"] : await getBitDepth(specifications["Color Support"]))
                            let aspectRatio = specifications["Aspect Ratio"] ? specifications["Aspect Ratio"] : await getAspectRatio(document.querySelector('#longscroll-subseries > div > div.bodyWrapper > div.headerPanel-noImg > div.headerPanelProdInfo-noImg > div > div.headerTitle > div.titleSection').innerText)
                            let screenSize = await getScreenSize(document.querySelector('#tab-li-overview > div.overviewSection > div').innerText)
                            let screenResolution = await getScreenResolution(specifications["Maximum Resolution"] ? specifications["Maximum Resolution"] : document.querySelector('#tab-li-overview > div.overviewSection > div').innerText)
                            let screenTech = await getScreenTech(specifications["Panel Type"])

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: specifications
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

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
                        waitUntil: "networkidle0",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let properties = document.querySelector("#product-attribute-specs-table > tbody").querySelectorAll('td')

                            let specifications = {}
                            properties.forEach(td => {
                                specifications[td.dataset.th] = td.innerText
                            })

                            let refreshRate = await getRefreshRate(specifications["Display Refresh Rate"])
                            let brightness = await getBrightness(specifications["Brightness"])
                            let contrastRatio = await getContrastRatio(specifications["Contrast Ratio"])
                            let responseTime = await getResponseTime(specifications["Response Time"])
                            let bitDepth = -1
                            let aspectRatio = await getAspectRatio(specifications["Aspect Ratio(s) (W:H)"])
                            let screenSize = await getScreenSize(specifications["Screen Size"])
                            let screenResolution = await getScreenResolution(specifications["Maximum Resolution"])
                            let screenTech = await getScreenTech(specifications["Screen Technology"] ? specifications["Screen Technology"] : document.querySelector("#maincontent > div.columns > div > div.product-info-main > div.product-info-main-left > div.page-title-wrapper.product > div > span").innerText.trim())

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: specifications
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

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

                    let specifications = await page.evaluate(async () => {
                        try {
                            // desc plus title
                            let text = document.querySelector(".product-specs").innerText + " " + document.querySelector("#maincontent > div.columns > div > div:nth-child(6) > div.page-title-wrapper.product > h1 > span").innerText

                            let refreshRate = await getRefreshRate(text)
                            let brightness = await getBrightness(text)
                            let contrastRatio = await getContrastRatio(text)
                            let responseTime = await getResponseTime(text)
                            let bitDepth = await getBitDepth(text)
                            let aspectRatio = await getAspectRatio(text)
                            let screenSize = await getScreenSize(text)
                            let screenResolution = await getScreenResolution(text)
                            let screenTech = await getScreenTech(text)

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: text
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam
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
                        waitUntil: "networkidle0",
                        timeout: pageTimeout
                    })

                    let specifications = await page.evaluate(async () => {
                        try {
                            let text = document.querySelector("#maincontent > div.row > div > div.row.product-detail-infomation-sticky-parent > div.col-sm-6.col-xs-12.product-detail-infomation.product-detail-infomation-sticky > div > div > div.product.attribute.overview > div.value.std").innerText

                            let refreshRate = await getRefreshRate(text)
                            let brightness = await getBrightness(text)
                            let contrastRatio = await getContrastRatio(text)
                            let responseTime = await getResponseTime(text)
                            let bitDepth = await getBitDepth(text)
                            let aspectRatio = await getAspectRatio(text)
                            let screenSize = await keepNumbers(text)
                            let screenResolution = await getScreenResolution(text)
                            let screenTech = await getScreenTech(text)

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: text
                            }
                        } catch (e) {
                            console.log(e)
                            return e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam
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

                    let refreshRate = getRefreshRate(text)
                    let brightness = getBrightness(text)
                    let contrastRatio = getContrastRatio(text)
                    let responseTime = getResponseTime(text)
                    let bitDepth = getBitDepth(text)
                    let aspectRatio = getAspectRatio(text)
                    let screenSize = getScreenSize(text)
                    let screenResolution = getScreenResolution(text)
                    let screenTech = getScreenTech(text)



                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    console.log({arr, url})
                    
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)


                    return true

                } catch (e) {
                    console.log(e)
                    return false
                }

            }

            async function tryHarvey() { // Move this to the bottom


                let url = model.model["Harvey Norman"][0].link
                try {
                    await page.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: pageTimeout
                    })

                    console.log(url)
                    let specifications = await page.evaluate(async (model) => {
                        try {
                            let text = document.querySelector(".product-title").innerText
                            let refreshRate = await getRefreshRate(text)
                            let brightness = await getBrightness(text)
                            let contrastRatio = await getContrastRatio(text)
                            let responseTime = await getResponseTime(text)
                            let bitDepth = await getBitDepth(text)
                            let aspectRatio = await getAspectRatio(text)
                            let screenSize = await getScreenSize(text)
                            let screenResolution = await getScreenResolution(text)
                            let screenTech = await getScreenTech(text)

                            return {
                                refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech, raw: text
                            }

                        } catch (e) {
                            console.log(e.toString())
                            throw e
                        }

                    })
                    console.log({ specifications }, '-------------------------------------------------------', url)
                    if (!Object.keys(specifications).length) return false
                    let { refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, screenResolution, screenTech } = specifications
                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)

                    await page.waitForTimeout(500) // Timeout to prevent spam

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
                    let refreshRate = getRefreshRate(text)
                    let brightness = getBrightness(text)
                    let contrastRatio = getContrastRatio(text)
                    let responseTime = getResponseTime(text)
                    let bitDepth = getBitDepth(text)
                    let aspectRatio = getAspectRatio(text)
                    let screenSize = getScreenSize(text)
                    let screenResolution = getScreenResolution(text)
                    let screenTech = getScreenTech(text)



                    let arr = [refreshRate, brightness, contrastRatio, responseTime, bitDepth, aspectRatio, screenSize, Number(screenResolution.split("X")[0]), Number(screenResolution.split("X")[1]), screenTech, model.model_ID]
                    
                    
                    await conn.query(`UPDATE monitors__temp_model_data SET refresh_rate = ?, brightness = ?, contrast_ratio = ?, response_time = ?, bit_depth = ?, aspect_ratio = ?, screen_size = ?, screen_resolution_w = ?, screen_resolution_h = ?, screen_tech = ? WHERE model_ID = ?`, arr)


                    return true

                    
                } catch (e) {
                    console.log(e)
                }
            }


        }))
        const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
        const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)


        await cluster.idle()
        await conn.commit()
        await cluster.close();



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


