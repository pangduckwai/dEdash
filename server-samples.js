let trxThread;

module.exports = () => {
	trxThread = new sampleTrxThread();
	if (!trxThread.init()) {
		trxThread = null;
	}

	return {
		start: () => {
			trxThread.start();
		},
		stop: () => {
			trxThread.stop();
		},
		read: () => {
			return trxThread.read();
		}
	};
};

let sampleTrxThread = function() {
	const DATA_INTERVAL = 5000; //milliseconds
	const DATA_CUTOFF = 5; //minutes
	const DATA_POINTS = 100;
	const VALUE_INITIAL = 100;
	const VALUE_VARIANCE = 30;

	this.init = () => {
		console.log(new Date(), "Initializing Sample Transaction threads...", DATA_POINTS, DATA_CUTOFF, DATA_INTERVAL, VALUE_INITIAL, VALUE_VARIANCE);
		return true;
	};

	let threadId;
	this.start = () => {
		console.log(new Date(), "Starting Sample Transaction threads...");
		let _this = this;
		this.run();
		threadId = setInterval(() => {
			_this.run();
		}, DATA_INTERVAL);
	};

	this.stop = () => {
		console.log(new Date(), "Stoping Sample Transaction threads...");
		clearInterval(threadId);
		threadId = null;
	};

	let data;
	this.read = () => {
		return data; // NOTE
	};

	this.run = () => {
		let now = new Date();
		let scn = now.getSeconds();
		now.setSeconds(scn - (scn % (DATA_INTERVAL/1000)));

		function nextDataPoint(tstamp, value) {
			let nxt = value + (Math.floor(Math.random() * VALUE_VARIANCE) - (VALUE_VARIANCE/2));
			data.push({
				time: new Date(tstamp),
				count: nxt,
				amount: nxt * (Math.floor(Math.random()*30) + 70)
			});
			if (data.length > DATA_POINTS) data.shift();
			return nxt;
		};

		// Lazy init
		if (!data) {
			console.log(now, "Sample Transaction thread running...");//TODO TEMP
			data = [];
			let accum = VALUE_INITIAL;
			let stime = now.getTime();
			let htime = stime - DATA_POINTS * DATA_INTERVAL;
			while (htime < stime) {
				accum = nextDataPoint(htime, accum);
				htime += DATA_INTERVAL;
			}
		}

		nextDataPoint(now.getTime(), data[data.length-1].count);
	};
};