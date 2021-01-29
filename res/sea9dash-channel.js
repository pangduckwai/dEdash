function Channel(id, name, url, interval) {
	this.id = id;
	this.name = name;

	this.url = url;
	this.runInterval = interval;

	this.subscribedCharts = [];

	this.snapshot;

	let countDown = this.runInterval;
	this.shouldRun = function(elapse) {
		countDown -= elapse;
		if (countDown <= 0) {
			countDown = this.runInterval;
			return true;
		} else {
			return false;
		}
	};

	let _this = this;
	this.run = function(elapse, page) {
		if (!this.shouldRun(elapse)) {
			return;
		}

		accessData(this.url, function(rspn) {
				if (!rspn) {
					return;
				}

				let chrt;
				for (let i = 0; i < _this.subscribedCharts.length; i ++) {
					chrt = page.getConfiguredCharts(_this.subscribedCharts[i]);
					if (chrt) {
						if (typeof chrt.buildExport === "function") _this.snapshot = rspn;
						if (typeof chrt.render === "function") chrt.render(rspn, _this.runInterval);
					}
				}
		});
	};
};
