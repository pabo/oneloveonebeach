// brett.schellenberg@gmail.com
//
// DESCRIPTION
// Will make ajax requests to populate an HTML element with the results of the request. We keep actual ajax request
// volume down with a number of methods including a rate limit and a cache of previous requests and results.
//
// requires jquery
// variables that start with $ are jquery collections
//
// KNOWN ISSUES
// query ending in a punctuation mark that is in the result will not highlight.
//   type: jersey mike' and the single quote won't be highlighted
//   type: jersey mike's and the whole thing will be properly highlighted
//
// TYPICAL USAGE
// var ajaxGetter = new AjaxGet({
//   resultsContainer: $("div#results"),
//   requestURL: "/cgi/q.php",
//   requestData: function(data) { return { query: data }; },
//   resultsGenerator: function(uniqueRequestKey, json) {
//     //how to generate results from the given uniqueRequestKey and json object
//   },
//   rateLimit: 300,
// });

function AjaxGet(options) {

	//constructor with "new" clobber protection
	if (!(this instanceof AjaxGet)) {
		return new AjaxGet(options);
	}

	var $resultsContainer = options.resultsContainer, //jQuery object specifying where to put the results (required)
		requestURL        = options.requestURL,       //URL of ajax json service (required)
		requestData       = options.requestData,      //function which takes (event) and returns the json ajax request data object (required)
		resultsGenerator  = options.resultsGenerator, //function which takes (query, jsonResult) and returns a jQuery object containing the results (required)
		uniqueRequestKeyGenerator  = options.uniqueRequestKeyGenerator, //function which takes (event) and returns a unique id to use as a key for caching results
		rateLimit         = options.rateLimit || 500, //don't do ajax calls more often than this many milliseconds (optional)

		lastAjaxRequestTime = Date.now(),             //the last time we made an ajax call
		lastRequestKey = "",                          //the last value we used in the ajax call
		lastUpdatedTime = Date.now(),                 //the last time we updated the UI
		setTimeoutHandle = 0,                         //keep track of existing setTimeout so we can cancel it
		cachedResults = {},                           //cache containing the results of previous ajax calls
		uniqueRequestKey,                             //key to use in cachedresults
		that = this;                                  //preserve value of this for functions defined here

	// scheduleUpdate is a public method that can be called to update the results with a new query. This is typically
	// called in an input element's change or keyup event. It will either immediately update the $resultsContainer or schedule a later update:
	//  - if we can do the update without an ajax call, we do so immediately
	//  - if we need an ajax call to to the update, and it's been at least rateLimit milliseconds, we do the ajax call
	//  - if we need an ajax call to do the update, but we last did an ajax call within rateLimit milliseconds, we schedule the ajax call for later.
	this.scheduleUpdate = function(e) {
		var now = Date.now(),
			timeSinceLastAjaxRequest = now - lastAjaxRequestTime,
			uniqueRequestKey = uniqueRequestKeyGenerator(e);

		//short circuit for empty queries and keypresses that didn't actually change our uniqueRequestKey
		if (uniqueRequestKey === lastRequestKey) {
			return;
		}
		else if (uniqueRequestKey === "") {
			//updateResults(uniqueRequestKey, "");
			//return;
		}

		//now we know our uniqueRequestKey changed since last time, so update the resultsContainer with either the cached result
		//or the results of a new ajax call

		//if we already have a cached result, update it right away without regard to any rate limits
		if (cachedResults.hasOwnProperty(uniqueRequestKey)) {
			clearTimeout(setTimeoutHandle);
			updateResults(uniqueRequestKey, cachedResults[uniqueRequestKey]);
		}
		//FIXME this logic is tied to queries and should live outside the function in a callback?
		//if this uniqueRequestKey is an extension of a cached uniqueRequestKey that had 0 results, then it too will have 0 results
		else if (Object.keys(cachedResults).some(function(element) {
					return (element !== '' && cachedResults[element].length === 0 && uniqueRequestKey.indexOf(element) !== -1);
				})) {
			//TODO similarly, we can shave off even more ajax calls if this query is a substring of a cached one
			//AND the cached results represent a non truncated result set (that is, if a search CAN return
			//up to 10 maxResults and a search for "foobar" only returned 3 results, then a search for "foobars"
			//will return a subset of the results of "foobar" which we could compute locally.)
			//
			//This would also be a good place to preprocess the result set based on cached results, so that the UI
			//updates with new, correct (albeit incomplete) results before the ajax request completes.

			updateResults(uniqueRequestKey, "");
		}
		else {
			//We didn't find anything useful in the cache, so we'll need a new ajax request. Do that now if rateLimit allows us to.
			if (timeSinceLastAjaxRequest > rateLimit) {
				lastAjaxRequestTime = now;
				$.getJSON(requestURL, requestData(uniqueRequestKey))
				.done(function(ajax) {
					//ensure we only update if this ajax request originated -after- we last updated the UI.
					//otherwise random network latency can cause a stale request to overwrite a newer one.
					//but since the ajax round trip is a sunk cost, we might as well cache the results either way.
					var $resultsObject = resultsGenerator(uniqueRequestKey, ajax);
					cachedResults[uniqueRequestKey] = $resultsObject;

					if (now > lastUpdatedTime) {
						updateResults(uniqueRequestKey, $resultsObject);
						lastUpdatedTime = now;
					}
				});
			}
			else {
				//we are rate limited
				//cancel the pending scheduleUpdate call
				clearTimeout(setTimeoutHandle);

				//schedule a scheduleUpdate to execute in the remainder of the rateLimit that hasn't passed yet
				setTimeoutHandle = setTimeout(function() {that.scheduleUpdate(e);}, rateLimit - timeSinceLastAjaxRequest);
			}
		}
	};

	// update the UI with the $resultsObject. calling this with empty string has the effect of hiding the div
	function updateResults(uniqueRequestKey, $resultsObject) {
		lastRequestKey = uniqueRequestKey;
		$resultsContainer.html("");
		if ($resultsObject.length === 0) {
			$resultsContainer.hide();
		}
		else {
			$resultsContainer.append($resultsObject);
			$resultsContainer.show();
		}
	}

}
