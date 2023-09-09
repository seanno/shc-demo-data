
const json5 = require('json5');
const fs = require('fs');
const path = require('path');
const jose = require('node-jose');
const qrcode = require('qrcode');

// we don't care about the security of demo data
const SHL_KEY_B64 = 'rxTgYlOaKJPFtcEd0qcceN8wEU4p94SqAwIWQe6uX7Q';

const SHL_URL_PREFIX =
	  'https://raw.githubusercontent.com/seanno/shc-demo-data/main/ips/';

const SHL_VIEWER_PREFIX =
	  'https://viewer.tcpdev.org/shlink.html#';

// load up the JSON and encrypt it

const bundlePath = process.argv[2];
const fileName = path.parse(bundlePath).name;
const bundleArray = new TextEncoder().encode(fs.readFileSync(bundlePath));

// first encrypt the bundle
const key = {
  kty: "oct",
  k: SHL_KEY_B64,
  alg: "A256GCM",
  enc: "A256GCM"
};
  
jose.JWE.createEncrypt({ format: 'compact' }, key)
  .update(bundleArray)
  .final()
  .then((encrypted) => {

	fs.writeFileSync(fileName + "-enc.txt", encrypted);
	
	// and the shl
	const shlJson = {
	  "url": SHL_URL_PREFIX + fileName + '-enc.txt',
	  "flag": "LU",
	  "key": SHL_KEY_B64,
	  "label": 'Demo SHL for ' + fileName
	};

	const shlBare = 'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));
	const shlFinal = SHL_VIEWER_PREFIX + shlBare;

	fs.writeFileSync(fileName + '-shl.txt', shlFinal);

	qrcode.toFile(fileName + '-shl.png', shlFinal, {
	  width: 600,
	  errorCorrectionLevel: 'L'
	});

  });







