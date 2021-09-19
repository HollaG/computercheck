console.log("----------------- EXECUTING FILE: sorter.js -----------------")

const fs = require("fs-extra")
const mysql = require("mysql2/promise")

const db = require("../../configuration/database.json")
const pool = mysql.createPool(db)

var startTime = new Date().getTime()
const axios = require("axios")
const sharp = require("sharp")
console.log("Started script at " + startTime)
const headless = true

    ; (async () => {
        try {



            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)

            const files = await fs.readdir(`${process.cwd()}/data/raw/monitors`)

            await fs.ensureDir(`${process.cwd()}/public/images/product-images`)
            const PRODUCTS = []
            const MODEL_IDs = []
            console.log(files)
            for (var i = 0; i < files.length; i++) {

                var file = files[i]
                var monitors__data = await fs.readJSON(`${process.cwd()}/data/raw/monitors/${file}`)
                if (monitors__data == {} || monitors__data == [] || !monitors__data) { // If no monitors__data, continue
                   continue 
                }
                for (var j = 0; j < monitors__data.length; j++) {
                    var item = monitors__data[j]

                    item.name = item.name.toUpperCase().trim()
                    // delete all non numbers from price
                    let price = item.price.replace("U.P.", "")
                    price = "$" + price.replace(/[A-za-z \s$,]/g, "")
                    price.includes(".") ? price = price : price = price + ".00"
                    item.price = price
                    // item.cleaned = cleaner(item.name) ? cleaner(item.name) : "UNIDENTIFIED"
                    item.ID = `${i}-${j}`
                    if (item.brand.toUpperCase() == "SURFACE") item.brand = "MICROSOFT"

                    if (!item.link.match(/^https?:\/\//g)) item.link = "https://" + item.link
                    if (!item.model_ID) item.model_ID = item.name

                    if (!Object.keys(item).includes("customizable")) item.customizable = false
                    if (!Object.keys(item).includes("instock")) item.instock = ""

                    MODEL_IDs.push(makeFileName(item.model_ID))
                }
                PRODUCTS.push(...monitors__data)

            }

            // console.log(PRODUCTS)



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
                string = string.replace(/\d+[kgtp]b/gi, "")

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


                return finalArr.join(" ").trim()


            }


            // Grouping by BRAND
            var brandGrouped = PRODUCTS.reduce((r, a) => {
                r[a.brand] = [...r[a.brand] || [], a];
                return r;
            }, {});


            var main = {
                "unmatched": {},
                "matched": {},
                "unidentified": []
            }

            const items = {}



            for (brand of Object.keys(brandGrouped)) {
                var products = brandGrouped[brand]

                // If brand is not registered in items yet, register it
                if (!items[brand]) items[brand] = {}



                // START LOOP: Loop through every product

                for (let i = 0; i < products.length; i++) {
                    let dealtWith = false

                    let product = products[i]

                    let leftModel_ID = product.model_ID

                    // Get all the models that have already been added that belong to this brand
                    let presentModels = Object.keys(items[brand])

                    // Check if this product's model was already added to the Items object
                    // We can't use a hashmap here as the values might not be exactly equal (i.e. might be superset / subset)

                    for (let j = 0; j < presentModels.length; j++) {
                        let presentModel = presentModels[j]

                        // How do we determine the matching algorithm? 
                        // E.g. option A: Simple substring check 
                        // leftModel_ID.includes(presentModel) || presentModel.includes(leftModel_ID)
                        // option B: LONGEST COMMON SUBSTRING
                        // leftModel_ID.match()
                        // let substring = (subCompare(leftModel_ID, presentModel)).substring

                        // option C: REGEX
                        let regex = `\\w*${escapeRegExp(`${leftModel_ID}`)}\\w*`
                        // console.log(regex)

                        if (leftModel_ID.includes(presentModel) || presentModel.includes(leftModel_ID)) {
                            // YES, this model was already present. 
                            // Add it to the list
                            items[brand][presentModel].push(product)

                            // Check if the model name needs changing

                            // TODO : BETTER HANDLING OF SPECIAL CASES
                            let disallowedModels = {
                                '14ITL05': 1
                            }
                            if (disallowedModels[leftModel_ID]) {
                                // swap back
                                items[brand][leftModel_ID] = items[brand][presentModel]
                                delete items[brand][presentModel]
                            } else if (leftModel_ID.length < presentModel.length) {
                                // Current model ID is shorter, swap them



                                items[brand][leftModel_ID] = items[brand][presentModel]
                                delete items[brand][presentModel]







                            }

                            // No need to loop further for this item
                            dealtWith = true;
                            break;
                        }
                    }

                    if (dealtWith) continue;

                    // Does not exist yet, add it to the map
                    items[brand][leftModel_ID] = [product]

                }

            }



            await fs.writeFile(`${process.cwd()}/data/main.json`, JSON.stringify(items))
            console.log("wrote file")


            // MYSQL STUFF
            const connection = await pool.getConnection()


            


            // fs.emptyDirSync(`${process.cwd()}/public/images/product-images`)

            // TABLE: monitors__model_data
            // GENERATE: 
            // 1) model_ID
            // 2) name
            // 3) brand
            // 4) search_terms
            const monitors__model_data = []
            const monitors__model_keywords = []
            const items_data = []
            const reducer = (accumulator, currentVal) => accumulator + " " + currentVal.name + " " + currentVal.location.toUpperCase()
            let counter = 0
            for (brand of Object.keys(items)) {

                let models = items[brand]



                for (model of Object.keys(models)) {
                    let search_terms = []
                    let products = models[model]

                    let totalPrice = 0
                    let model_name = ""
                    for (let z = 0; z < products.length; z++) {
                        let product = products[z]

                        let active = 1
                        if (product.instock == "c-false") active = 0

                        totalPrice = totalPrice + Number(product.price.replace("$", ""))
                        if (model_name.length < product.name.length) model_name = product.name

                        items_data.push([
                            model.trim().toUpperCase(),
                            product.name,
                            product.price.replace("$", ""),
                            product.brand,
                            product.location,
                            product.link,
                            product.image_url,
                            product.customizable,
                            active // active?,


                        ])

                    }

                    let avgPrice = totalPrice / products.length


                    let search_string = removeDuplicatesString(products.reduce(reducer, brand).replace(/  /g, " "))

                    // Check the IMAGE_URL
                    let image_link = ""
                    try {
                        let fileName = makeFileName(model)

                        let file = `${process.cwd()}/public/images/product-images/monitors/${fileName}.jpg`
                        if (fs.existsSync(file)) { 
                            // already exists
                            console.log("File already exists for " + counter)
                        } else {
                            let res = await axios.get(products[0].image_url, {

                                responseType: 'arraybuffer'
                            })
                            let monitors__data = Buffer.from(res.data, "binary")
    
    
                            sharp(data)
                                .flatten({ background: '#FFFFFF' })
                                .trim(25)
                                .resize({
                                    fit: "contain",
                                    width: 300,
                                    height: 200,
                                    background: { r: 255, g: 255, b: 255, alpha: 1 },
    
                                })
                                .jpeg()
                                .toFile(file, (err, info) => {
                                    // console.log(info)
                                    if (err) {
                                        console.log(err)
                                        console.log('MIssing image for ' + counter)
                                        image_link = "/images/missing.jpg"
    
                                    } else {
                                        console.log(products[0].image_url, counter)
                                    }
                                })
    
    
                            
                        }
                        image_link = `/images/product-images/monitors/${fileName}.jpg`
                        
                    } catch (e) {
                        // console.log(e)
                        console.log('MIssing image for ' + counter)
                        image_link = "/images/missing.jpg"
                    }
                    // await timeout(500)


                    monitors__model_data.push([
                        model.trim().toUpperCase(),
                        model_name.trim().toUpperCase(),
                        products[0].brand.trim().toUpperCase(),
                        avgPrice,
                        search_string,
                        image_link
                    ])

                    for (let j = 0; j < search_string.split(" ").length; j++) {

                        monitors__model_keywords.push([
                            model.trim().toUpperCase(),
                            search_string.split(" ")[j]
                        ])
                    }
                    counter++






                }
            }



            await connection.query(`DELETE FROM monitors__temp_model_data`)
            await connection.query(`INSERT INTO monitors__temp_model_data (model_ID, name, brand, avg_price, search_terms, image_url) VALUES ?`, [monitors__model_data])

            await connection.query(`DELETE FROM monitors__temp_model_keywords`)
            await connection.query(`INSERT INTO monitors__temp_model_keywords (model_ID, keyword) VALUES ?`, [monitors__model_keywords])



            await connection.query(`DELETE FROM monitors__temp_data`)
            await connection.query(`INSERT INTO monitors__temp_data (model_ID, name, price, brand, location, link, image_url, customizable, active) VALUES ?`, [items_data]) // Set row_ID to null for easier access

            // console.log(model_data)

            await connection.commit()
            const mod = require(`${__dirname}/specifications.js`)
            await mod.specs()
            
            console.log("----------------- COPYING OVER monitors__dataBASE -----------------")

            await connection.beginTransaction()

            // Delete all rows from monitors__model_data that match a model ID in monitors__temp_model_data (this means that the product was re-scraped, monitors__data might b updated)
            await connection.query(`DELETE FROM monitors__model_data WHERE monitors__model_data.model_ID IN (SELECT monitors__temp_model_data.model_ID FROM monitors__temp_model_data)`)
            await connection.query(`INSERT INTO monitors__model_data (SELECT * FROM monitors__temp_model_data)`)

            // monitors__data unlikely to be updated, so just add the new rows in
            await connection.query(`INSERT INTO monitors__model_keywords (SELECT * FROM monitors__temp_model_keywords WHERE monitors__temp_model_keywords.model_ID NOT IN (SELECT monitors__model_keywords.model_ID FROM monitors__model_keywords))`)

            // await connection.query(`DELETE FROM monitors__model_keywords `)

            // await connection.query(`INSERT INTO monitors__model_data (SELECT * FROM monitors__temp_model_data WHERE monitors__temp_model_data.model_ID NOT IN (SELECT monitors__model_data.model_ID FROM monitors__model_data))`)


            // Find rows from monitors__data that are NOT in temp_data (i.e. products that are now discontinued / OOS) and set as inactive
            await connection.query(`UPDATE monitors__data SET active = 0 WHERE row_ID IN
            (
                SELECT row_ID FROM (
                    SELECT row_ID FROM monitors__data WHERE monitors__data.link NOT IN (SELECT monitors__temp_data.link FROM monitors__temp_data)
                )  as arbitaryTableName
            ) 
            `)

            // Find rows that are in monitors__data AND temp_data (i.e. discontinued rows will NOT be selected)
            // Delete them so that we can refresh things like price, name etc
            await connection.query(`DELETE FROM monitors__data WHERE monitors__data.link IN (SELECT monitors__temp_data.link FROM monitors__temp_data)`)
            await connection.query(`INSERT INTO monitors__data (model_ID, name, price, brand, location, link, image_url, customizable, active) VALUES ?`, [items_data])
            await connection.commit()
            console.log("----------------- COMPLETED COPYING OVER monitors__dataBASE -----------------")


            await connection.release()
            var endTime = new Date().getTime()
            console.log("Ended script at " + endTime)
            console.log("Time taken: " + (endTime - startTime))

            console.log("----------------- COMPLETED EXECUTING FILE: sorter.js -----------------")
            
            return true







            function searchTermsGenerator(input) {
                // input is an array of strings
                var searchString = ""
                input.forEach(string => {

                    // string = string.replace(/\[[^\]]*]|\([^)]*\)*|\*[^*]*\*/g, " ") // brackets
                })

            }
            function removeDuplicatesString(string) {
                // String is space-delimited
                return Array.from(new Set(string.split(" "))).join(" ")
            }

            function generateModelName(string, model_ID) {



                string = Array.from(new Set(string.split(" "))).join(" ") // Remove duplicates

                // only return actual words
                let arr = string.split(" ")
                let returnString = ""
                for (var i = 0; i < arr.length; i++) {
                    let word = arr[i]
                    word = word.toLowerCase().trim()

                    // Match numbers
                    if (!Number.isNaN(Number(word))) {
                        returnString = returnString + " " + word
                        continue
                    }

                    // Match screen sizes
                    if (word.match(/((\d\d\.)?\d+-?(in(ch)?|"|''?))/gi)) {
                        returnString = returnString + " " + word
                        continue
                    }

                    if (dictionary[word] || extras[word]) {
                        if (!extras.specs[word])
                            returnString = returnString + " " + word
                        continue
                    }

                }
                return returnString.toUpperCase().trim()



                // Remove brackets if what's inside is NOT model number or word
                // if inside is model number / word, only strip brackets
                var foundBracket = string.match(/\[[^\]]*]|\([^)]*\)*|\*[^*]*\*/g)
                if (foundBracket) {

                    foundBracket.forEach(match => {
                        let stripBrackets = false
                        // Strip the brakcets for word comparison
                        let matchNew = match.replace(/\(|\)|\[|\]|\*/g, "")
                        if (matchNew.includes(model_ID)) {
                            stripBrackets = true
                        }

                        var wordArr = matchNew.split(" ")

                        for (var i = 0; i < wordArr.length; i++) {
                            var word = wordArr[i]

                            if (dictionary[word] || extras[word]) {
                                // Remove this bracket
                                stripBrackets = true
                                break;
                            }

                        }
                        if (stripBrackets) {
                            string = string.replace(match, matchNew)
                        } else {
                            string = string.replace(match, "")
                        }
                    })

                }

                // Remove specifications
                string = string.replace(/\d+[kgtp]b/gi, "")

                // GHZ
                string = string.replace(/\d.\d[gm]hz/gi, "")

                // 8-core
                string = string.replace(/\d-core/gi, "")

                // cpu name
                string = string.replace(/[ir]\d[-\s]\d\d\d\d\w?\w?[kqe]?/gi, "")
                string = string.replace(/ryzen\s\d\s\d\d\d\d(\d?|(\d\d)?)\w/gi, "")

                // Remove special characters
                string = string.replace(/,|®|™|\+|\/\/|–|:/g, "")
                return string
            }
            function subCompare(needle, haystack, min_substring_length) {

                // Min substring length is optional, if not given or is 0 default to 1:
                min_substring_length = min_substring_length || 1;

                // Search possible substrings from largest to smallest:
                for (var i = needle.length; i >= min_substring_length; i--) {
                    for (j = 0; j <= (needle.length - i); j++) {
                        var substring = needle.substr(j, i);
                        var k = haystack.indexOf(substring);
                        if (k != -1) {
                            return {
                                found: 1,
                                substring: substring,
                                needleIndex: j,
                                haystackIndex: k
                            }
                        }
                    }
                }
                return {
                    found: 0
                }
            }
            function escapeRegExp(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
            }
        } catch (e) {
            console.log(e)
            return false
        }
    })();

process.on('uncaughtException', function (exception) {
    console.log(exception); // to see your exception details in the console
    // if you are on production, maybe you can send the exception details to your
    // email as well ?
});
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeFileName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toUpperCase();
}