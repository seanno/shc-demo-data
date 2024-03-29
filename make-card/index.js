
const json5 = require('json5');
const fs = require('fs');
const zlib = require('zlib');
const jose = require('node-jose');
const qrcode = require('qrcode');

const KEYSTORE_PATH = '../keystore/keystore.json';
const MAX_SHC_LENGTH = 1195;

// we don't care about the security of demo data
const SHL_KEY_B64 = 'rxTgYlOaKJPFtcEd0qcceN8wEU4p94SqAwIWQe6uX7Q';

const SHL_URL_PREFIX =
	  'https://raw.githubusercontent.com/seanno/shc-demo-data/main/cards/';

const SHL_VIEWER_PREFIX =
	  'https://viewer.tcpdev.org/shlink.html#';

const RID_FILENAME = "rid.txt";

// see ../shl-host
const SHL_HOSTED_URL_PREFIX = 'https://localhost:3001/manifest?card='; 
const SHL_HOSTED_URL_PASSCODE_SUFFIX = '&passcode=passcode';

// load up the JSON

const cardName = process.argv[2];
const cardDir = '../cards/' + cardName + '/';
console.log('Generating card stuff in ' + cardDir);

const healthCardJson = {
  "iss": "https://raw.githubusercontent.com/seanno/shc-demo-data/main",
  "nbf": Date.now() / 1000,
  "vc": {
	"type": [
	  "https://smarthealth.cards#health-card"
	],
	"credentialSubject": {
	  "fhirVersion": "4.0.1",
	  "fhirBundle": {
		"resourceType": "Bundle",
		"type": "collection",
		"entry": json5.parse(fs.readFileSync(cardDir + 'fhir.json'))
	  }
	}
  }
};

// revocability

let ikey = 0;

if (fs.existsSync(cardDir + RID_FILENAME)) {
  healthCardJson.vc.rid =
	fs.readFileSync(cardDir + RID_FILENAME).toString().trim();
  
  ikey = 1;
  console.log(`Creating revocable card; rid = ${healthCardJson.vc.rid}`);
}
else {
  console.log('Creating unrevocable card');
}

// compress and sign the card

const compressedCard = zlib.deflateRawSync(JSON.stringify(healthCardJson));

jose.JWK.asKeyStore(json5.parse(fs.readFileSync(KEYSTORE_PATH)))
  .then((keystore) => {

	const signingKey = keystore.all()[ikey];
	const fields = { zip: 'DEF' };
	
	jose.JWS.createSign({ format: 'compact', fields }, signingKey)
	  .update(Buffer.from(compressedCard))
	  .final()
	  .then((jws) => {
		generateStuff(jws);
	  });

  });

function generateStuff(jws) {

  console.log(`writing unencrypted jws to jws-raw.txt (length: ${jws.length})`);
  fs.writeFileSync(cardDir + 'jws-raw.txt', jws);
  
  generateSHC(jws);
  generateSHL(jws);
}

// Generate SHC
function generateSHC(jws) {

  if (jws.length > MAX_SHC_LENGTH) {
	console.warn(`Data too long for single SHC (${jws.length})`);
	return;
  }
  
  const numericJWS = jws.split('')
        .map((c) => c.charCodeAt(0) - 45)
        .flatMap((c) => [Math.floor(c / 10), c % 10]) // Need to maintain leading zeros
        .join('');

  // shc.txt
  console.log('writing shc uri to ' + cardDir + 'shc.txt');
  const uri = 'shc:/' + numericJWS;
  fs.writeFileSync(cardDir + 'shc.txt', uri);

  // shc.png
  console.log('writing shc qr to ' + cardDir + 'shc.png');
  
  const segments = [
	{ data: 'shc:/', mode: 'byte' },
	{ data: numericJWS, mode: 'numeric' }
  ];
  
  qrcode.toFile(cardDir + 'shc.png', segments, {
	width: 600,
	errorCorrectionLevel: 'L'
  });
}

// Generate SHL
function generateSHL(jws) {

  const cardJson = { "verifiableCredential": [ jws ] };
  const cardArr = new TextEncoder().encode(JSON.stringify(cardJson));

  // first encrypt the card
  const key = {
	kty: "oct",
	k: SHL_KEY_B64,
	alg: "A256GCM",
	enc: "A256GCM"
  };
  
  jose.JWE.createEncrypt({ format: 'compact' }, key)
	.update(cardArr)
	.final()
	.then((encrypted) => {

	  // then write the content
	  console.log('writing shl content to ' + cardDir + 'jws.txt');
	  fs.writeFileSync(cardDir + 'jws.txt', encrypted);

	  // and the shl
	  const shlJson = {
		"url": SHL_URL_PREFIX + cardName + '/jws.txt',
		"flag": "LU",
		"key": SHL_KEY_B64,
		"label": 'Demo SHL for ' + cardName
	  };

	  console.log('writing shl JSON to ' + cardDir + 'shl.json');
	  fs.writeFileSync(cardDir + 'shl.json', JSON.stringify(shlJson, null, 2));

	  const shlBare = 'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));
	  const shlFinal = SHL_VIEWER_PREFIX + shlBare;

	  console.log('writing shl to ' + cardDir + 'shl.txt');
	  fs.writeFileSync(cardDir + 'shl.txt', shlFinal);

	  // and the shl qr code
	  console.log('writing shl qr to ' + cardDir + 'shl.png');
	  
	  qrcode.toFile(cardDir + 'shl.png', shlFinal, {
		width: 600,
		errorCorrectionLevel: 'L'
	  });

	  // an expired version
	  shlJson.exp = 1;
	  
	  const shlExpired = SHL_VIEWER_PREFIX +
			'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));

	  console.log('writing expired shl to ' + cardDir + 'shl-expired.txt');
	  fs.writeFileSync(cardDir + 'shl-expired.txt', shlExpired);

	  console.log('writing expired shl qr to ' + cardDir + 'shl-expired.png');
	  qrcode.toFile(cardDir + 'shl-expired.png', shlExpired,
					{ width: 600, errorCorrectionLevel: 'L' });

	  delete shlJson["exp"];
	  
	  // and the same for hosted versions (see ../shl-host)
	  shlJson.url = SHL_HOSTED_URL_PREFIX + cardName;
	  shlJson.flag = 'L';

	  const shlHosted = SHL_VIEWER_PREFIX +
			'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));

	  console.log('writing hosted shl to ' + cardDir + 'shl-hosted.txt');
	  fs.writeFileSync(cardDir + 'shl-hosted.txt', shlHosted);

	  console.log('writing hosted shl qr to ' + cardDir + 'shl-hosted.png');
	  qrcode.toFile(cardDir + 'shl-hosted.png', shlHosted,
					{ width: 600, errorCorrectionLevel: 'L' });

	  shlJson.url += SHL_HOSTED_URL_PASSCODE_SUFFIX;
	  shlJson.flag += "P";

	  const shlHostedPass = SHL_VIEWER_PREFIX +
			'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));

	  console.log('writing hosted passcode shl to ' + cardDir + 'shl-hosted-pass.txt');
	  fs.writeFileSync(cardDir + 'shl-hosted-pass.txt', shlHostedPass);
		
	  console.log('writing hosted shl pass qr to ' + cardDir + 'shl-hosted-pass.png');
	  qrcode.toFile(cardDir + 'shl-hosted-pass.png', shlHostedPass,
					{ width: 600, errorCorrectionLevel: 'L' });
	});
}






