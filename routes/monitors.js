var express = require('express');
var router = express.Router();

const mysql = require('mysql2/promise')
const db = require("../configuration/database.json")
const pool = mysql.createPool(db)
const pug = require("pug")
const stringify = require("js-stringify")

function cutoff(string) {

}

/* GET home page. */
router.get('/', async function (req, res, next) {
    console.log(req.subdomains, ' asd-as-dsa-d')
    let full = req.subdomains.includes("full") ? true : false

    let conn = null
    try {
        conn = await pool.getConnection()
        let searchTimeStart = new Date().getMilliseconds()
        console.log(req.query.search)

        let searchString = req.query.search ? req.query.search.trim().toUpperCase() : ""

        let result;
        if (searchString) {
            result = await getSearchModels(0, searchString, null, full)
        } else {
            result = await getModels(0, null, full)
        }

        let ended = false
        if (!Object.keys(result.groupedByProductId).length) ended = true


        let searchTimeEnd = new Date().getMilliseconds()
        let diff = searchTimeEnd - searchTimeStart

        // console.log(result.groupedByProductId)

        // Get the options object
        let brands = await conn.query(`SELECT brand, COUNT(*) as total FROM monitors__model_data GROUP BY brand ORDER BY brand ASC`)
        let locations = await conn.query(`SELECT location, COUNT(*) as total FROM monitors__data GROUP BY location ORDER BY location ASC`)
        let screenSizes = await conn.query(`SELECT t.screen_size_clean, COUNT(*) as total FROM (SELECT IF(screen_size = 0 OR screen_size = -1, 'AAUnknown', screen_size) as screen_size_clean FROM monitors__model_data) t GROUP BY t.screen_size_clean ORDER BY t.screen_size_clean ASC`)
        let screenResolutions = await conn.query(`SELECT t.screen_resolution_w_clean, t.screen_resolution_h_clean, COUNT(*) as total 
            FROM 
            (SELECT IF(screen_resolution_w = 0 OR screen_resolution_w = -1, 'AAUnknown', screen_resolution_w) as screen_resolution_w_clean, 
             IF(screen_resolution_h = 0 OR screen_resolution_h = -1, 'AAUnknown', screen_resolution_h) as screen_resolution_h_clean
             FROM monitors__model_data) t 
             
             GROUP BY t.screen_resolution_w_clean ORDER BY t.screen_resolution_w_clean ASC`)

        let screenTechs = await conn.query(`SELECT t.screen_tech_clean, COUNT(*) as total FROM (SELECT IF(screen_tech = "" OR screen_tech = "-", 'AAUnknown', screen_tech) as screen_tech_clean FROM monitors__model_data) t GROUP BY t.screen_tech_clean ORDER BY t.screen_tech_clean ASC`)
        let refreshRates = await conn.query(`SELECT t.refresh_rate_clean, COUNT(*) as total FROM (SELECT IF(refresh_rate = 0 OR refresh_rate = -1, 'AAUnknown', refresh_rate) as refresh_rate_clean FROM monitors__model_data) t GROUP BY t.refresh_rate_clean ORDER BY t.refresh_rate_clean ASC`)
        let aspectRatios = await conn.query(`SELECT t.aspect_ratio_clean, COUNT(*) as total FROM (SELECT IF(aspect_ratio = "" OR aspect_ratio = "-", 'AAUnknown', aspect_ratio) as aspect_ratio_clean FROM monitors__model_data) t GROUP BY t.aspect_ratio_clean ORDER BY t.aspect_ratio_clean ASC`)
        let responseTimes = await conn.query(`SELECT t.response_time_clean, COUNT(*) as total FROM (SELECT IF(response_time = 0 OR response_time = -1, 'AAUnknown', response_time) as response_time_clean FROM monitors__model_data) t GROUP BY t.response_time_clean ORDER BY t.response_time_clean ASC`)
        let brightnesses = await conn.query(`SELECT t.brightness_clean, COUNT(*) as total FROM (SELECT IF(brightness = 0 OR brightness = -1, 'AAUnknown', brightness) as brightness_clean FROM monitors__model_data) t GROUP BY t.brightness_clean ORDER BY t.brightness_clean ASC`)
        let bitDepths = await conn.query(`SELECT t.bit_depth_clean, COUNT(*) as total FROM (SELECT IF(bit_depth = 0 OR bit_depth = -1, 'AAUnknown', bit_depth) as bit_depth_clean FROM monitors__model_data) t GROUP BY t.bit_depth_clean ORDER BY t.bit_depth_clean ASC`)
        let contrastRatios = await conn.query(`SELECT t.contrast_ratio_clean, COUNT(*) as total FROM (SELECT IF(contrast_ratio = 0 OR contrast_ratio = -1, 'AAUnknown', contrast_ratio) as contrast_ratio_clean FROM monitors__model_data) t GROUP BY t.contrast_ratio_clean ORDER BY t.contrast_ratio_clean ASC`)



        let prices = await conn.query(`SELECT MAX(price) as max, MIN(price) as min FROM monitors__data WHERE active = 1`)
        let maxPrice = Number(prices[0][0].max)
        let minPrice = Number(prices[0][0].min)


        // Active clause isn't in the model_data !
        // let brightnesses = await conn.query(`SELECT MAX(brightness) as max, MIN(brightness) as min FROM monitors__model_data WHERE active = 1`)
        // let maxBrightness = Number(prices[0][0].max)
        // let minBrightness = Number(prices[0][0].min)


        let dataObj = {
            brands: brands[0],
            locations: locations[0],
            screenSizes: screenSizes[0],
            screenResolutions: screenResolutions[0],
            screenTechs: screenTechs[0],
            refreshRates: refreshRates[0],
            aspectRatios: aspectRatios[0],
            responseTimes: responseTimes[0],
            brightnesses: brightnesses[0],
            bitDepths: bitDepths[0],
            contrastRatios: contrastRatios[0],
           
            maxPrice, minPrice,
            // maxBrightness, minBrightness
        }
        console.log(dataObj)
        // console.log(result.groupedByProductId)

        function encodeID(string) {
            return string.replace(/ /g, "-_-").replace(/\./g, "_-_")
        }
        res.render('monitors/monitors', {
            title: 'ComputerCheck: Singapore Monitor Database',
            data: result.groupedByProductId,
            modelData: result.modelDataGroupedID,
            searchString,
            numberOfModels: result.numberOfModels,
            numberOfProducts: result.numberOfProducts,
            stringify,
            diff,
            original: req.query.search ? req.query.search.trim() : "",
            getRandomName,
            ended,
            dataObj,
            stringify: require("js-stringify"),
            encodeID,
            filters: req.query.filters
        });
        await conn.release()
    } catch (e) {
        console.log(e)
        conn.release()

    }


});

