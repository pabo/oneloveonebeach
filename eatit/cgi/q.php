<?php
# brett.schellenberg@gmail.com
# JSON service that performs a row by row search on a given csv file and returns the appropriate matching rows.
#  - search string is passed via the "query" get variable
#  - we search on both columns of the csv: front-anchored and ignoring case and punctuation
#  - we return a maximum of $maxResults results, in the same order as in the csv
#
# YELP! BIG CAVEAT!
# For now, we do a hacky thing: request more data from yelp. Ideally a real implementation would have a
# db.csv that already contains all the info we need. I just wanted a little more info to display in this project.
# Since we are doing yelp API requests, our UI is not very responsive. I suggest you demo this project both WITH
# and WITHOUT yelp enabled. WITH to see what it could look like if we had access to more data on the backend, and
# WITHOUT to see how responsive our interface actually is.
$yelpEnabled = true;
$yelpZip = 92111; //kearny mesa


# given this csv:
# restaurant_name,cuisine_type
# Spicy City,Chinese
# Tajima,Ramen
# Super Sergio's,Tacos
# Korea House,Korean
# Tapioka Express,Coffee Shop
#
# q.php?query=ta would respond with this json:
# [{"name":"Tajima","cuisine":"Ramen"},{"name":"Super Sergio's","cuisine":"Tacos"},{"name": "Tapioka Express", "cuisine": "Coffee Shop"}]
#
# or, with $yelpEnabled:
# [ { "name": "Tajima", "cuisine": "Ramen", "yelpData": { "rating_img_url": "http:\/\/s3-media4.fl.yelpcdn.com\/assets\/2\/www\/img\/c2f3dd9799a5\/ico\/stars\/v1\/stars_4.png", "url": "http:\/\/www.yelp.com\/biz\/tajima-convoy-san-diego-5" } }, { "name": "Super Sergio's", "cuisine": "Tacos", "yelpData": { "rating_img_url": "http:\/\/s3-media1.fl.yelpcdn.com\/assets\/2\/www\/img\/5ef3eb3cb162\/ico\/stars\/v1\/stars_3_half.png", "url": "http:\/\/www.yelp.com\/biz\/super-sergios-san-diego" } }, { "name": "Tapioka Express", "cuisine": "Coffee Shop", "yelpData": { "rating_img_url": null, "url": null } } ]

#simulate some network traffic for testing
#sleep a random amount of time between 0 and 2 second
#sleep(2* mt_rand(0, mt_getrandmax()) / mt_getrandmax());

if ($yelpEnabled) {
	require_once("yelp.php");
}

$maxResults = 5;
$csvFile = "../db.csv";

$query = $_GET["query"];

#normalize search term
$query = normalize($query);

# empty search requests get empty results
if (!$query) {
	print json_encode("");
	return;
}


$results = [];

#open csv file and process it, appending matches to $results array
if (($handle = fopen($csvFile, "r")) !== FALSE) {
	while (($data = fgetcsv($handle, 0, ",")) !== FALSE) {
		#skip header row
		if ($data[0] === "restaurant_name") {
			continue;
		}

		#normalize this row
		$normalizedName = normalize($data[0]);
		$normalizedCuisine = normalize($data[1]);

		#if this row is a match, get the extra yelp data (if $yelpEnabled) and add it to $results
		if (preg_match("/^$query/i", $normalizedName) || preg_match("/^$query/i", $normalizedCuisine)) {
			if ($yelpEnabled) {
				$yelpData = getInfoForTopResult($data[0], $yelpZip);
				$relevantYelpData = $yelpData ? (object)array("rating_img_url" => $yelpData->rating_img_url, "url" => $yelpData->url) : "";
			}

			array_push($results, [ "name" => $data[0], "cuisine" => $data[1], "yelpData" => $relevantYelpData ]);
		}
	}
	fclose($handle);
}
else {
	#error opening file, fail silently and return empty result set
	print json_encode("");
	return;
}

$truncatedResults = array_slice($results, 0, $maxResults);
print json_encode($truncatedResults);
#print json_encode($truncatedResults, JSON_PRETTY_PRINT);

# HELPERS
function normalize($text) {
	#strip everything but letters, numbers, and spaces
	return preg_replace('/[^a-z0-9 ]+/i', '', $text);
}


?>
