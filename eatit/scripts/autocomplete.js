// brett.schellenberg@gmail.com
//
// DESCRIPTION
// Given an HTML input element (or other element that can accept keypresses), and an HTML container of options,
// AutoComplete creates an auto-complete interface where a user can select an option with arrow keys or the mouse.
//
// intercepts keyup/keydown events on inputElement: some keys like arrows, enter are captured; everything else is passed through to the keyupCallback
//
// requires jquery
// variables that start with $ are jquery collections
//
// KNOWN ISSUES
// none
//
// TYPICAL USAGE
// var AutoCompleter = new AutoComplete({
//   inputElement: $("input#query"),
//   optionsContainer: $("div#results"),
//   optionSelector: "div.result",
//   selectedClass: "selected",
//   keyupCallback: function(query) {
//     //what should happen on keyup, like updating the div#results div with new results
//     //query argument is the normalized value of input#query
//   },
//   selectedCallback: function($selectedOption, isHard) {
//     //what should happen on selection.
//     //note that a hard selection is a user clicking or otherwise selecting an item
//     //while a soft selection is just the UI selecting (like when arrowing through the list)
// });

function AutoComplete(options) {
	//constructor with "new" clobber protection
	if (!(this instanceof AutoComplete)) {
		return new AutoComplete(options);
	}

	var $inputElement     = options.inputElement,                //jQuery object (required)
		$optionsContainer = options.optionsContainer,            //jQuery object (required)
		optionSelector    = options.optionSelector,              //string jQuery selector that describes what an option looks like. example: "div.result" (required)
		selectedClass     = options.selectedClass || "selected", //class that will be applied to the selected option (optional)
		keyupCallback     = options.keyupCallback,               //function that will be called on keyup, if we decide the keyup event wasn't meant for us (optional)
		selectedCallback  = options.selectedCallback,            //function that will be called on selection (optional)

		$selectedOption = $(),      //jQuery object representing the currently selected option
		isHard = false,             //boolean whether the user made a selection that should persist (via click, or arrow and enter).
		userEnteredValue,           //what the user actually typed in
		captureKeyCodes = [         //key codes that represent the user interacting with us, as opposed to entering text
			13, //enter
			37, //left arrow
			38, //up arrow
			39, //right arrow
			40, //down arrow
		];


	// arrow up key, arrow down key, and enter key are the user trying to make a selection from our list.
	// on arrow down, we soft-select either the first option, the next option, or no option depending on what was previously selected
	// on arrow up follows similar logic.
	// on enter key, we hard-select the currently soft-selected option.
	$inputElement.keydown(function(e){
		//don't respond to events where shift key is being held down; user might be trying to (for instance) shift+up arrow to select
		if (e.shiftKey === false) {
			if (e.which === 38) { //arrow up
				e.preventDefault();
				if ($selectedOption.length) {
					makeSelection($selectedOption.prev(optionSelector).length ? $selectedOption.prev(optionSelector) : $(), false);
				}
				else {
					makeSelection($optionsContainer.children(optionSelector).last(), false);
				}
			}
			else if (e.which === 40) { //arrow down
				e.preventDefault();
				if ($selectedOption.length) {
					makeSelection($selectedOption.next(optionSelector).length ? $selectedOption.next(optionSelector) : $(), false);
				}
				else {
					makeSelection($optionsContainer.children(optionSelector).first(), false);
				}
			}
			else if (e.which === 13) { //enter
				e.preventDefault();
				makeSelection($optionsContainer.children(optionSelector + "." + selectedClass), true);
			}
		}
	});

	//pass almost all keyup events on through to the keyupCallback
	$inputElement.keyup(function(e){
		//HACK for browsers like safari that support bfcache
		//we need this to be off as we interact with the autocompleter
		//but we'll need it to be on if we come back to the page via the back button so we keep our form data
		$inputElement.attr("autocomplete", "off");

		if (captureKeyCodes.indexOf(e.which) !== -1) {
			//these keyCodes are the user interacting with the autocompleter itself, so we don't call keyupCallback
		}
		else {
			//these keyCodes are the user entering text (or at least they -could- be entering text) so we call keyupCallback
			userEnteredValue = $inputElement.val();

			// user possibly changed the value of inputElement. selection should be invalidated
			clearSelection();

			if (typeof keyupCallback === 'function') {
				keyupCallback(e); // keyupCallback is something like ajaxGetter.scheduleUpdate
			}
		}
	});

	//hovering over an option, make the soft-selection
	$optionsContainer.mouseover(function(e){
		makeSelection($(e.target).closest(optionSelector), false);
	});

	//hovering no more over an option. clear the soft-selection
	$optionsContainer.mouseout(function(e){
		clearSelection();
	});

	//mousedown instead of click so that this event fires before the blur event
	//touchend for mobile devices
	$optionsContainer.on("click touchend", function(e){
		makeSelection($(e.target).closest(optionSelector), true);
	});

	// blur event needs to yield to other events like click, so delay it a tiny bit
	//when the input element loses focus, clear the soft-selection and close the options
	$inputElement.blur(function(e){
		setTimeout(function() {
			//if the user arrows to a selection, then clicks somewhere else on the page, should we keep the selection or not? For now, don't keep it.
			clearSelection();
			$optionsContainer.hide();
		}, 10);
	});

	//when the input element re-gains focus, show the options again, unless the user already selected one manually
	$inputElement.focus(function(e){
		if (! isHard) {
			$optionsContainer.show();
		}
	});

	//this is what sets the $selectedOption
	function makeSelection($target, hardness) {
		//hardness is whether the user made a selection that should persist (via click, or arrow and enter).
		//compare to selection that occurs when the user arrows through the list
		isHard = hardness;
		if (isHard) {
			$optionsContainer.hide();

			//HACK for browsers like safari that support bfcache
			//we need this to be on if we come back to the page via the back button so we keep our form data
			//but we want it to be off as we interact with the autocompleter
			$inputElement.attr("autocomplete", "on");
		}

		$selectedOption = $target;
		updateUI();
		if (typeof selectedCallback === 'function') {
			selectedCallback($selectedOption, isHard);
		}
	}

	//updates the UI according to the current state of this object: either we have a selection (hard- or soft-) and so
	//we can display that, or we have no selection and we should display whatever the user actually entered
	function updateUI() {
		if ($selectedOption[0]) {
			$inputElement.val($selectedOption[0].textContent); //textContent will break on IE8 and older. Do we care?
			$optionsContainer.children(optionSelector).removeClass(selectedClass);
			$selectedOption.addClass(selectedClass);
		}
		else {
			//preserve cursor position in the case where the value didn't change
			if ($inputElement.val() !== userEnteredValue) {
				$inputElement.val(userEnteredValue);
			}

			$optionsContainer.children(optionSelector).removeClass(selectedClass);
		}
	}

	//only clears soft-selections, not hard-selections
	function clearSelection() {
		if (! isHard) {
			makeSelection($(), false);
			$optionsContainer.show();
		}
	}
}