// Ajax data
router.get("/loadMore/:code", async function (req, res, next) {
    try {
        let full = req.subdomains.includes("full") ? true : false

        let searchTimeStart = new Date().getMilliseconds()

        let startIndex = Number(req.params.code.split("-_-")[0])
        let loadAll = req.params.code.split("-_-")[1] == "true" ? true : false
        if (Number.isNaN(startIndex)) return res.status(404).send("Not found")


        let searchString = req.query.search ? req.query.search.trim().toUpperCase() : ""


        let result;
        if (searchString) {
            result = await getSearchModels(startIndex, searchString, loadAll, full)
        } else {
            result = await getModels(startIndex, loadAll, full)
        }

        if (result == "All items loaded") return res.status(204).send("All items loaded")

        let html = pug.renderFile(`${process.cwd()}/views/monitors/card.pug`, {
            data: result.groupedByProductId,
            modelData: result.modelDataGroupedID,
        })

        let searchTimeEnd = new Date().getMilliseconds()

        console.log(Object.keys(result.groupedByProductId).length)
        if (Object.keys(result.groupedByProductId).length < 2 || loadAll) {

            let obj = {
                html,
                ended: true,
                number: Object.keys(result.modelDataGroupedID).length
            }
            // console.log(obj)

            res.send(JSON.stringify(obj))
        } else {
            let obj = {
                html,
                ended: false,
                number: Object.keys(result.modelDataGroupedID).length

            }
            // console.log(obj)
            res.send(JSON.stringify(obj))
        }



    } catch (e) {
        console.log(e)
    }



})

