const fs = require("fs-extra")
const mysql = require("mysql2/promise")

const db = require("../configuration/database.json")
const pool = mysql.createPool(db)

var startTime = new Date().getTime()
console.log("Started script at " + startTime)

    ; (async () => {
        try {
            


            const dictionary = await fs.readJSON(`${process.cwd()}/data/dictionary.json`)
            const extras = await fs.readJSON(`${process.cwd()}/data/extras.json`)

            const files = await fs.readdir(`${process.cwd()}/data/raw`)
            const PRODUCTS = []
            console.log(files)
            for (var i = 0; i < files.length; i++) {
                
                var file = files[i]
                var data = await fs.readJSON(`${process.cwd()}/data/raw/${file}`)
                for (var j = 0; j < data.length; j++) {
                    var item = data[j]
                    // delete all non numbers from price
                    let price = item.price.replace("U.P.", "")
                    price = "$" + price.replace(/[A-za-z \s$,]/g, "")
                    price.includes(".") ? price = price : price = price + ".00"
                    item.price = price
                    item.cleaned = cleaner(item.name) ? cleaner(item.name) : "UNIDENTIFIED"
                    item.ID = `${i}-${j}`
                    if (item.brand.toUpperCase() == "SURFACE") item.brand = "MICROSOFT"

                    if (!item.link.match(/^https?:\/\//g)) item.link = "https://" + item.link

                }
                PRODUCTS.push(...data)

            }

            console.log(PRODUCTS)



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
            
            for (brand of Object.keys(brandGrouped)) {
                var products = brandGrouped[brand]
                for (var i = 0; i < products.length; i++) {
                    var item = products[i]
                    var itemSKU = item.cleaned.toLowerCase()

                    if (itemSKU == "unidentified") { 
                        item.model_ID = "unidentified"
                        main['unidentified'].push(item)
                        continue;
                    }
                    
                    var itemSKUArray = itemSKU.split(" ")
                    const comparer = {}
                    itemSKUArray.forEach(word => comparer[word] = 1)

                    
                    
                    var hasMatch = false
                    


                    for (var j = 0; j < products.length; j++) { // iterate thru all other products of the same brand (e.g. ASUS / lenovo etc)
                        if (i == j) continue // if this item is the same, ignore
                        
                        var comparedItem = products[j]
                        var comparedItemSKU = comparedItem.cleaned.toLowerCase()
                        
                        


                        if (comparedItemSKU.includes(itemSKU) || itemSKU.includes(comparedItemSKU)) {
                            hasMatch = true
                            // console.log(itemSKU + " matches with " + comparedItemSKU)
                            // add to the matched object the SKU with the lesser length
                            if (comparedItemSKU.length <= itemSKU.length) {
                                // Use comparedItemSKU as the key, since it's more liekly to be the correct one
                                // Check if the main object already has this item
                                item.model_ID = comparedItemSKU
                                
                                if (main["matched"][comparedItemSKU]) main["matched"][comparedItemSKU].push(item)
                                else main["matched"][comparedItemSKU] = [item]

                            } else {
                                item.model_ID = itemSKU

                                if (main["matched"][itemSKU]) main["matched"][itemSKU].push(item)
                                else main["matched"][itemSKU] = [item]

                            }
                            break;


                        }
                    }
                    if (!hasMatch) { // no matches at all
                        item.model_ID = itemSKU
                        main['unmatched'][itemSKU] = item
                    }

                    // For each item, iterate through every item and check the % similarity
                }
            }



            await fs.writeFile(`${process.cwd()}/data/main.json`, JSON.stringify(main))
            console.log("wrote file")


            // MYSQL STUFF
            const connection = await pool.getConnection()

            // Insert rows for model_data
            const modelData = []
            const keywords = []
            var unmatchedModels = main["unmatched"]
            for (let model_ID of Object.keys(unmatchedModels)) { 
                let product = unmatchedModels[model_ID]
                let searchString = product.name
                searchString = searchString + " " + product.brand
                searchString.split(" ").forEach(string => {
                    if (string) {
                        keywords.push([
                            model_ID.toUpperCase().trim(),
                            string
                        ])
                    }
                })
                
                let newModelName = generateModelName(searchString, model_ID.toUpperCase().trim())

                if (!newModelName) newModelName = model_ID.trim().toUpperCase()
                modelData.push([
                    model_ID.toUpperCase(), 
                    newModelName,
                    product.brand.toUpperCase(),
                    product.name
                ])
                
            }
            var matchedModels = main["matched"]
            for (let model_ID of Object.keys(matchedModels)) { 
                let products = matchedModels[model_ID]
                let searchString = products[0].brand
                products.forEach(product => { 
                    searchString = searchString + " " + product.name
                })
                searchString = removeDuplicatesString(searchString)
                searchString.toUpperCase().trim()
                let newModelName = generateModelName(searchString, model_ID.toUpperCase().trim())

                if (!newModelName) newModelName = model_ID
                modelData.push([
                    model_ID.toUpperCase().trim(),
                    newModelName.toUpperCase().trim(), 
                    products[0].brand.toUpperCase().trim(),
                    searchString

                ])

                searchString.split(" ").forEach(string => {
                    if (string) {
                        keywords.push([
                            model_ID.toUpperCase().trim(),
                            string
                        ])
                    }
                })

            }

            await connection.query(`DELETE FROM model_data`)
            await connection.query(`INSERT INTO model_data (model_ID, name, brand, search_terms) VALUES ?`, [modelData])
            console.log(keywords)
            await connection.query(`DELETE FROM model_keywords`)
            await connection.query(`INSERT INTO model_keywords (model_ID, keyword) VALUES ?`, [keywords])

            const temp = []
            for (var i = 0; i < PRODUCTS.length; i++) { 
                temp.push([
                    PRODUCTS[i].name.toUpperCase().trim(), 
                    PRODUCTS[i].price.toUpperCase().trim(), 
                    PRODUCTS[i].brand.toUpperCase().trim(), 
                    PRODUCTS[i].location.trim(),
                    PRODUCTS[i].model_ID.toUpperCase().trim(),
                    PRODUCTS[i].link.trim()
                ])
            }
            
            await connection.query(`DELETE FROM data`)
            await connection.query(`INSERT INTO data (name, price, brand, location, model_ID, link) VALUES ?`, [temp])
            await connection.release()
           
            var endTime = new Date().getTime()
            console.log("Ended script at " + endTime)
            console.log("Time taken: " + (endTime - startTime))


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
        } catch (e) {
            console.log(e)
        }
    })();
