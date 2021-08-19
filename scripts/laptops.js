(async() => {
	try { 
		await require(`${__dirname}/laptops/scraper.js`)
		await require(`${__dirname}/laptops/sorter.js`)
		await require(`${__dirname}/laptops/specifications.js`)
		console.log("Done")
	} catch (e) { 
		console.log(e)
	}

})();