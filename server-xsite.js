// *** Allow cross site access for DEV ***
// Usage:
//	http.createServer((req, res) => {
//		if (xsite.enable(req, res)) {
//			return;
//		}
//		...

exports.enable = (request, response) => {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

	if (request.method == 'OPTIONS') {
		response.setHeader('Content-type', 'text/plain');
		response.end('');
		return true; // Should stop execution
	} else {
		return false;
	}
}