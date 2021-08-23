let visibleItems = 24
let currentlyLoading = false

function toggleView(elem) {

    elem.querySelector("i").classList.toggle("flipped")
    elem.querySelector("i").classList.toggle("unflipped")

    setTimeout(function () {
        if (elem.querySelector('p').innerText == "View more specs") elem.querySelector('p').innerText = "View less specs"
        else elem.querySelector('p').innerText = "View more specs"
    }, 350)

}

function toggleExpand(elem) {
    elem.disabled = true
    if (elem.innerText == "EXPAND ALL") {
        document.querySelectorAll(".view-more-btn").forEach(e => {
            if (e.querySelector('p').innerText == "View more specs") {
                e.click()
                elem.innerText = "HIDE ALL"
            }
        })
    } else {
        document.querySelectorAll(".view-more-btn").forEach(e => {
            if (e.querySelector('p').innerText == "View less specs") {
                e.click()
                elem.innerText = "EXPAND ALL"
            }
        })
    }
    setTimeout(function () { elem.disabled = false }, 350)

}

let loadCount = 24

let listenerActive = false
function loadMore(all) {
    if (currentlyLoading) return
    
    currentlyLoading = true
    let btn = document.querySelector("#load-more-btn")
    // let btn2 = document.querySelector("#load-all-btn")
    btn.disabled = true
    // btn2.disabled = true

    document.querySelectorAll(".plus-icon").forEach(e => e.style.display = "none")
    document.querySelectorAll(".spinner-icon").forEach(e => e.style.display = "inline-block")

    let text = ""
    if (all) text = `${loadCount}-_-true`
    else text = `${loadCount}-_-false`

    // Send request to server for the HTML
    let xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function () {

        if (this.readyState == XMLHttpRequest.DONE) {
            if (this.readyState == 4 && this.status == 200) {
                let obj = JSON.parse(this.responseText)
                //- console.log(obj)
                document.querySelector("#item-container").lastElementChild.insertAdjacentHTML('afterend', JSON.parse(this.responseText).html)
                observer.observe();

                document.querySelectorAll(".plus-icon").forEach(e => e.style.display = "inline-block")
                document.querySelectorAll(".spinner-icon").forEach(e => e.style.display = "none")

                if (obj.ended) {
                    btn.style.display = 'none'
                    // btn2.style.display = 'none'

                    document.querySelector("#loaded-text").style.display = 'block'
                    document.removeEventListener('scroll', scrollEvtListener)
                }
                currentlyLoading = false
                visibleItems = visibleItems + Number(JSON.parse(this.responseText).number)
                btn.disabled = false
                // btn2.disabled = false
                filter()
                // setTimeout(loadMore, 1000)
                // loadMore()
                // if (visibleItems < 24) {
                //     console.log("Showing less than 24 items, loading more")

                //     loadMore()
                // }

            }
            if (this.status == 204) {
                btn.style.display = 'none'
                document.querySelector("#loaded-text").style.display = 'block'
            }

            
        }


    }
    let searchString = location.href.split("search=")[1]
    if (searchString)
        xhttp.open("GET", `/loadmore/${text}?search=${searchString}`, true);
    else
        xhttp.open("GET", `/loadmore/${text}`, true);

    xhttp.send()
    loadCount = loadCount + 24


    if (!all) {
        if (!listenerActive) {

            document.addEventListener("scroll", scrollEvtListener);

        }
    }


}


document.addEventListener("scroll", scrollEvtListener);

function scrollEvtListener(evt) {

    if ((getDocHeight() - Math.round(getScrollXY()[1] + window.innerHeight) < 1000) && !currentlyLoading) {
        console.log("Loading more items")
        listenerActive = true
        
        loadMore()
    }
}



//below taken from http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
function getScrollXY() {
    var scrOfX = 0, scrOfY = 0;
    if (typeof (window.pageYOffset) == 'number') {
        //Netscape compliant
        scrOfY = window.pageYOffset;
        scrOfX = window.pageXOffset;
    } else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
        //DOM compliant
        scrOfY = document.body.scrollTop;
        scrOfX = document.body.scrollLeft;
    } else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
        //IE6 standards compliant mode
        scrOfY = document.documentElement.scrollTop;
        scrOfX = document.documentElement.scrollLeft;
    }
    return [scrOfX, scrOfY];
}

//taken from http://james.padolsey.com/javascript/get-document-height-cross-browser/
function getDocHeight() {
    var D = document;
    return Math.max(
        D.body.scrollHeight, D.documentElement.scrollHeight,
        D.body.offsetHeight, D.documentElement.offsetHeight,
        D.body.clientHeight, D.documentElement.clientHeight
    );
}

// setTimeout(loadMore, 1000)
// loadMore()

// ------------------------- SEARCH.JS FILE -----------------------------
const opts = {
    searchable: false,
    multiple: true,
    selectedValue: ["#8e44ad", "#e74c3c"],
    // clearable: true,
    sortSelected: true
}

