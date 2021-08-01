var express = require('express');
var router = express.Router();

const mysql = require('mysql2/promise')
const db = require("../configuration/database.json")
const pool = mysql.createPool(db)

const stringify = require("js-stringify")

function cutoff(string) { 

}

/* GET home page. */
router.get('/', async function(req, res, next) {
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
                data = await conn.query(`SELECT * FROM data WHERE model_ID IN (?) ORDER BY brand ASC`, [searchedModels])            
            else
                data = [[]]


           

            // data = await conn.query(`SELECT * FROM data LEFT JOIN model_data ON data.model_ID = model_data.model_ID WHERE search_terms LIKE ?`, mysqlString)
        } else { 
            data = await conn.query(`SELECT * FROM data ORDER BY brand ASC`)
        }
        
        

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
            title: 'Express' ,
            data: groupedByProductId,
            modelData: modelDataGroupedID,
            searchString,
            number: Object.keys(groupedByProductId).length,
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

router.get("/raw", async function(req, res, next) { 
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