function getRandomName() {
    let locations = ["Courts", "Harvey Norman", "Challenger", "Best Denki", "Gain City"]

    return locations[Math.floor(Math.random() * (locations.length - 1))]
}
async function getModels(startIndex, loadAll, full) {
    // StartIndex: (Total models loaded already)
    // E.g. startIndex = 24 if 24 models loaded

    // loadAll = true 
    const limit = loadAll ? 1000000 : 24
    let conn = null
    try {
        conn = await pool.getConnection()
        // let inactiveModels = await conn.query(`SELECT model_ID, active, COUNT(*), SUM(active) as s FROM data GROUP BY model_ID HAVING s = 0`) // all models whose products are all inactive
        // inactiveModels = inactiveModels[0].map(x => x.model_ID)
        // if (!inactiveModels.length) inactiveModels = [""]
        // console.log(inactiveModels)

        let inactiveModels = [""]

        // Total model count 
        let numberOfModels = await conn.query(`SELECT COUNT(row_ID) as total FROM monitors__model_data WHERE model_ID NOT IN (?)`, [inactiveModels])
        numberOfModels = numberOfModels[0][0].total

        if (startIndex > numberOfModels) return "All items loaded"

        // Total product count
        let numberOfProducts = await conn.query(`SELECT COUNT(row_ID) as total FROM monitors__data WHERE model_ID NOT IN (?)`, [inactiveModels])
        numberOfProducts = numberOfProducts[0][0].total




        // Select the first 24 models (sorted by price)

        let modelData = await conn.query(`SELECT *, 
            IF(screen_size = 0 OR screen_size = -1, "Unknown", screen_size) as screen_size_clean,            
            IF(screen_resolution_w = 0 OR screen_resolution_w = -1, "Unknown", screen_resolution_w) as screen_resolution_w_clean,
            IF(screen_resolution_h = 0 OR screen_resolution_h = -1, "Unknown", screen_resolution_h) as screen_resolution_h_clean,
            IF(screen_tech = "-" OR screen_tech = "", "Unknown", screen_tech) as screen_tech_clean,
            IF(refresh_rate = 0 OR refresh_rate = -1, "Unknown", refresh_rate) as refresh_rate_clean,
            IF(aspect_ratio = "-" OR aspect_ratio = "", "Unknown", aspect_ratio) as aspect_ratio_clean,
            IF(response_time = 0 OR response_time = -1, "Unknown", response_time) as response_time_clean,
            IF(brightness = 0 OR brightness = -1, "Unknown", brightness) as brightness_clean,
            IF(bit_depth = 0 OR bit_depth = -1, "Unknown", bit_depth) as bit_depth_clean,
            IF(contrast_ratio = 0 OR contrast_ratio = -1, "Unknown", contrast_ratio) as contrast_ratio_clean
    
            FROM monitors__model_data
            LEFT JOIN (
                SELECT model_ID, IF(e.s = 0, 0, 1) as model_active, s as sum_active, model_count FROM
                (SELECT model_ID, SUM(active) as s, COUNT(*) as model_count FROM monitors__data GROUP BY model_ID) as e
            ) as d
   
            ON monitors__model_data.model_ID = d.model_ID 
            WHERE monitors__model_data.model_ID NOT IN (?) 
            ORDER BY model_active DESC, avg_price ASC LIMIT ? OFFSET ?`, [inactiveModels, limit, startIndex])
        modelData = modelData[0]


        let availableModels = modelData.map(x => x.model_ID)
        if (!availableModels.length) availableModels = [""]


        let data = await conn.query(`SELECT * FROM monitors__data LEFT JOIN monitors__model_data ON monitors__data.model_ID = monitors__model_data.model_ID WHERE monitors__data.model_ID IN (?) ORDER BY avg_price ASC, active DESC`, [availableModels])


        data = data[0]

        // Group by product ID
        var modelDataGroupedID = modelData.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});

        // Sort into product name
        var groupedByProductId = data.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});



        for (model_ID of Object.keys(groupedByProductId)) {
            // Ensure that at least ONE seller is active, if all sellers are not active, then, delete this key // TODO we can do something else perhaps gray it out here

            let active = groupedByProductId[model_ID].some((element) => Boolean(element.active)) // return true if there is at least one element which is active
            // if (!active) delete groupedByProductId[model_ID]
            // else { 
            groupedByProductId[model_ID] = groupedByProductId[model_ID].reduce((r, a) => {
                r[a.location] = [...r[a.location] || [], a];
                return r;
            }, {});
            // } 


        }


        await conn.release()
        return {
            groupedByProductId,
            modelDataGroupedID,
            numberOfModels,
            numberOfProducts
        }

    } catch (e) {
        conn.release()

        console.log(e)
        return e
    }
}
function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
async function getSearchModels(startIndex, searchString, loadAll, full) {
    let conn = null
    const limit = loadAll ? 1000000 : 24
    try {
        conn = await pool.getConnection()
        // Select the inactive models
        // let inactiveModels = await conn.query(`SELECT model_ID, active, COUNT(*), SUM(active) as s FROM data GROUP BY model_ID HAVING s = 0`)
        // inactiveModels = inactiveModels[0].map(x => x.model_ID)
        // if (!inactiveModels.length) inactiveModels = [""]

        let inactiveModels = [""]

        console.log(inactiveModels, 'asdas')
        let modelSearchTerms = await conn.query(`SELECT search_terms, brand, model_ID FROM monitors__model_data WHERE model_ID NOT IN (?) ORDER BY model_ID`, [inactiveModels])
        modelSearchTerms = modelSearchTerms[0]

        let searchArr = searchString.trim().toUpperCase().split(" ")
        let searchedModels = []

        for (let i = 0; i < modelSearchTerms.length; i++) {

            let model = modelSearchTerms[i]

            let numMatches = 0
            for (let j = 0; j < searchArr.length; j++) {
                let searchTerm = searchArr[j]

                let regex = new RegExp(escapeRegex(searchTerm.toUpperCase()))

                // console.log(regex)
                if (model.search_terms.toUpperCase().match(regex)) {
                    numMatches++
                }
            }
            if (numMatches >= searchArr.length) {
                // there's a match, return this product
                searchedModels.push(model.model_ID)
            }

            // if (i == 10) break

        }






        console.log(searchedModels)
        if (!searchedModels.length) searchedModels = [""]

        // Extract the required range
        let limitedSearchModels = searchedModels.slice(startIndex, startIndex + limit)

        // Total model count 
        let numberOfModels = await conn.query(`SELECT COUNT(*) as total FROM monitors__model_data WHERE model_ID IN (?)`, [searchedModels])
        numberOfModels = numberOfModels[0][0].total

        if (startIndex > numberOfModels) return "All items loaded"

        // Total product count
        let numberOfProducts = await conn.query(`SELECT COUNT(*) as total FROM monitors__data WHERE model_ID IN (?)`, [searchedModels])
        numberOfProducts = numberOfProducts[0][0].total

        // Select the first 24 models (sorted by alphabetical)
        let modelData = await conn.query(`SELECT *, 
            IF(screen_size = 0 OR screen_size = -1, "Unknown", screen_size) as screen_size_clean,            
            IF(screen_resolution_w = 0 OR screen_resolution_w = -1, "Unknown", screen_resolution_w) as screen_resolution_w_clean,
            IF(screen_resolution_h = 0 OR screen_resolution_h = -1, "Unknown", screen_resolution_h) as screen_resolution_h_clean,
            IF(screen_tech = "-" OR screen_tech = "", "Unknown", screen_tech) as screen_tech_clean,
            IF(refresh_rate = 0 OR refresh_rate = -1, "Unknown", refresh_rate) as refresh_rate_clean,
            IF(aspect_ratio = "-" OR aspect_ratio = "", "Unknown", aspect_ratio) as aspect_ratio_clean,
            IF(response_time = 0 OR response_time = -1, "Unknown", response_time) as response_time_clean,
            IF(brightness = 0 OR brightness = -1, "Unknown", brightness) as brightness_clean,
            IF(bit_depth = 0 OR bit_depth = -1, "Unknown", bit_depth) as bit_depth_clean,
            IF(contrast_ratio = 0 OR contrast_ratio = -1, "Unknown", contrast_ratio) as contrast_ratio_clean

            FROM monitors__model_data
            LEFT JOIN (
                SELECT model_ID, IF(e.s = 0, 0, 1) as model_active, s as sum_active, model_count FROM
                (SELECT model_ID, SUM(active) as s, COUNT(*) as model_count FROM monitors__data GROUP BY model_ID) as e
            ) as d

            ON monitors__model_data.model_ID = d.model_ID 
            WHERE monitors__model_data.model_ID NOT IN (?) 
            ORDER BY model_active DESC, avg_price ASC LIMIT ? OFFSET ?`, [limitedSearchModels])
        modelData = modelData[0]

        let data = await conn.query(`SELECT * FROM data LEFT JOIN monitors__model_data ON monitors__data.model_ID = monitors__model_data.model_ID WHERE monitors__data.model_ID IN (?) ORDER BY avg_price ASC, active DESC`, [limitedSearchModels])
        data = data[0]

        // Group by product ID
        var modelDataGroupedID = modelData.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});

        // Sort into product name
        var groupedByProductId = data.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});
        for (model_ID of Object.keys(groupedByProductId)) {
            groupedByProductId[model_ID] = groupedByProductId[model_ID].reduce((r, a) => {
                r[a.location] = [...r[a.location] || [], a];
                return r;
            }, {});
        }
        await conn.release()

        return {
            groupedByProductId,
            modelDataGroupedID,
            numberOfModels,
            numberOfProducts
        }


    } catch (e) {
        conn.release()

        console.log(e)
        return e
    }
}

