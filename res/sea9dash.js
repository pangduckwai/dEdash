const COOK_PFX = "s9dashcook=";

let isIE = false;
if ((/*@cc_on ! @*/ false) || navigator.userAgent.match(/Trident/g)) {
	isIE = true;
}

let isEdge = (window.navigator.userAgent.indexOf("Edge") > -1);

d3.selection.prototype.first = function() {
	return d3.select(this[0][0]);
};
d3.selection.prototype.last = function() {
	return d3.select(this[0][this.size() - 1]);
};

// **** Util functions ****
function accessData(url, callBack, cnt) {
	let xmlhttp = new XMLHttpRequest();

	if (!cnt) cnt = 0;
	xmlhttp.onreadystatechange = function() {
		if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
			try {
				callBack(JSON.parse(xmlhttp.responseText));
			} catch (e) {
				if ((typeof e.message.startsWith === "function") &&
					e.message.startsWith("Unexpected end of input") && 
					(cnt < 3)) {
					setTimeout(function() { accessData(url, callBack, cnt+1); }, 100);
					return;
				} else if (cnt >= 3) {
					console.log("Retry " + cnt + " times for error '" + e.message + "'");
				} else {
					console.log(e);
				}
			}
		}
	};
	xmlhttp.ontimeout = function() {
		console.log("Request to " + url + " timed out");
	}
	xmlhttp.open("GET", url, true);
	xmlhttp.timeout = 1500;
	xmlhttp.send();
};

function configCharts() {
	console.log(document.cookie);
	let cooks = document.cookie.split(";");
	let confg = "";
	for (let idx = 0; idx < cooks.length; idx ++) {
		let cok = cooks[idx].trim();
		let pos = cok.indexOf(COOK_PFX);
		if (pos >= 0) {
			confg = cok.substring(pos + COOK_PFX.length, cok.length);
			break;
		}
	}

	if (confg.trim() !== "") {
		return JSON.parse(confg);
	} else if ((typeof DFLT_CHARTS !== 'undefined') && (DFLT_CHARTS.length > 0)) {
		console.log("Displaying default charts...");
		return DFLT_CHARTS;
	} else {
		return null;
	}
};

let configuredCookie = [];

function addToCookie(chart) {
	let cook = chart.toCookie();
	configuredCookie[configuredCookie.length] = cook;

	let expr = new Date();
	expr.setYear(expr.getFullYear() + 1);
	document.cookie = COOK_PFX + JSON.stringify(configuredCookie) + "; expires=" + expr.toUTCString();

	return cook;
};

function updateOnCookie(chart) {
	let cook = {};

	for (let j = 0; j < configuredCookie.length; j ++) {
		if ((configuredCookie[j].chartId + configuredCookie[j].row + configuredCookie[j].column) === chart.domId) {
			configuredCookie[j] = chart.toCookie();

			let expr = new Date();
			expr.setYear(expr.getFullYear() + 1);
			document.cookie = COOK_PFX + JSON.stringify(configuredCookie) + "; expires=" + expr.toUTCString();
			break;
		}
	}
}

function removeFromCookie(chart) {
	let cook = {};
	for (let idx = 0; idx < configuredCookie.length; idx ++) {
		if ((configuredCookie[j].chartId + configuredCookie[j].row + configuredCookie[j].column) === chart.domId) {
			cook = configuredCookie[idx];
			configuredCookie.splice(idx, 1);
			break;
		}
	}

	let expr = new Date();
	expr.setYear(expr.getFullYear() + 1);
	document.cookie = COOK_PFX + JSON.stringify(configuredCookie) + "; expires=" + expr.toUTCString();

	return cook;
};
