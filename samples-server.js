const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');

const xsite = require('./server/server-xsite'); // TODO - for DEV only

const CONTENT_TYPE_KEY = 'Content-type';
const SERVER_PORT = 8080;
const MIME_MAP = {
	'.ico' : { mime: 'image/x-icon' },
	'.html': { mime: 'text/html',        encoding: 'utf8' },
	'.js'  : { mime: 'text/javascript',  encoding: 'utf8' },
	'.json': { mime: 'application/json', encoding: 'utf8' },
	'.css' : { mime: 'text/css',         encoding: 'utf8' },
	'.png' : { mime: 'image/png' },
	'.jpg' : { mime: 'image/jpeg' },
	'.svg' : { mime: 'image/svg+xml',    encoding: 'utf8' },
	'.pdf' : { mime: 'application/pdf' },
	'.txt' : { mime: 'text/plain',       encoding: 'utf8' },
	'.log' : { mime: 'text/plain',       encoding: 'utf8' }
};

let responseNormal = (response, body, type) => {
	response.setHeader(CONTENT_TYPE_KEY, (!type) ? 'text/plain' : type);
	response.end(body);
};

let responseError = (response, message, status) => {
	console.log(status, message);
	response.statusCode = status;
	response.setHeader(CONTENT_TYPE_KEY, 'text/plain');
	response.end(message);
};

let responseRedirect = (response, redirectTo) => {
	response.writeHead(302, { 'Location': (redirectTo) ? redirectTo : '/index.html' });
	response.end();
};

let serveFile = (pathname, succ, fail) => {
	let map = MIME_MAP[path.parse(pathname).ext || 'x'];
	let ctyp = (map) ? (map.mime || 'text/plain') : 'text/plain';
	let encd = (map) ? (map.encoding || null) : null;

	fs.readFile(path.join('.', pathname), encd, (error, data) => {
		if (error) {
			if (error.code === 'ENOENT') {
				fail(302, '');
			} else {
				throw error;
			}
		} else {
			succ(200, data, ctyp);
		}
	});
};

// *** For the endpoint '/sample'
const names =
{"alan":0, "alex":0, "andy":0, "bill":0, "carl":0, "cole":0, "dave":0, "dale":0, "dick":0, "eric":0, "gary":0, "gene":0, "greg":0,
"jack":0, "john":0, "josh":0, "kyle":0, "mark":0, "mike":0, "nick":0, "paul":0, "pete":0, "phil":0, "saul":0, "will":0, "zach":0};
const reals = ["alan","andy","eric","jack","paul"];
let rtsts = [];
let times = [];
let depth = 2;
// ***

http.createServer((req, res) => {
	if (xsite.enable(req, res)) { return; } // TODO - for DEV only, this allows cross site access

	req.on('error', err => responseError(res, err, 500));
	res.on('error', err => responseError(res, err, 500));

	let buff = '';
	req.on('data', (chunk) => {
		buff += chunk;
		if (buff.length > 1e6) req.connection.destroy(); // data larger than 1M
	}).on('end', () => {
		if (req.method == 'OPTIONS') {// TODO - for DEV only, this allows cross site access
			responseNormal(res, '', 'text/plain');
			return;
		}

		if (req.method !== 'GET') {
			responseError(res, "Unsupported method '" + req.method + "'", 500);
			return;
		}

		let request = url.parse(req.url, true);
		if (!request.pathname || !request.query) {
			responseError(res, "Invalid request", 500);
			return;
		}

		let now = new Date();
		switch(request.pathname) {
		case '/':
			responseRedirect(res);
			break;

		case '/time':
			res.setHeader('Content-type', 'application/json');
			res.end('{"time":"' + 
				now.getFullYear() + '-' + ('0'+(now.getMonth() + 1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2) + ' ' +
				('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2) +
			'"}');
			break;

		case '/sample':
			if (times.length < 1) {
				let mill = now.getTime() - 60000; // The previous minute
				for (let i = 0; i < 20; i ++) {
				times[i] = { "time": Math.round(mill/3000)*3, "count": 0 }; //Math.floor(Math.random()*80 + 20) };
					mill += 3000;
				}
			}

			let latst = [];
			let chance;
			for (let key in names) {
				chance = 5;
				for (let i = 0; i < reals.length; i ++) {
					if (key == reals[i]) {
						chance = Math.floor(Math.random()*5) + 6;
						break;
					}
				}
				if (Math.random() < (chance/100)) {
					names[key] ++;
					latst.push(key);
				}
			}
			rtsts.push({"time": Math.round(now.getTime()/1000), "value": latst.length});
			if (rtsts.length > 30) rtsts.shift();

			depth += latst.length;
			var hash = crypto.createHash('sha256').update(depth.toString()).digest('base64');

			var curr = Math.round(now.getTime()/3000)*3;
			if (curr > times[times.length-1].time) {
				times.push({"time": curr, "count": latst.length});
				if (times.length > 20) times.shift();
			} else {
				times[times.length-1].count += latst.length;
			}

			var rate;
			if (rtsts.length > 1) {
				var elpse = rtsts[rtsts.length-1].time - rtsts[0].time;
				var total = 0, lgth = rtsts.length;
				for (var i = 1; i < lgth; i ++) {
					total += rtsts[i].value;
				}
				rate = '{"avg":' + (total/elpse) + '}';
			} else {
				rate = '{"avg":0}';
			}

			res.setHeader('Content-type', 'application/json');
			res.end(
				'{"records": ' + JSON.stringify(latst) + ',' +
				' "blocks": { "height" : ' + depth + ', "currentBlockHash" : "' + hash + '"},' +
				' "rate": ' + rate + ',' +
				' "names": ' + JSON.stringify(names) + ',' +
				' "times": ' + JSON.stringify(times) + '}');
			break;

		default:
			serveFile(request.pathname,
				(sts, ctn, typ) => responseNormal(res, ctn, typ),
				(sts, msg) => {
					if (sts === 302) {
						responseRedirect(res);
					} else {
						responseError(res, msg, sts);
					}
				}
			);
			break;
		}
	});
}).listen(SERVER_PORT);
