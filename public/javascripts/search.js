const opts = {
    searchable: false,
    multiple: true,
    selectedValue: ["#8e44ad", "#e74c3c"],
}

const filters = []
function filter(option) {

    if (option) { 
        if (option.getAttribute("selected") === "") {
            // this option was selected
            filters.push(option.getAttribute("value"))
        } else {
            // this option was unselected
            const index = filters.indexOf(option.getAttribute("value"));
            if (index > -1) {
                filters.splice(index, 1);
            }
    
        }
    }
    
    console.log(filters)

    // Get all elements
    let cardsLoaded = document.querySelectorAll(".product")

    for (let i = 0; i < cardsLoaded.length; i++) {
        let card = cardsLoaded[i]
        if (!filters.length) {
            card.parentElement.style.display = "block"
        } else {
            let terms = card.getAttribute("data-terms")
            // Check if at least onetext element from filters is in data-terms string
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

opts.placeholder = "Brand:"
const sBrand = new Selectr('#select-brand', opts)
sBrand.on("selectr.select", filter)
sBrand.on("selectr.deselect", filter)

opts.placeholder = "Store:"
const sLocation = new Selectr('#select-location', opts)
sLocation.on("selectr.select", filter)
sLocation.on("selectr.deselect", filter)

opts.placeholder = "Processor brand:"
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
