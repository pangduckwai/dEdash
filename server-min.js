const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');

const xsite = require('./xsite-dev'); // TODO - for DEV only

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

http.createServer((req, res) => {
	if (xsite.enable(req, res)) { return; } // TODO - for DEV only

	req.on('error', err => responseError(res, err, 500));
	res.on('error', err => responseError(res, err, 500));

	let buff = '';
	req.on('data', (chunk) => {
		buff += chunk;
		if (buff.length > 1e6) req.connection.destroy(); // data larger than 1M
	}).on('end', () => {
		if (req.method == 'OPTIONS') {// TODO: Allow cross site for DEV
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

		switch(request.pathname) {
		case '/':
			responseRedirect(res);
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