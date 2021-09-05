console.log("Service worker loadeds!")

const STATIC_CACHE_NAME = "cc-static-cache-v1.0.2"
const STATIC_CACHE_ARR = [
    '/',
    "/faq",
    "/fallback",
    '/javascripts/main.js',
    '/javascripts/app.js',
    '/stylesheets/style.css',
    '/images/masthead.jpg',
    '/images/missing.jpg',
    '/images/loading.jpg',
    "https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/3.6.0/mdb.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/3.6.0/mdb.min.css",
    "https://kit.fontawesome.com/e60b5739ed.js",
    "https://cdn.jsdelivr.net/npm/lozad/dist/lozad.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.7.0/nouislider.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.7.0/nouislider.min.css",
]

const DYNAMIC_CACHE_NAME = 'cc-dynamic-cache-v1.0.0'

// Cache size limiter - 1250
const CACHE_SIZE = 1250
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            
            if (keys.length > size) {
                // // Get number of items to delete from cache
                // let numberOfItems = keys.length - size              

                // Delete oldest first (oldest at start of array)
                cache.delete(keys[0]).then(limitCacheSize(name, size))
            }
        })
    })
}


// Install event
self.addEventListener("install", event => { 
    // console.log("Service worker has been installed.")
    // console.log(event)

    // Cache certain items
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            // cache is the opened cache
            console.log("Caching static assets")
            cache.addAll(STATIC_CACHE_ARR);
        })
    )
    
    
})

// Activate events
self.addEventListener("activate", event => { 
    // console.log("Service worker has been activated")
    // console.log(event)

    // Delete old versions of the cache
    event.waitUntil( 
        caches.keys().then(keys => {
            console.log(keys); // Keys are the name of the cache storage
            return Promise.all(keys
                .filter(key => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME ) // If the cache name is NOT the latest updated names, delete the cache
                .map(key => caches.delete(key))
            )
        })
    )
})

// Fetch events
self.addEventListener("fetch", (event) => {
    // console.log("Fetch event occuring", event)

    // Is the request in the static cache? If so, return the cached response
    event.respondWith(
        caches.match(event.request).then(cacheRes => { 
            return cacheRes || fetch(event.request).then(fetchRes => { // In the cache? Yes --> return, no --> go online and fetch
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                    cache.put(event.request.url, fetchRes.clone())
                    limitCacheSize(DYNAMIC_CACHE_NAME, CACHE_SIZE)
                    return fetchRes;
                })
            })
        }).catch(() => { // Not online --> Send fallback page
            console.log("User not online!")
            // Is it an image? If it's an image, send the missing image
            if (event.request.url.indexOf(".jpg") > -1) { 
                return caches.match("/images/missing.jpg")
            } 
            return caches.match("/fallback")
        }) 
    )

})

// delete unused caches??


// var dynamicCacheName = 'site-dynamic-v1';
// // activate event
// self.addEventListener('activate', evt => {
//     evt.waitUntil(
//         caches.keys().then(keys => {
//             return Promise.all(keys
//                 .filter(key => key !== dynamicCacheName)
//                 .map(key => caches.delete(key))
//             );
//         })
//     );
// });
// // fetch event
// self.addEventListener('fetch', evt => {
//     evt.respondWith(
//         caches.match(evt.request, { ignoreSearch: true }).then(cacheRes => {
//             return cacheRes || fetch(evt.request).then(fetchRes => {
//                 return caches.open(dynamicCacheName).then(cache => {
//                     cache.put(evt.request.url, fetchRes.clone());
//                     return fetchRes;
//                 })
//             });
//         })
//     );
// });