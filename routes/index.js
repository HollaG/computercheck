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
    let conn = null
    try {
        conn = await pool.getConnection()
        let searchTimeStart = new Date().getMilliseconds()
        console.log(req.query.search)

        let searchString = req.query.search ? req.query.search.trim().toUpperCase() : ""

        let result;
        if (searchString) {
            result = await getSearchModels(0, searchString)
        } else {
            result = await getModels(0)
        }

        let searchTimeEnd = new Date().getMilliseconds()
        let diff = searchTimeEnd - searchTimeStart

        res.render('main', {
            title: 'ComputerCheck: Singapore Laptop Database',
            data: result.groupedByProductId,
            modelData: result.modelDataGroupedID,
            searchString,
            numberOfModels: result.numberOfModels,
            numberOfProducts: result.numberOfProducts,
            stringify,
            diff,
            original: req.query.search,
            getRandomName
        });
        conn.release()
    } catch (e) {
        console.log(e)
        conn.release()

    }

    
});

// Ajax data
router.get("/loadMore/:startIndex", async function(req, res, next) { 
    try { 
        let searchTimeStart = new Date().getMilliseconds()

        let startIndex = Number(req.params.startIndex)
        if (Number.isNaN(startIndex)) return res.status(404).send("Not found")
        console.log(req.query.search)
    
        let searchString = req.query.search ? req.query.search.trim().toUpperCase() : ""
    
        let result;
        if (searchString) {
            result = await getSearchModels(startIndex, searchString)
        } else {
            result = await getModels(startIndex)
        }
        
        if (result == "All items loaded") return res.status(204).send("All items loaded")
        
        let html = pug.renderFile(`${process.cwd()}/views/card.pug`, {
            data: result.groupedByProductId,
            modelData: result.modelDataGroupedID,                
        })
    
        let searchTimeEnd = new Date().getMilliseconds()    

        
        if (Object.keys(result.groupedByProductId).length < 24) {

            let obj = {
                html,
                ended: true
            }
            console.log(obj)

            res.send(JSON.stringify(obj))
        } else {
            let obj = {
                html,
                ended: false
            }
            console.log(obj)
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
async function getModels(startIndex) {
    // StartIndex: (Total models loaded already)
    // E.g. startIndex = 24 if 24 models loaded
    let conn = null
    try {
        conn = await pool.getConnection()

        // Total model count 
        let numberOfModels = await conn.query(`SELECT COUNT(row_ID) as total FROM model_data`)
        numberOfModels = numberOfModels[0][0].total

        if (startIndex > numberOfModels) return "All items loaded"

        // Total product count
        let numberOfProducts = await conn.query(`SELECT COUNT(row_ID) as total FROM data`)
        numberOfProducts = numberOfProducts[0][0].total

        // Select the first 24 models (sorted by alphabetical)
        let modelData = await conn.query(`SELECT * FROM model_data ORDER BY brand ASC, model_ID ASC LIMIT 24 OFFSET ?`, [startIndex])
        modelData = modelData[0]

        let availableModels = modelData.map(x => x.model_ID)

        let data = await conn.query(`SELECT * FROM data WHERE model_ID IN (?) AND active = 1 ORDER BY brand ASC, model_ID ASC`, [availableModels])
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

        conn.release()
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

async function getSearchModels(startIndex, searchString) {
    let conn = null
    try {
        conn = await pool.getConnection()

        let modelSearchTerms = await conn.query(`SELECT search_terms, brand, model_ID FROM model_data ORDER BY model_ID`)
        modelSearchTerms = modelSearchTerms[0]

        let searchArr = searchString.split(" ")

        let searchedModels = []

        for (let i = 0; i < modelSearchTerms.length; i++) {

            let model = modelSearchTerms[i]
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

        // Extract the required range
        let limitedSearchModels = searchedModels.slice(startIndex, startIndex + 24)

        // Total model count 
        let numberOfModels = await conn.query(`SELECT COUNT(row_ID) as total FROM model_data WHERE model_ID IN (?)`, [searchedModels])
        numberOfModels = numberOfModels[0][0].total

        if (startIndex > numberOfModels) return "All items loaded"

        // Total product count
        let numberOfProducts = await conn.query(`SELECT COUNT(row_ID) as total FROM data WHERE model_ID IN (?)`, [searchedModels])
        numberOfProducts = numberOfProducts[0][0].total

        // Select the first 24 models (sorted by alphabetical)
        let modelData = await conn.query(`SELECT * FROM model_data WHERE model_ID IN (?) ORDER BY brand ASC, model_ID ASC`, [limitedSearchModels, startIndex])
        modelData = modelData[0]

        let data = await conn.query(`SELECT * FROM data WHERE model_ID IN (?) AND active = 1 ORDER BY brand ASC, model_ID ASC`, [limitedSearchModels])
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
        conn.release()

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

module.exports = router;
