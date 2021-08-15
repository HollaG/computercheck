function toggleView(elem) { 

    elem.querySelector("i").classList.toggle("flipped")
    elem.querySelector("i").classList.toggle("unflipped")

    setTimeout(function() { 
        if (elem.querySelector('p').innerText == "View more specs") elem.querySelector('p').innerText = "View less specs"
        else elem.querySelector('p').innerText = "View more specs"
    }, 350)
    
}

function toggleExpand(elem) { 
    elem.disabled = true
    if (elem.innerText == "EXPAND ALL") {
        document.querySelectorAll(".view-more-btn").forEach(e =>{
            if (e.querySelector('p').innerText == "View more specs") {
                e.click()
                elem.innerText = "HIDE ALL"
            }
        })
    } else { 
        document.querySelectorAll(".view-more-btn").forEach(e =>{
            if (e.querySelector('p').innerText == "View less specs") {
                e.click()
                elem.innerText = "EXPAND ALL"
            }
        })
    }
    setTimeout(function(){ elem.disabled = false}, 350)

}

let loadCount = 24

let listenerActive = false
function loadMore(all) { 
    let btn = document.querySelector("#load-more-btn")
    let btn2 = document.querySelector("#load-all-btn")
    btn.disabled = true
    btn2.disabled = true

    document.querySelectorAll(".plus-icon").forEach(e => e.style.display = "none")
    document.querySelectorAll(".spinner-icon").forEach(e => e.style.display = "inline-block")

    let text = ""
    if (all) text = `${loadCount}-_-true`
    else text = `${loadCount}-_-false`

    // Send request to server for the HTML
    let xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function() {
        
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
                    btn2.style.display = 'none'
                    
                    document.querySelector("#loaded-text").style.display = 'block'
                    document.removeEventListener('scroll', scrollEvtListener)
                }
                loading = false
                filter()
               
            }
            if (this.status == 204) { 
                btn.style.display = 'none'
                document.querySelector("#loaded-text").style.display = 'block'
            }
            
            btn.disabled = false
            btn2.disabled = false
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

let loading = false // cos if scroll too fast, it might fire loadMore() on every scroll 

function scrollEvtListener(evt) { 

    if ((getDocHeight() - Math.round(getScrollXY()[1] + window.innerHeight) < 1000) && !loading) {
        console.log("Loading more items")
        listenerActive = true
        loading = true
        loadMore()
    }
}



//below taken from http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
function getScrollXY() {
    var scrOfX = 0, scrOfY = 0;
    if( typeof( window.pageYOffset ) == 'number' ) {
        //Netscape compliant
        scrOfY = window.pageYOffset;
        scrOfX = window.pageXOffset;
    } else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
        //DOM compliant
        scrOfY = document.body.scrollTop;
        scrOfX = document.body.scrollLeft;
    } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
        //IE6 standards compliant mode
        scrOfY = document.documentElement.scrollTop;
        scrOfX = document.documentElement.scrollLeft;
    }
    return [ scrOfX, scrOfY ];
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


