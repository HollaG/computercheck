const opts = {
    searchable: false,
    multiple: true,
    selectedValue: ["#8e44ad", "#e74c3c"],
}

const filters = []

const filterObj = {}
function filter(option, sliderOption) {

    if (sliderOption) { 
        // slider was slid
        filterObj["weight"] = sliderOption
    }

    if (option) { 
        let filterType = option.getAttribute("value").split(":")[0]
        let filterValue = option.getAttribute("value").split(":")[1]
        console.log(filterType, filterValue)
        if (option.getAttribute("selected") === "") {
            // this option was selected
            filters.push(option.getAttribute("value"))

            
            if (!filterObj[filterType])
                filterObj[filterType] = [filterValue]            
            else
                filterObj[filterType].push(filterValue)
        } else {
            // this option was unselected
            const index = filters.indexOf(option.getAttribute("value"));
            if (index > -1) {
                filters.splice(index, 1);
            }

            const i = filterObj[filterType].indexOf(filterValue)
            if (i > -1) filterObj[filterType].splice(i, 1)
            
            if (!filterObj[filterType].length) delete filterObj[filterType]
        }
    }
    
    console.log(filterObj)

    // Get all elements
    let cardsLoaded = document.querySelectorAll(".product")

    for (let i = 0; i < cardsLoaded.length; i++) {
        let card = cardsLoaded[i]
        if (!Object.keys(filterObj).length) {
            card.parentElement.style.display = "block"
        } else {
            let terms = card.getAttribute("data-terms")
            // Check if at least onetext element from filters is in data-terms string

           
            let termsObj = JSON.parse(terms)
            
            console.log(termsObj)
            let matchedAll = true
            
            for (filterType of Object.keys(filterObj)) { 

                // Special case for location, 
                if (filterType == "location") { 
                    // Check if the termsObj['location'] array 
                    matchedAll = findCommonElements(filterObj['location'], termsObj['locations'])
                    if (!matchedAll) break
                } else if (filterType == "weight") {
                    // Special case for weight  
                    // See if termsObj['weight'] falls between the filterObj[filterType][0] and [1]
                    console.log(termsObj[filterType])

                    let showUnknown = document.querySelector("#weight-unknown").checked
                    console.log(showUnknown)
                    if (showUnknown && termsObj[filterType] == "Unknown") {
                        
                    } else if (termsObj[filterType] == "Unknown" || Number(termsObj[filterType]) < filterObj[filterType][0] || Number(termsObj[filterType]) > filterObj[filterType][1]) {
                        // Either the weight was unknown, or the weight was less than min weight, or weight was more than minweight
                        matchedAll = false
                        break;
                    }



                } else if (!filterObj[filterType].includes(termsObj[filterType])) { 
                    
                    // For the selected filter (e.g. BRAND filter for 'acer'), this product is an acer

                    // termsObj[filterType] --> termsObj["brand"] == 'ACER' (A)
                    // filterObj[filterType] --> filterObj["brand"] == ['ACER', 'LENOVO'] (B)
                    // Array (B) includes String (A) --> Match

                    // All filterTypes MUST match at least once to return true. If one match fails, then we have to hide this product

                    // If we've gotten onto this block, it means that this item should be hidden
                    
                    matchedAll = false
                    break;
                }
            }

            if (matchedAll) { 
                card.parentElement.style.display = "block"
            } else { 
                card.parentElement.style.display = "none"

            }
            


            continue

            let isMatch = false
            for (filter_sel of filters) {
                if (terms.includes(filter_sel)) {
                    isMatch = true
                    break;

                }
            }
            if (isMatch) {
                // show
                card.parentElement.style.display = "block"

            } else {
                // hide
                card.parentElement.style.display = "none"

            }
        }





    }


}

let shown = false
function showFilters() { 
    if (shown) { 
        // hide
        document.querySelectorAll(".selectr-container:not(.has-selected)").forEach(e => e.parentElement.style.display = "none")
        document.querySelector("#toggle-filters-btn").classList.remove("active")
       
        if (!filterObj["weight"]) {
            document.querySelector(".select-weight-container").style.display = "none"
        }
        shown = false
    } else {
        document.querySelectorAll(".selectr-container:not(.has-selected)").forEach(e => e.parentElement.style.display = "block")
        document.querySelector("#toggle-filters-btn").classList.add("active")
        
        document.querySelector(".select-weight-container").style.display = "block"
        shown = true
    }
}




opts.placeholder = "Brand:"
const sBrand = new Selectr('#select-brand', opts)
sBrand.on("selectr.select", filter)
sBrand.on("selectr.deselect", filter)

opts.placeholder = "Store:"
const sLocation = new Selectr('#select-location', opts)
sLocation.on("selectr.select", filter)
sLocation.on("selectr.deselect", filter)

opts.placeholder = "Processor model:"
const sPbrand = new Selectr('#select-p-brand', opts)
sPbrand.on("selectr.select", filter)
sPbrand.on("selectr.deselect", filter)

opts.placeholder = "RAM:"
const sRam = new Selectr('#select-ram', opts)
sRam.on("selectr.select", filter)
sRam.on("selectr.deselect", filter)

opts.placeholder = "Screen size:"
const sScreen = new Selectr('#select-display', opts)
sScreen.on("selectr.select", filter)
sScreen.on("selectr.deselect", filter)

opts.placeholder = "Operating system:"
const sOs = new Selectr('#select-os', opts)
sOs.on("selectr.select", filter)
sOs.on("selectr.deselect", filter)
function findCommonElements(arr1, arr2) {
    return arr1.some(item => arr2.includes(item))
}