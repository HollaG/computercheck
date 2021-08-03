exports.cleaner = (string) => {

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
	string = string.replace(/\d+[gt]b/gi, "")
	string = string.replace(/\d\d\dSSD/gi, "")

	// GHZ
	string = string.replace(/\d.\d[gm]hz/gi, "")

	// 8-core
	string = string.replace(/\d-core/gi, "")

	// cpu name
	string = string.replace(/[ir]\d[-\s]\d\d\d\d\w?\w?[kqe]?/gi, "")
	string = string.replace(/ryzen\s\d\s\d\d\d\d(\d?|(\d\d)?)\w/gi, "")

	// GPU
	string = string.replace(/(R|G)TX\s?\d?\d\d\d(TI)?|(MX\s?\d\d\d)|RX\s?\d\d\d\d\s?(XT)?/gmi, "")
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


	// Remove lone numbers
	string = string.replace(/(?<=[ \t])(\d+)(?=[ \t])/g, "")
	// Split into array
	var stringArr = string.toLowerCase().split(" ")


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


	return finalArr.join(" ").trim().toUpperCase()



}