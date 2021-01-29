// *************************
// **  Chart prototype    **
// Life cycle:
//  onLoad() (html)
//    init() (framework)
//      addChannel() (framework)
//      showChart() (framework)
//        init() (charts - parent)
//          start() (charts - implementation)
//      start() (framework)
//        run() (channel)
//          render() (charts - implementation)
function Chart(chartId) {
	this.id = "chart-proto"; //ID of chart type
	this.name = "Chart Prototype";
	this.domId = (!chartId) ? this.id : chartId; //Element ID in DOM

	// Actual width and height in number of pixels
	this.chartWidth = -1;
	this.chartHeight = -1;

	// Number of grid cells to occupy
	this.startRow = 1;
	this.startColumn = 1;
	this.gridWidth = 1;
	this.gridHeight = 1;

	// Channel name to subscribe to
	this.channel = null;

	let getSize = function(domId) {
		let chartitem = d3.select("#"+domId);
		let container = chartitem.select(".chart-ctnt");
		if (container.empty()) return null;

		let size = container.node(); // get the actual DOM object from the d3 object
		let offset = 0;

		let title = container.select(".chart-title");
		if (!title.empty()) {
			offset = title.node().offsetHeight; // Use offsetHeight/Width or getBoundingClientRect() for DOM nodes, getBBox() for SVG elements
		}

		let width = (size.offsetWidth - 2 < 0) ? 0 : size.offsetWidth - 2;
		let height = (size.offsetHeight - 1 - offset < 0) ? 0 : size.offsetHeight - offset - 1;
		return {"width": width, "height": height, "offset": offset};
	};

	// Companion function of the constructor
	this.init = function(cfg) {
		this.startRow = cfg.row;
		this.startColumn = cfg.column;
		this.gridWidth = cfg.width;
		this.gridHeight = cfg.height;
		this.channel = cfg.channel;
	}

	// One time config after the chart is shown
	this.doInit = function() {
		let elmId = "#"+this.domId;
		let size = getSize(this.domId);
		this.chartWidth = size.width;
		this.chartHeight = size.height;

		let grph = d3.select(elmId).select(".chart-viz");
		if (grph.empty()) {
			grph = d3.select(elmId + "Container").append("svg").attr("class", "chart-viz");
		}
		grph.style("margin-top", size.offset)
			.attr("viewBox", "0 0 " + this.chartWidth + " " + this.chartHeight)
			.attr("preserveAspectRatio", "none");

		if (isIE) {
			d3.select(elmId).select(".chart-ctnt").style("height", this.chartHeight + "px");
		}
	};

	// Called when the browser window got resized
	this.doResize = function() {
		let size = getSize(this.domId);
		this.chartWidth = size.width;
		this.chartHeight = size.height;

		d3.select("#"+this.domId).select(".chart-viz")
			.attr("viewBox", "0 0 " + this.chartWidth + " " + this.chartHeight);

		if (typeof this.resize === "function") {
			this.resize();
		}
	};

	this.fromCookie = function(cook) {
		if (cook && cook.chartId && (this.id === cook.chartId)) {
			this.channel = cook.channel;
		}
	};

	this.toCookie = function() {
		let cook = {};
		cook.chartId = this.id;
		cook.row = this.startRow;
		cook.column = this.startColumn;
		cook.width = this.gridWidth;
		cook.height = this.gridHeight;
		cook.channel = this.channel;
		return cook;
	};

	this.getSnapshot = function() {
		let idx = searchChannels(this.domId);
		if (idx >= 0) {
			return channels[idx].snapshot;
		}
		return null;
	}

	this.export = function() {
		if (typeof this.buildExport === "function") {
			let snap = this.buildExport();
			let blob = new Blob(snap, {type : 'text/csv'});
			let name = this.id + ".csv";

			// Save snapshot
			if (!isIE && !isEdge) {
				let a = document.createElement('a');
				a.href = window.URL.createObjectURL(blob);
				a.download = name;
				if (document.createEvent) {
					let e = document.createEvent("MouseEvents");
					e.initEvent('click', true, true);
					a.dispatchEvent(e);
				} else {
					a.click();
				}
			} else {
				window.navigator.msSaveBlob(blob, name);
			}
		}
	};
};

// **** Sample chart implementation - channel sniffer ****
let timeFormatLogger = d3.timeFormat("%Y-%m-%d_%H:%M:%S.%L");

ChannelSniffer = function(chartId) {
	Chart.call(this, chartId);
	this.id = "channel-sniffer"; //Chart ID
	this.name = "Channel Sniffer";

	this.render = function(rspn, elapse) {
		console.log(timeFormatLogger(new Date()), "Channel run interval: ", elapse, JSON.stringify(rspn));
	};

	this.buildUi = function(func) {
		func('<div class="chart-title">Channel Sniffer</div><svg class="chart-viz" />');
	};
};
ChannelSniffer.prototype = new Chart();
ChannelSniffer.prototype.constructor = ChannelSniffer;
dashboardPage.addAvailableCharts(new ChannelSniffer());