router.get('/table', async function (req, res, next) {
    console.log(req.query.search)

    let searchString = req.query.search ? req.query.search.trim().toUpperCase() : ""
    // Get data from database
    let conn = null
    try {
        conn = await pool.getConnection()
        let data;
        let modelData = await conn.query(`SELECT * FROM model_data`)
        let searchTimeStart = new Date().getMilliseconds()

        if (searchString) { // MICROSOFT SURFACE PRO
            let mysqlArr = searchString.split(" ")
            let mysqlString = mysqlArr.join("|")
            console.log(mysqlArr)


            // only return data where keyword was in the search string
            // data = await conn.query(`SELECT *, COUNT(model_keywords.model_ID) as num_matches FROM model_keywords LEFT JOIN model_data ON model_keywords.model_ID = model_data.model_ID LEFT JOIN data ON model_keywords.model_ID = data.model_ID WHERE model_keywords.keyword RLIKE ? GROUP BY model_keywords.model_ID HAVING num_matches >= ?`, [mysqlString, mysqlArr.length])


            // Sort the models which we can push


            let models = await conn.query(`SELECT search_terms, brand, model_ID FROM model_data`)
            models = models[0]

            let searchArr = searchString.split(" ")

            let searchedModels = []
            for (let i = 0; i < models.length; i++) {
                let model = models[i]
                let numMatches = 0
                for (let j = 0; j < searchArr.length; j++) {
                    let searchTerm = searchArr[j]
                    let regex = new RegExp(searchTerm)
                    if (model.search_terms.match(regex)) {
                        numMatches++
                    }
                }
                if (numMatches >= searchArr.length) {
                    // there's a match, return this product
                    searchedModels.push(model.model_ID)
                }
            }


            if (searchedModels.length)
                data = await conn.query(`SELECT * FROM data WHERE model_ID IN (?) AND active = 1 ORDER BY brand ASC, model_ID ASC`, [searchedModels])
            else
                data = [[]]




            // data = await conn.query(`SELECT * FROM data LEFT JOIN model_data ON data.model_ID = model_data.model_ID WHERE search_terms LIKE ?`, mysqlString)
        } else {
            data = await conn.query(`SELECT * FROM data WHERE active = 1 ORDER BY brand ASC, model_ID ASC`)
        }

        let numberOfProducts = data[0].length

        data = data[0]
        modelData = modelData[0]

        // Group by product ID
        var modelDataGroupedID = modelData.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});

        // Sort into product name
        var groupedByProductId = data.reduce((r, a) => {
            r[a.model_ID] = [...r[a.model_ID] || [], a];
            return r;
        }, {});
        for (model_ID of Object.keys(groupedByProductId)) {
            groupedByProductId[model_ID] = groupedByProductId[model_ID].reduce((r, a) => {
                r[a.location] = [...r[a.location] || [], a];
                return r;
            }, {});
        }
        let searchTimeEnd = new Date().getMilliseconds()
        let diff = searchTimeEnd - searchTimeStart
        res.render('index', {
            title: 'Express',
            data: groupedByProductId,
            modelData: modelDataGroupedID,
            searchString,
            numberOfModels: Object.keys(groupedByProductId).length,
            numberOfProducts,
            stringify,
            diff,
            original: req.query.search
        });
        conn.release()
    } catch (e) {
        console.log(e)
        if (conn) conn.release()
    }





});

