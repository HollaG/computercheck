function toggleView(elem) { 

    elem.querySelector("i").classList.toggle("flipped")
    elem.querySelector("i").classList.toggle("unflipped")

    setTimeout(function() { 
        if (elem.querySelector('p').innerText == "View more") elem.querySelector('p').innerText = "View less"
        else elem.querySelector('p').innerText = "View more"
    }, 350)
    
}

function toggleExpand(elem) { 
    elem.disabled = true
    if (elem.innerText == "EXPAND ALL") {
        document.querySelectorAll(".view-more-btn").forEach(e =>{
            if (e.querySelector('p').innerText == "View more") {
                e.click()
                elem.innerText = "HIDE ALL"
            }
        })
    } else { 
        document.querySelectorAll(".view-more-btn").forEach(e =>{
            if (e.querySelector('p').innerText == "View less") {
                e.click()
                elem.innerText = "EXPAND ALL"
            }
        })
    }
    setTimeout(function(){ elem.disabled = false}, 350)

}

let loadCount = 24
function loadMore(all) { 
    let btn = document.querySelector("#load-more-btn")
    let btn2 = document.querySelector("#load-all-btn")
    btn.disabled = true
    btn2.disabled = true

    let text = ""
    if (all) text = `${loadCount}-_-true`
    else text = `${loadCount}-_-false`

    // Send request to server for the HTML
    let xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function() {
        
        if (this.readyState == 4 && this.status == 200) {
            let obj = JSON.parse(this.responseText)
            //- console.log(obj)
            document.querySelector("#item-container").lastElementChild.insertAdjacentHTML('afterend', JSON.parse(this.responseText).html)
            observer.observe();

            if (obj.ended) {
                btn.style.display = 'none'
                btn2.style.display = 'none'

                document.querySelector("#loaded-text").style.display = 'block'
            }

            filter()
           
        }
        if (this.status == 204) { 
            btn.style.display = 'none'
            document.querySelector("#loaded-text").style.display = 'block'
        }
        btn.disabled = false
        btn2.disabled = false

    }
    let searchString = location.href.split("search=")[1]
    if (searchString)
        xhttp.open("GET", `/loadmore/${text}?search=${searchString}`, true);
    else
        xhttp.open("GET", `/loadmore/${text}`, true);

    xhttp.send()
    loadCount = loadCount + 24
}