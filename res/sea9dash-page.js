const topMargin = 72;
const btmMargin = 18;
const lftMargin = 20;
const rgtMargin = 20;
const cellGap = 5;

const RUN_INTERVAL = 500; //ms

const GRID_PTTN = new RegExp("^(?=.*[\\s]*r([0-9]+))(?=.*[\\s]*c([0-9]+))(?=.*[\\s]*w([0-9]+))(?=.*[\\s]*h([0-9]+)).*$", 'g');

const THEME_CSS   = 'res/sea9dash-theme-xTHEMEx.css';
const IMG_PLAY    = "res/icon_playxTHEMEx.png";
const IMG_PLAY_S  = "res/icon_play1xTHEMEx.png";
const IMG_PAUSE   = "res/icon_pausexTHEMEx.png";
const IMG_PAUSE_S = "res/icon_pause1xTHEMEx.png";
const IMG_CONFIG  = "res/icon_morexTHEMEx.png";
const IMG_SETTING = "res/icon_more1xTHEMEx.png";
const IMG_CHANNEL = "res/icon_channelxTHEMEx.png";
const IMG_CHARTS  = "res/icon_chartxTHEMEx.png";
const IMG_NETWORK = "res/icon_net1xTHEMEx.png";
const IMG_REFRESH = "res/icon_refreshxTHEMEx.png";
const IMG_TOEND   = "res/icon_end1xTHEMEx.png";

