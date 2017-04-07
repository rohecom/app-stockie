	var isMobile = {
		Android: function() {
				return (navigator.userAgent.match(/Android/i) != null);
		},
		BlackBerry: function() {
				return (navigator.userAgent.match(/BlackBerry/i) != null);
		},
		iOS: function() {
				return (navigator.userAgent.match(/iPhone|iPad|iPod/i) != null);
		},
		Opera: function() {
				return (navigator.userAgent.match(/Opera Mini/i) != null);
		},
		Windows: function() {
				return (navigator.userAgent.match(/IEMobile/i) != null);
		},
		any: function() {
				return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
		}
	};

	function isEven(n) {
	   return n % 2 == 0;
	}

	function isOdd(n) {
	   return Math.abs(n % 2) == 1;
	}
	
	function isoDateStringToDate(isoStr) {
		returnDate = moment(isoStr, moment.ISO_8601);
		//alert(returnDate);
		return new Date(returnDate);
	};

	function addDays(startDate,numberOfDays)
	{
		var returnDate = new Date(startDate);
		returnDate = moment(returnDate).add(numberOfDays, 'days').toDate();
		//alert(returnDate);
		return new Date(returnDate);
	}

	function getStartOfTheYear(d) {
		var t = new Date(d);
		return new Date(t.getFullYear(), 0, 1);  // month 0 = jan
	};

	function getEndOfTheYear(d) {
		var t = new Date(d);
		return new Date(t.getFullYear(), 11, 31);  // month 0 = jan
	};

	function getStartOfTheMonth(d) {
		var t = new Date(d);
		return new Date(t.getFullYear(), t.getMonth(), 1);
	};

	function getEndOfTheMonth(d) {
		var t = new Date(d);
		return new Date(t.getFullYear(), t.getMonth() + 1, 0);
	};

	function getStartOfTheWeek(d) {
		var t = new Date(d);
		t = addDays(t, -1*t.getDay() + 1);
		return new Date(t);
	};

	function getEndOfTheWeek(d) {
		var t = new Date(d);
		t = addDays(t, 7-t.getDay());
		return t;
	};

	function dateToYMD(date, sep) {
	  var d = date.getDate();
	  var m = date.getMonth() + 1;
	  var y = date.getFullYear();
	  return '' + y + sep + (m<=9 ? '0' + m : m) + sep + (d <= 9 ? '0' + d : d);
	}

	function dateToDMY(date, sep) {
	  var d = date.getDate();
	  var m = date.getMonth() + 1;
	  var y = date.getFullYear();
	  return '' + (d <= 9 ? '0' + d : d) + sep + (m<=9 ? '0' + m : m) + sep + y;
	}

	function iif(cond, true_val, false_val) {
		if (cond) {
			return true_val
		}
		else {
			return false_val
		}
	}

if (!Array.prototype.indexOf)
{
   Array.prototype.indexOf = function(searchElement /*, fromIndex */)
	{
	"use strict";

	if (this === void 0 || this === null)
	  throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (len === 0)
	  return -1;

	var n = 0;
	if (arguments.length > 0)
	{
	  n = Number(arguments[1]);
	  if (n !== n)
	    n = 0;
	  else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
	    n = (n > 0 || -1) * Math.floor(Math.abs(n));
	}

	if (n >= len)
	  return -1;

	var k = n >= 0
	      ? n
	      : Math.max(len - Math.abs(n), 0);

	for (; k < len; k++)
	{
	  if (k in t && t[k] === searchElement)
	    return k;
	}
	return -1;
	};
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};