const sample = require('./server-samples');

let samples = sample();

exports.dispatch = (request, response, action, succ, fail) => {
	switch (action) {
	case 'sample-data/start':
		samples.start();
		succ("Sample Data thread started", 'text/plain');
		break;

	case 'sample-data/stop':
		samples.stop();
		succ("Sample Data thread stopped", 'text/plain');
		break;

	case 'sample-data/read':
		succ(JSON.stringify(samples.read()), 'application/json');
		break;

	default:
		fail(500, "Unknown dispatch target " + action);
	}
};