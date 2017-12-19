const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const queryString = require('querystring');

const xsite = require('./server-xsite'); // TODO - for DEV only
const dispatcher = require('./server-dsptch');

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

		if ((req.method !== 'GET') && (req.method !== 'POST') && (req.method !== 'PUT')) {
			responseError(res, "Unsupported method '" + req.method + "'", 500);
			return;
		}

		let reqUrl = url.parse(req.url, true);
		let reqPath = reqUrl.pathname;
		let reqQuery = reqUrl.query;

		let reqHeader = req.headers[CONTENT_TYPE_KEY.toLocaleLowerCase()];
		let formData, jsonObjt;
		if ((buff.trim().length > 0) && (reqHeader)) {
			if (reqHeader.includes('application/x-www-form-urlencoded')) {
				formData = queryString.parse(buff);
			} else if (reqHeader.includes(MIME_MAP['.json'].mime)) {
				jsonObjt = JSON.parse(buff);
			}
		}
		
		switch(reqUrl.pathname) {
		case '/':
			responseRedirect(res);
			break;

		case '/time':
			let now = new Date();
			res.setHeader(CONTENT_TYPE_KEY, MIME_MAP['.json'].mime);
			res.end('{"time":"' + 
				now.getFullYear() + '-' + ('0'+(now.getMonth() + 1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2) + ' ' +
				('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2) +
			'"}');
			break;

		case '/snoop':
			let results = ['Snoop\n'];
			if (reqQuery && (Object.keys(reqQuery).length > 0)) {
				results.push('\nQuery param:\n');
				for (let key in reqQuery) {
					results.push("'" + key + "' = '" + reqQuery[key] + '\n');
				}
			}
			if (formData) {
				if (results.length > 0) results.push('\n');
				results.push('Form data:\n');
				for (let key in formData) {
					results.push("'" + key + "' = '" + formData[key] + '\n');
				}
			}
			if (jsonObjt) {
				if (results.length > 0) results.push('\n');
				results.push('Input object:\n');
				results.push(JSON.stringify(jsonObjt));
			}

			let result = '';
			for (let i = 0; i < results.length; i ++) {
				result += results[i];
			}
			responseNormal(res, result, 'text/plain');
			break;

		default:
			const REGEX_ALLOW = /[/](favicon.ico)|(icon_[0-9a-zA-Z_-]+[b|w][.]png)$/g;
			let mth = REGEX_ALLOW.exec(reqUrl.pathname);
			if (mth != null) {
				serveFile(reqUrl.pathname,
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

			const REGEX_PATH = /[/]([0-9a-zA-Z_-]+)[/]([0-9a-zA-Z_/-]+)([.][0-9a-zA-Z_-]+)?[/]?$/g;
			mth = REGEX_PATH.exec(reqUrl.pathname); // Try to interpret the URL
			if (mth == null) {
				responseError(res, "Not found " + reqUrl.pathname, 404);
			} else {
				switch (mth[1]) {
				case 'ws':
					dispatcher.dispatch(req, res, mth[2],
						(ctn, typ) => responseNormal(res, ctn, typ),
						(sts, msg) => responseError(res, msg, sts)
					);
					break;
				default:
					if (mth[1] === mth[3].substring(1)) {
						serveFile('/' + mth[2] + mth[3],
							(sts, ctn, typ) => responseNormal(res, ctn, typ),
							(sts, msg) => {
								if (sts === 302) {
									responseRedirect(res);
								} else {
									responseError(res, msg, sts);
								}
							}
						);
					} else {
						responseError(res, "Not found " + reqUrl.pathname, 404);
					}
					break;
				}
			}
			break;
		}
	});
}).listen(SERVER_PORT);