// **** Sample chart implementation - date time widget ****
let timeFormatSrver = d3.timeParse("%Y-%m-%d %H:%M:%S");
let timeFormatClk12 = d3.timeFormat("%I:%M");
let timeFormatClk13 = d3.timeFormat("%p");
let timeFormatClk24 = d3.timeFormat("%H:%M");
let timeFormatScond = d3.timeFormat("%S");
let timeFormatClndr = d3.timeFormat("%d %b %Y");
let timeFormatWeekn = d3.timeFormat("%A");

DateTimeWidget = function(chartId) {
	Chart.call(this, chartId);
	this.id = "datetime-widget"; //Chart ID
	this.name = "Clock widget";

	// this.source = "Local"; // 'Local' - PC time, 'Server' - Server time, require URL 
	this.format = "12"; // '12' - 12 hour format with am/pm, '24' - 24 hour format from 00 to 23

	this.render = function(rspn, elapse) {
		this.redraw(timeFormatSrver(rspn["time"]));
	};

	this.redraw = function(now) {
		let neti = d3.select("#"+this.domId).select(".chart-indct");
		if (neti.empty()) {
			neti = d3.select("#"+this.domId).append("img").attr("src", dashboardPage.getIconName(IMG_NETWORK)).attr("class", "chart-indct");
		}

		let grph = d3.select("#"+this.domId).select(".chart-viz");
		let bbx1, bbx3;

		if (grph.select(".clock.clockBig").empty()) {
			grph.append("text")
				.attr("class", "clock clockBig").attr("x", 10)
				.attr("text-anchor", "start")
				.style("font-size", "4em");
		}
		grph.select(".clock.clockBig").text((this.format == "12") ? timeFormatClk12(now) : timeFormatClk24(now));

		if (grph.select(".clock.clockSmall").empty()) {
			bbx1 = grph.select(".clock.clockBig").node().getBBox();
			grph.append("text")
				.attr("class", "clock clockSmall").attr("x", bbx1.x + bbx1.width + 5)
				.attr("text-anchor", "start")
				.style("font-size", "1.3em");
		}
		grph.select(".clock.clockSmall").text((this.format == "12") ? timeFormatClk13(now) : timeFormatScond(now));

		if (grph.select(".clock.dayofweek").empty()) {
			grph.append("text")
				.attr("class", "clock dayofweek").attr("x", 20)
				.attr("text-anchor", "start")
				.style("font-size", "1.1em");
		}
		grph.select(".clock.dayofweek").text(timeFormatWeekn(now));

		if (grph.select(".clock.calendar").empty()) {
			bbx3 = grph.select(".clock.dayofweek").node().getBBox();
			grph.append("text")
				.attr("class", "clock calendar").attr("x", 20)
				.attr("text-anchor", "start")
				.style("font-size", "1.1em");
		}
		grph.select(".clock.calendar").text(timeFormatClndr(now));

		if (bbx1 && bbx3) {
			let bbx2 = grph.select(".clock.clockSmall").node().getBBox();
			let xfactor = (this.chartWidth - 20) / (bbx1.width + bbx2.width + 5);
			let yfactor = (this.chartHeight / 2) / bbx1.height * .85;

			grph.select(".clock.clockBig").attr("transform", "scale(" + xfactor + ", " + yfactor + ")").attr("y", bbx1.height);
			grph.select(".clock.clockSmall").attr("transform", "scale(" + xfactor + ", " + yfactor + ")").attr("y", bbx1.height);
			grph.select(".clock.dayofweek").attr("transform", "scale(" + xfactor + ", " + yfactor + ")").attr("y", bbx1.height * 1.5);
			grph.select(".clock.calendar").attr("transform", "scale(" + xfactor + ", " + yfactor + ")").attr("y", bbx1.height * 1.5 + bbx3.height);
		}
	};

	let superFromCookie = this.fromCookie;
	this.fromCookie = function(cook) {
		superFromCookie.call(this, cook);
		if (cook && cook.chartId && (this.id === cook.chartId)) {
			this.format = cook["format"];
		}
	};

	let superToCookie = this.toCookie;
	this.toCookie = function() {
		let cook = superToCookie.call();
		cook["format"] = this.format;
		return cook;
	};

	this.config = function(element) {
		element.html("");

		let trow = element.append("tr");
		trow.append("td").attr("class", "cfgDateTimeWidget").style("text-align", "right")
			.append("input").attr("type", "checkbox").attr("class", "cfgFormat").attr("name", "setting-format");
		trow.append("td").html("Use 24-hour format");

		let obj = this;
		setTimeout(function() {
				let ctrls = d3.selectAll(".cfgDateTimeWidget");
				if (obj.format == "24")
					ctrls.select(".cfgFormat").node().checked = true;
				else
					ctrls.select(".cfgFormat").node().checked = false;
		}, 70);
	};

	this.configed = function(domId, func) {
		if (domId == this.domId) {
			let ctrls = d3.selectAll(".cfgDateTimeWidget");

			if (ctrls.select(".cfgFormat").node().checked) {
				this.format = "24";
			} else {
				this.format = "12";
			}

			func();
		}
	};
};
DateTimeWidget.prototype = new Chart();
DateTimeWidget.prototype.constructor = DateTimeWidget;
dashboardPage.addAvailableCharts(new DateTimeWidget());