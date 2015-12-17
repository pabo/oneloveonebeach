//brett.schellenberg@gmail.com
// requires jQuery
//
// assumes that there's an element containing a single anchor tag:
// <div id='blah'><a href='whatever'>Initial Text</a></div>
//
// then you'd call .animate() like so:
// var handle = elementCycle.animate({
//   delay: 10000,
//   fadeOut: 1000,
//   fadeIn: 500,
//   element: $("div#blah"),
//   array: [ "one", "two", "three", "four" ],
// });
//
// later you can call .stop() like:
// elementCycle.stop(handle);

var elementCycle = (function($) {
	//my gets returned, so is a container of public variables/methods/whatever
	var my = {};

	//private
	function animate (options) {
		var $element = options.element;
		$element.animate({
			opacity: 0,
			top: 0,
		}, options.fadeOut, function() {
			$element.children('a').text(options.array[Math.floor(Math.random() * options.array.length)]);
			$element.css({ top: 0 });
			$element.animate({
				opacity: 1,
			}, options.fadeIn);
		});
	};

	//public
	my.stop = function(handle) {
		clearInterval(handle);
	}

	my.animate = function(options) {
		//default option values
		options = $.extend({}, {
			delay: 2500,
			fadeOut: 800,
			fadeIn: 200,
		}, options );

		return setInterval(function() {animate(options)}, options.delay);
	};

	return my;
}(jQuery));