const filters = []

let filterObj = {}

let shown = false

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let filterObjFromURL = urlParams.get("filters")

if (filterObjFromURL) {
    filterObjFromURL = JSON.parse(filterObjFromURL)
    filter()

} else {
    filterObjFromURL = {}
}



function filter(option, sliderOption, sliderOptionPrice) {

    if (sliderOption) {
        // slider was slid
        filterObj["weight"] = sliderOption
    }
    if (sliderOptionPrice) {
        filterObj["price"] = sliderOptionPrice
    }

    if (option) {
        let filterType = option.getAttribute("value").split(":")[0]
        let filterValue = option.getAttribute("value").split(":")[1]

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



    // Get all elements
    let cardsLoaded = document.querySelectorAll(".product")
    let showUnknown = document.querySelector("#weight-unknown").checked
    if (showUnknown) filterObj.showUnknownWeight = true
    else filterObj.showUnknownWeight = false

    // Reset visibleitems to 0, add to it if matched card
    // If visible items at the end is less than 24, we will fire loadMore()
    // In loadMore(), if visible items after first load is still less than 24, we will add more again
    visibleItems = 0
    for (let i = 0; i < cardsLoaded.length; i++) {
        let card = cardsLoaded[i]
        if (!Object.keys(filterObj).length) {
            card.parentElement.style.display = "block"
        } else {
            let terms = card.getAttribute("data-terms")
            // Check if at least onetext element from filters is in data-terms string


            let termsObj = JSON.parse(terms)


            let matchedAll = true // If matchedAll is set to false, this item will be hidden (cos it failed one filter check)

            for (filterType of Object.keys(filterObj)) {

                let endLoop = false
                switch (filterType) {
                    case "location":
                        matchedAll = findCommonElements(filterObj['location'], termsObj['locations'])
                        break;
                    case "weight":
                        if (showUnknown && termsObj[filterType] == "Unknown") {

                        } else if (termsObj[filterType] == "Unknown" || Number(termsObj[filterType]) < filterObj[filterType][0] || Number(termsObj[filterType]) > filterObj[filterType][1]) {
                            // Either the weight was unknown, or the weight was less than min weight, or weight was more than minweight
                            matchedAll = false

                        }
                        break;
                    case "showUnknownWeight":

                        break;
                    case "price":
                        if (Number(termsObj[filterType]) < filterObj[filterType][0] || Number(termsObj[filterType]) > filterObj[filterType][1]) matchedAll = false
                        break;
                    default:
                        if (!filterObj[filterType].includes(termsObj[filterType])) {

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
                if (!matchedAll) endLoop = true


            }

            if (matchedAll) {
                card.parentElement.style.display = "block"
                visibleItems++
            } else {
                card.parentElement.style.display = "none"

            }

        }





    }
    console.log(visibleItems)
    if (visibleItems < 24) {
        console.log("Showing less than 24 items, loading more")
        loadMore()
    }


}


function showFilters() {
    if (shown) {
        // hide
        document.querySelectorAll(".selectr-container:not(.has-selected)").forEach(e => e.parentElement.style.display = "none")
        document.querySelector("#toggle-filters-btn").classList.remove("active")

        if (!Object.keys(filterObj).length) {
            document.querySelector("#copy-filters-btn").style.display = "none"
            document.querySelector("#clear-filters-btn").style.display = "none"
        
        }

        if (!filterObj["weight"]) {
            document.querySelector(".select-weight-container").style.display = "none"
        }
        if (!filterObj["price"]) {
            document.querySelector(".select-price-container").style.display = "none"

        }
        shown = false
    } else {
        document.querySelectorAll(".selectr-container").forEach(e => e.parentElement.style.display = "block")
        document.querySelector("#toggle-filters-btn").classList.add("active")
        document.querySelector("#copy-filters-btn").style.display = "block"
        document.querySelector("#clear-filters-btn").style.display = "block"
        document.querySelector(".select-price-container").style.display = "block"

        document.querySelector(".select-weight-container").style.display = "block"
        shown = true
    }
}

function copyFilters() {


    let text = window.location.origin

    if (urlParams.get("search")) text = text + `?search=${urlParams.get("search")}&filters=${JSON.stringify(filterObj)}`
    else text = text + `?filters=${encodeURIComponent(JSON.stringify(filterObj))}`

    copyTextToClipboard(text)

    document.querySelector("#copy-link-check").style.display = "inline-block"
    document.querySelector("#copy-link-clip").style.display = "none"
    document.querySelector("#copy-link-text").innerHTML = "Copied!"
    setTimeout(function () {
        document.querySelector("#copy-link-clip").style.display = "inline-block"
        document.querySelector("#copy-link-check").style.display = "none"

        document.querySelector("#copy-link-text").innerHTML = "Copy"
    }, 1000)

}

function clearFilters() {
    sBrand.clear()
    sLocation.clear()
    sPbrand.clear()
    sRam.clear()
    sScreen.clear()
    sOs.clear()
    weightSlider.set([dataObj.minWeight ? dataObj.minWeight : -1, dataObj.maxWeight ? dataObj.maxWeight : -1])
    priceSlider.set([dataObj.minPrice ? dataObj.minPrice : -1, dataObj.maxPrice ? dataObj.maxPrice : -1])
    
    if (!document.querySelector("#weight-unknown").checked)
        document.querySelector("#weight-unknown").click()


}


opts.placeholder = "Brand:"
const sBrand = new Selectr('#select-brand', opts)
sBrand.on("selectr.select", filter)
sBrand.on("selectr.deselect", filter)
if (filterObjFromURL.brand) sBrand.setValue(filterObjFromURL.brand.map(x => `brand:${x}`))

opts.placeholder = "Store:"
const sLocation = new Selectr('#select-location', opts)
sLocation.on("selectr.select", filter)
sLocation.on("selectr.deselect", filter)
if (filterObjFromURL.location) sLocation.setValue(filterObjFromURL.location.map(x => `location:${x}`))

opts.placeholder = "Processor model:"
const sPbrand = new Selectr('#select-p-brand', opts)
sPbrand.on("selectr.select", filter)
sPbrand.on("selectr.deselect", filter)
if (filterObjFromURL.processor_model) sPbrand.setValue(filterObjFromURL.processor_model.map(x => `processor_model:${x}`))

opts.placeholder = "RAM:"
const sRam = new Selectr('#select-ram', opts)
sRam.on("selectr.select", filter)
sRam.on("selectr.deselect", filter)
if (filterObjFromURL.ram) sRam.setValue(filterObjFromURL.ram.map(x => `ram:${x}`))

opts.placeholder = "Screen size:"
const sScreen = new Selectr('#select-display', opts)
sScreen.on("selectr.select", filter)
sScreen.on("selectr.deselect", filter)
if (filterObjFromURL.screen_size) sScreen.setValue(filterObjFromURL.screen_size.map(x => `screen_size:${x}`))

opts.placeholder = "Operating system:"
const sOs = new Selectr('#select-os', opts)
sOs.on("selectr.select", filter)
sOs.on("selectr.deselect", filter)
if (filterObjFromURL.os) sOs.setValue(filterObjFromURL.os.map(x => `os:${x}`))



// Weight slider handler
let weightRange = document.querySelector("#select-weight")

let weightSlider = noUiSlider.create(weightRange, {
    range: {
        'min': dataObj.minWeight ? dataObj.minWeight : -1,
        'max': dataObj.maxWeight ? dataObj.maxWeight : -1
    },
    step: 1,
    //- pips: {
    //-     mode: 'steps',
    //-     stepped: true,
    //-     density: 1
    //- },
    start: [dataObj.minWeight, dataObj.maxWeight],
    connect: true,
    behaviour: 'tap-drag',
    tooltips: true,
    format: {
        to: function (value) {
            return value
        },
        from: function (value) {
            return Number(value)
        }
    }

})

weightSlider.on('set', function (values, handle) {

    document.getElementById('select-weight-text').innerHTML = `Weight: ${values.join("g - ")}g`
    filter(null, values)
})

if (filterObjFromURL.weight) {
    weightSlider.set(filterObjFromURL.weight)
    document.getElementById('select-weight-text').innerHTML = `Weight: ${filterObjFromURL.weight.join("g - ")}g`
    filter(null, filterObjFromURL.weight)
}

if (filterObjFromURL.showUnknownWeight) {
    document.querySelector("#weight-unknown").checked = true
    filter()

}

// Price slider handler
let priceRange = document.querySelector("#select-price")

let priceSlider = noUiSlider.create(priceRange, {
    range: {
        'min': dataObj.minPrice ? dataObj.minPrice : -1,
        'max': dataObj.maxPrice ? dataObj.maxPrice : -1
    },
    step: 1,
    //- pips: {
    //-     mode: 'steps',
    //-     stepped: true,
    //-     density: 1
    //- },
    start: [dataObj.minPrice, dataObj.maxPrice],
    connect: true,
    behaviour: 'tap-drag',
    tooltips: true,
    format: {
        to: function (value) {
            return Math.round(value * 100) / 100
        },
        from: function (value) {
            return Math.round(value * 100) / 100
        }
    }

})

priceSlider.on('set', function (values, handle) {

    document.getElementById('select-price-text').innerHTML = `Price: $${values.join(" - $")}`
    filter(null, null, values)
})


if (filterObjFromURL.price) {
    priceSlider.set(filterObjFromURL.price)
    document.getElementById('select-price-text').innerHTML = `Price: $${filterObjFromURL.price.join(" - $")}`
    filter(null, null, filterObjFromURL.price)
}

function findCommonElements(arr1, arr2) {
    return arr1.some(item => arr2.includes(item))
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');

    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

if (Object.keys(filterObjFromURL).length) showFilters()