function DashboardPage() {
	let availablePosition = [];
	let hasEnoughRoom = function(row, col, wdth, hght) {
		let endc = col + wdth - 1;
		let endr = row + hght - 1;

		if (availablePosition[row-1][col-1] > 0) {
			return 4;
		} else if (endc > maxCol) {
			return 3;
		} else if (endr > maxRow) {
			return 2;
		} else {
			let okay = true;
			for (let i = row-1; i < endr; i ++) {
				for (let j = col-1; j < endc; j ++) {
					if (availablePosition[i][j] > 0) {
						okay = false;
						i = endc;
						break;
					}
				}
			}
			if (!okay) {
				return 1;
			} else {
				return 0;
			}
		}
	};
	let setPositions = function(row, col, wdth, hght, value, updateUi) {
		let ulist = null;
		if (updateUi) {
			ulist = d3.select(".charts");
		}

		for (let c = col; c < (col + wdth); c ++) {
			for (let r = row; r < (row + hght); r ++) {
				if (updateUi) {
					let elem = ulist.selectAll(".phr.r" + r + ".c" + c + ".w1.h1");
					elem.style("display", (value > 0) ? "none" : null);
				}
				availablePosition[r-1][c-1] = (value > 0) ? 1 : ((value < 0) ? -1 : 0);
			}
		}
	};

	let availableCharts = {};
	this.addAvailableCharts = function(obj) {
		availableCharts[obj.id] = obj;
	};

	let configuredCharts = [];
	this.getConfiguredCharts = function(elmId) {
		for (let i = 0; i < configuredCharts.length; i ++) {
			if (elmId == configuredCharts[i].domId) {
				return configuredCharts[i];
			}
		}
		return null;
	};
	this.getConfiguredChartsIndex = function(elmId) {
		for (let i = 0; i < configuredCharts.length; i ++) {
			if (elmId == configuredCharts[i].domId) {
				return i;
			}
		}
		return -1;
	}

	let channels = [];
	this.addChannels = function(name, url, interval) {
		let len = channels.length;
		let cid = 'chnl' + ('00' + (len+1)).slice(-3);
		channels[len] = new Channel(cid, name, url, interval);
		return cid;
	};
	this.getChannels = function(channelId) {
		for (let i = 0; i < channels.length; i ++) {
			if (channelId == channels[i].id) {
				return channels[i];
			}
		}
		return null;
	};
	this.searchChannelsIndex = function(chartId) {
		for (let i = 0; i < channels.length; i ++) {
			for (let j = 0; j < channels[i].subscribedCharts.length; j ++) {
				if (channels[i].subscribedCharts[j] == chartId) {
					return {"c": i, "s": j};
				}
			}
		}
		return null;
	};
	this.subscribeChannel = function(chartId, channelId) {
		let chnnl = this.getChannels(channelId);
		if (!chnnl) {
			console.log("Error, channel " + channelId + " not exists");
			return false; // Channel not exists
		}

		let idx = this.searchChannelsIndex(chartId);
		if (idx) {
			if (channels[idx.c].id === channelId) {
				return true; // Already subscribed
			} else {
				// Need to unsubscribe first...
				channels[idx.c].subscribedCharts.splice(idx.s, 1);
			}
		}

		chnnl.subscribedCharts[chnnl.subscribedCharts.length] = chartId;
		return true;
	};

	let buildCss = function() {
		let buff = '';
		for (let i = 1; i <= maxRow; i ++) {
			buff += '.h' + i + ' { height: calc(((100% - ' + (topMargin + btmMargin) + 'px) / ' + maxRow + ') * ' + i + ' - ' + (cellGap * 2) + 'px); }\n';
			buff += '.r' + i + ' { top: calc(((100% - ' + (topMargin + btmMargin) + 'px) / ' + maxRow + ') * ' + (i - 1) + ' + ' + (cellGap + topMargin) + 'px); }\n';
		}
		for (let i = 1; i <= maxCol; i ++) {
			buff += '.w' + i + ' { width: calc(((100% - ' + (lftMargin + rgtMargin) + 'px) / ' + maxCol + ') * ' + i + ' - ' + (cellGap * 2) + 'px); }\n';
			buff += '.c' + i + ' { left: calc(((100% - ' + (lftMargin + rgtMargin) + 'px) / ' + maxCol + ') * ' + (i - 1) + ' + ' + (cellGap + lftMargin) + 'px); }\n';
		}

		d3.select("head").append("style").html(buff);
		d3.select("head").append("link")
			.attr("type", "text/css")
			.attr("rel", "stylesheet")
			.attr("href", dashboardPage.getThemeFileName(THEME_CSS));
	};

	let buildPage = function() {
		let body = d3.select("body");

		let list = body.select(".charts");
		if (list.empty()) {
			list = body.append("ul").attr("class", "charts");
		}
		list.style("list-style", "none");

		// Controls
		let ctrl = body.append("div").attr("class", "tbl master-cntrl");
		ctrl.append("a").attr("href", "javascript:;").append("img").attr("id", "doc-refresh").attr("src", dashboardPage.getIconName(IMG_REFRESH));
		ctrl.append("span").html("&nbsp;");
		ctrl.append("a").attr("href", "javascript:;").append("img").attr("id", "doc-control").attr("src", dashboardPage.getIconName(IMG_PAUSE));
		ctrl.append("span").html("&nbsp;");
		ctrl.append("a").attr("href", "javascript:;").append("img").attr("id", "doc-channel").attr("src", dashboardPage.getIconName(IMG_CHANNEL));
		ctrl.append("span").html("&nbsp;");
		ctrl.append("a").attr("href", "javascript:;").append("img").attr("id", "doc-charts").attr("src", dashboardPage.getIconName(IMG_CHARTS));

		body.append("div").attr("id", "disable-bg"); // Transparent dark background when dialog boxes displayed

		// Channel dialog
		let tabl = body.append("div").attr("id", "channel-dialog")
			.append("form").attr("id", "channel-form").attr("name", "channel-form")
			.append("table").attr("id", "channel-tbl").attr("class", "dialog");
		tabl.append("th").html("");
		tabl.append("th").html("ID");
		tabl.append("th").html("Channel");
		tabl.append("th").html("Run Interval");
		tabl.append("th").html("URL");
		let trow = tabl.append("tr").attr("id", "channel-insertHere");
		trow.append("td").attr("valign", "top").append("input").attr("type", "checkbox").attr("class", "channel-slct-0").attr("name", "channel-slct-0");
		trow.append("td").attr("valign", "top").append("input").attr("type", "text").attr("class", "channel-id-0 ronly").attr("name", "channel-id-0")
			.attr("readonly", "").attr("tabindex", "-1");
		trow.append("td").attr("valign", "top").append("input").attr("type", "text").attr("class", "channel-name-0").attr("name", "channel-name-0");
		trow.append("td").attr("valign", "top").append("input").attr("type", "text").attr("class", "channel-intv-0").attr("name", "channel-intv-0");
		trow.append("td").append("textarea").attr("class", "channel-url-0").style("width", "300px");
		trow = tabl.append("tr");
		trow.append("td")
		let tcll = trow.append("td").attr("colspan", "3");
		tcll.append("input").attr("type", "button").attr("name", "channel-clear").attr("value", "Remove all channels").style("margin-right", "2px");
		tcll.append("input").attr("type", "button").attr("name", "channel-delete").attr("value", "Delete selected");
		tcll = trow.append("td").style("text-align", "right").style("padding-right", "10px");
		tcll.append("input").attr("type", "button").attr("name", "channel-okay").attr("value", "Apply").style("margin-right", "2px");
		tcll.append("input").attr("type", "button").attr("name", "channel-cancel").attr("value", "Close");

		// Charts dialog
		tabl = body.append("div").attr("id", "charts-dialog")
			.append("form").attr("id", "charts-form").attr("name", "charts-form")
			.append("table").attr("class", "dialog");
		trow = tabl.append("tr");
		trow.append("td").style("text-align", "right").html("Charts:");
		trow.append("td")
			.append("select").attr("id", "charts-list").attr("name", "charts-list")
			.append("option").attr("value", "-").html("-- Select --");
		trow = tabl.append("tr").attr("class", "chnllist");
		trow.append("td").style("text-align", "right").html("Channel:");
		trow.append("td")
			.append("select").attr("id", "charts-channel").attr("name", "charts-channel")
			.append("option").attr("value", "-").html("-- Select --");
		trow = tabl.append("tr");
		trow.append("td").style("text-align", "right").html("Row:");
		trow.append("td").style("padding-left", "15px")
			.append("select").attr("id", "charts-row").attr("name", "charts-row");
		trow = tabl.append("tr");
		trow.append("td").style("text-align", "right").html("Column:");
		trow.append("td").style("padding-left", "15px")
			.append("select").attr("id", "charts-col").attr("name", "charts-col");
		trow = tabl.append("tr");
		trow.append("td").style("text-align", "right").html("Width:");
		trow.append("td").style("padding-left", "15px")
			.append("select").attr("id", "charts-width").attr("name", "charts-width");
		trow = tabl.append("tr");
		trow.append("td").style("text-align", "right").html("Height:");
		trow.append("td").style("padding-left", "15px")
			.append("select").attr("id", "charts-height").attr("name", "charts-height");
		tabl.append("tbody").attr("class", "hrule").style("display", "none")
			.append("tr").append("td").attr("colspan", "2").style("text-align", "center").append("hr");
		tabl.append("tbody").attr("id", "setting-init");
		tabl.append("tbody").attr("class", "hrule").style("display", "none")
			.append("tr").append("td").attr("colspan", "2").style("text-align", "center").append("hr");
		tcll = tabl.append("tr").append("td").attr("colspan", "2").style("text-align", "right");
		tcll.append("input").attr("type", "button").attr("name", "charts-clear").attr("value", "Remove all charts");
		tcll.append("span").html("&nbsp;&nbsp;");
		tcll.append("input").attr("type", "button").attr("name", "charts-okay").attr("value", "Okay").style("margin-right", "2px");
		tcll.append("input").attr("type", "button").attr("name", "charts-cancel").attr("value", "Cancel");

		// Setting dialog
		tabl = body.append("div").attr("id", "setting-dialog")
			.append("form").attr("id", "setting-form").attr("name", "setting-form")
			.append("table").attr("class", "dialog");
		let tbdy = tabl.append("tbody");
		tcll = tbdy.append("tr").append("td").attr("class", "sttttl").attr("colspan", "2").style("text-align", "right");
		tcll.append("span").attr("id", "setting-name");
		tcll.append("span").html("&nbsp;");
		tcll.append("input").attr("type", "button").attr("name", "setting-remove").attr("value","Remove").style("margin-left", "10px");
		tcll = tbdy.append("tr").attr("class", "chnllist").append("td").attr("colspan", "2").style("text-align", "right");
		tcll.append("span").html("Channel:");
		tcll.append("span").html("&nbsp;");
		tcll.append("select").attr("id", "setting-channel").attr("name", "setting-channel")
			.append("option").attr("value", "-").html("-- Select --");
		tabl.append("tbody").attr("id", "setting-custom");
		tcll = tabl.append("tr").append("td").attr("colspan", "2").style("text-align", "right");
		tcll.append("input").attr("type", "button").attr("name", "setting-save").attr("id", "setting-save").attr("value", "Export")
			.style("display", "none");
		tcll.append("span").html("&nbsp;&nbsp;");
		tcll.append("input").attr("type", "button").attr("name", "setting-okay").attr("id", "setting-okay").attr("value", "Okay")
			.style("margin-right", "2px");
		tcll.append("input").attr("type", "button").attr("name", "setting-cancel").attr("value", "Cancel");
		tcll.append("input").attr("type", "hidden").attr("id", "setting-charts").attr("name", "setting-charts");

		// Draw chart grid place holders
		for (let i = 1; i <= maxRow; i ++) {
			for (let j = 1; j <= maxCol; j ++) {
				list.append("li")
					.attr("class", "chart phr r" + i + " c" + j + " w1 h1")
					.attr("ondragover", "allowDrop(event)")
					.attr("ondrop", "drop(event)");
			}
		}
	};

	let buildDialog = function() {
		// Add available charts to the charts drop-down list
		let l1st = d3.select("#charts-list");
		for (let key in availableCharts) {
			if (availableCharts[key].id && availableCharts[key].name) {
				l1st.append("option").attr("value", availableCharts[key].id).html(availableCharts[key].name);
			}
		}

		// Add options of no. of rows to drop down boxes.
		l1st = d3.select("#charts-row");
		let l2st = d3.select("#charts-height");
		for (let i = 1; i <= maxRow; i ++) {
			l1st.append("option").attr("value", i).html(i);
			l2st.append("option").attr("value", i).html(i);
		}

		// Add options of no. of column to drop down boxes.
		l1st = d3.select("#charts-col");
		l2st = d3.select("#charts-width");
		for (let i = 1; i <= maxCol; i ++) {
			l1st.append("option").attr("value", i).html(i);
			l2st.append("option").attr("value", i).html(i);
		}
	};

	// Get the grid information (row & column of the upper left corner of a chart, plus number of rows and columns it occupy) of 
	// the given chart DOM object.
	function getGrid(element) {
		GRID_PTTN.lastIndex = 0;
		let matches = GRID_PTTN.exec(element.className);

		if (matches) {
			let r = parseInt(matches[1]);
			let c = parseInt(matches[2]);
			let w = parseInt(matches[3]);
			let h = parseInt(matches[4]);

			if ((r > 0) && (r <= maxRow) && (c > 0) && (c <= maxCol) && (w > 0) && (w <= maxCol) && (h > 0) && (h <= maxRow)) {
				let rtn = {};
				rtn.row = r;
				rtn.column = c;
				rtn.width = w;
				rtn.height = h;
				return rtn;
			}
		}

		return null;
	};

	let maxRow = 2;
	let maxCol = 2;
	let theme = {"file": "light", "icon": "w"};
	this.getThemeFileName = function(name) {
		return name.replace('xTHEMEx', theme.file);
	};
	this.getIconName = function(name) {
		return name.replace('xTHEMEx', theme.icon);
	};

	let mainThreadId = null;
	this.start = function(row, col, thm) {
		maxRow = row;
		maxCol = col;
		switch (thm.toLowerCase()) {
			case 'dark':
			case 'd':
			case 'black':
			case 'b':
				theme.file = 'dark';
				theme.icon = 'w';
				break;
			case 'light':
			case 'l':
			case 'white':
			case 'w':
				theme.file = 'light';
				theme.icon = 'b';
		}

		buildCss();
		buildPage();
		buildDialog();

		// Initialize the 2-d array marking available space on the grid
		availablePosition = new Array(row);
		for (let i = 0; i < row; i ++) {
			availablePosition[i] = new Array(col);
			for (let j = 0; j < col; j ++) {
				availablePosition[i][j] = 0;
			}
		}

		let _this = this;
		let cfgobj = configCharts();
		for (let idx = 0; idx < cfgobj.length; idx ++) {
			if (cfgobj[idx].chartId) {
				setTimeout(function(obj) {
						_this.showChart(obj);
				}, 100 * (idx + 1), cfgobj[idx]);
			}
		}

		mainThreadId = setInterval(function() {
			for (let j = 0; j < channels.length; j ++) {
				if (channels[j] && (typeof channels[j].run === "function")) {
					setTimeout(function() {
						channels[j].run(RUN_INTERVAL, _this);
					}, 100 * (j + 1));
				}
			}
		}, RUN_INTERVAL);
	};

	this.stop = function stop() {
		clearInterval(mainThreadId);
		mainThreadId = null;
	};

	this.showChart = function(cfgobj) {
		let domId = cfgobj.chartId + cfgobj.row + cfgobj.column;
		if (!this.getConfiguredCharts(domId)) {
			switch (hasEnoughRoom(cfgobj.row, cfgobj.column, cfgobj.width, cfgobj.height)) {
			case 4:
				alert("Position " + cfgobj.row + ", " + cfgobj.column + " already occupied.");
				break;
			case 3:
				alert("Chart '" + availableCharts[cfgobj.chartId].name + "' is too wide for the available space.");
				break;
			case 2:
				alert("Chart '" + availableCharts[cfgobj.chartId].name + "' is too tall for the available space.");
				break;
			case 1:
				alert("There is not enough room to fit the chart '" + availableCharts[cfgobj.chartId].name + "'");
				break;
			case 0:
				if (availableCharts[cfgobj.chartId]) {
					let chrt = new availableCharts[cfgobj.chartId].constructor(domId);
					chrt.init(cfgobj);

					let cntr = d3.select(".charts")
						.append("li")
							.attr("id", domId).attr("class", "chart tbl r" + cfgobj.row + " c" + cfgobj.column + " w" + cfgobj.width + " h" + cfgobj.height)
							.attr("ondragstart", "drag(event)").attr("ondragend", "dragEnded(event)").attr("draggable", "true");
					cntr.append("a").attr("class", "chart-cntrl").attr("href", "javascript:;").append("img").attr("src", this.getIconName(IMG_SETTING));
					cntr.append("div").attr("class", "chart-ctnt " + cfgobj.chartId).attr("id", domId + "Container");
				
					if (typeof chrt.buildUi === "function") {
						chrt.buildUi(function(data) {
								cntr.select(".chart-ctnt").html(data);

								setPositions(cfgobj.row, cfgobj.column, cfgobj.width, cfgobj.height, 1 , true);

								if (typeof chrt.fromCookie === "function") {
									chrt.fromCookie(cfgobj);
								}

								if (typeof chrt.init === "function") {
									chrt.doInit();
								}

								configuredCharts[configuredCharts.length] = chrt;
								addToCookie(chrt);
						});
					} else {
						setPositions(cfgobj.row, cfgobj.column, cfgobj.width, cfgobj.height, 1, true);

						if (typeof chrt.fromCookie === "function") {
							chrt.fromCookie(cfgobj);
						}

						if (typeof chrt.init === "function") {
							chrt.doInit();
						}

						configuredCharts[configuredCharts.length] = chrt;
						addToCookie(chrt);
					}
					this.subscribeChannel(domId, cfgobj.channel);
					return domId;
				} else {
					alert("Chart " + cfgobj.chartId + " not found");
				}
				break;
			}
		} else {
			alert("Chart " + domId + " already exists");
		}
		return null;
	};

	this.removeChart = function(rid) {
		let chart = d3.select("#"+rid);
		if (chart) {
			let grid = getGrid(chart.node());
			if (grid) {
				let idx = this.getConfiguredChartsIndex(rid);
				if (idx >= 0) {
					removeFromCookie(configuredCharts[idx]);
					configuredCharts.splice(idx, 1);
				}
				chart.remove();
				setPositions(grid.row, grid.column, grid.width, grid.height, 0, true);
			}
		}
	}
};
var dashboardPage = new DashboardPage();