router.get("/raw", async function (req, res, next) {
    let conn = null
    try {
        conn = await pool.getConnection()
        let data = await conn.query(`SELECT * FROM data ORDER BY model_ID ASC`)

        data = data[0]
        res.render("raw.pug", {
            data
        })
    } catch (e) {

    }
})

router.get("/:brand/:model_ID", async function (req, res, next) {
    let conn = null
    try {
        conn = await pool.getConnection()

        let brand = req.params.brand
        let model_ID = req.params.model_ID
        let model = await conn.query(`SELECT * FROM monitors__model_data WHERE model_ID = ? AND brand = ?`, [model_ID, brand])
        model = model[0][0]

        let products = await conn.query(`SELECT * FROM monitors__data WHERE model_ID = ? AND brand = ? AND active = 1 ORDER BY price ASC, location ASC`, [model_ID, brand])
        products = products[0]

        let expiredProducts = await conn.query(`SELECT * FROM monitors__data WHERE model_ID = ? AND brand = ? AND active = 0 ORDER BY price ASC, location ASC`, [model_ID, brand])
        expiredProducts = expiredProducts[0]

        // Format the model text appropiately
        console.log(model, '-----------')
        if (!model) model = {}
        let modelData = {
            brand: model.brand,
            model_ID: model.model_ID,
            image_url: `${model.image_url ? model.image_url : "/images/missing.jpg"}`,
            name: model.name,
            
            screen_size: "Unknown",
            screen_resolution: "Unknown",
            screen_tech: "Unknown",
            screen_ppi: "Unknown",

            refresh_rate: "Unknown",
            aspect_ratio: "Unknown",
            response_time: "Unknown",
            brightness: "Unknown",
            bit_depth: "Unknown",
            contrast_ratio: "Unknown",

        }



        if (model.screen_size != -1) {
            modelData['screen_size'] = `${model.screen_size} inch`
        }

        if (model.screen_resolution_w != -1 && model.screen_resolution_h != -1) {
            modelData['screen_resolution'] = `${model.screen_resolution_w} x ${model.screen_resolution_h}`
        }

        if (model.screen_tech != "-") {
            modelData['screen_tech'] = model.screen_tech
        }

        if (model.screen_size != -1 && model.screen_resolution_w != -1 && model.screen_resolution_h != -1) {
            modelData['screen_ppi'] = `${ppi(model.screen_size, model.screen_resolution_w, model.screen_resolution_h)} ppi`
        }

        if (model.refresh_rate != -1) {
            modelData['refresh_rate'] = `${model.refresh_rate} Hz`
        }

        if (model.aspect_ratio != "-") {
            modelData["aspect_ratio"] = model.aspect_ratio
        }

        if (model.response_time != -1) {
            modelData["response_time"] = `${model.response_time} ms`
        }

        if (model.brightness != -1) {
            modelData["brightness"] = `${model.brightness} nits`
        }

        if (model.bit_depth != -1) {
            modelData["bit_depth"] = `${model.bit_depth}-bit`
        }

        if (model.contrast_ratio != -1) {
            modelData["contrast_ratio"] = `${model.contrast_ratio}:1`
        }

        let totalPrice = 0
        products.forEach(p => {
            totalPrice += Number(p.price)
            console.log(p.date_updated)
            // Split timestamp into [ Y, M, D, h, m, s ]
            // var t = p.date_updated.split(/[- :]/);

            let d = new Date(p.date_updated)


            // Apply each element to the Date function  
            // var d = new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5]));
            p.date_updated = formatDate(d)
        })

        expiredProducts.forEach(p => {
            let d = new Date(p.date_updated)
            p.date_updated = formatDate(d)
        })

        let avgPrice = Math.round(totalPrice / products.length)


        res.render("monitors/model.pug", {
            model: modelData, products, expiredProducts,
            title: `${brand} ${model_ID}`,
            avgPrice
        })

        conn.release()
    } catch (e) {
        conn.release()
        console.log(e)
    }
})

router.get("/faq", function (req, res) { res.render("faq.pug", { title: "FAQ" }) })

function formatDate(d) {
    var d = d
    month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [day, month, year].join('/');
}

function ppi(inches, s_w, s_h) {
    return Math.round(Math.sqrt(Math.pow(s_w, 2) + Math.pow(s_h, 2)) / inches)
}



module.exports = router;
