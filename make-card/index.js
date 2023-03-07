
const json5 = require('json5');
const fs = require('fs');
const zlib = require('zlib');
const jose = require('node-jose');
const qrcode = require('qrcode');

const KEYSTORE_PATH = '../keystore/keystore.json';
const MAX_SHC_LENGTH = 1195;

// we don't care about the security of demo data
const SHL_KEY = 'rxTgYlOaKJPFtcEd0qcceN8wEU4p94SqAwIWQe6uX7Q';

const SHL_URL_PREFIX =
	  'https://raw.githubusercontent.com/seanno/shc-demo-data/main/cards/';

// Load up the JSON

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

const compressedCard = zlib.deflateRawSync(JSON.stringify(healthCardJson));

// Sign the card

jose.JWK.asKeyStore(json5.parse(fs.readFileSync(KEYSTORE_PATH)))
  .then((keystore) => {

	const signingKey = keystore.all()[0];
	const fields = { zip: 'DEF' };
	
	jose.JWS.createSign({ format: 'compact', fields }, signingKey)
	  .update(Buffer.from(compressedCard))
	  .final()
	  .then((jws) => {
		generateStuff(jws);
	  });

  });

function generateStuff(jws) {
  console.log(`jws length: ${jws.length}`);
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
	width: 400,
	errorCorrectionLevel: 'L'
  });
}

// Generate SHL
function generateSHL(jws) {

  const cardJson = { "verifiableCredential": [ jws ] };
  const cardArr = new TextEncoder().encode(cardJson);

  // first encrypt the card
  jose.JWE.createEncrypt({ format: 'compact' }, { kty: 'oct', k: SHL_KEY })
	.update(cardArr)
	.final()
	.then((encrypted) => {

	  // then write the manifest
	  const manifestJson = { files: [ {
		"contentType": "application/smart-health-card",
		"embedded": encrypted
	  } ] };

	  console.log('writing shl manifest to ' + cardDir + 'manifest.json');
	  fs.writeFileSync(cardDir + 'manifest.json',
					   JSON.stringify(manifestJson, null, 2));

	  // and the shl
	  const shlJson = {
		"url": SHL_URL_PREFIX + cardName + '/manifest.json',
		"flag": "L",
		"key": SHL_KEY,
		"label": 'Demo SHL for ' + cardName
	  };

	  const shl = 'shlink:/' + jose.util.base64url.encode(JSON.stringify(shlJson));

	  console.log('writing shl to ' + cardDir + 'shl.txt');
	  fs.writeFileSync(cardDir + 'shl.txt', shl);

	  // and the shl qr code
	  console.log('writing shl qr to ' + cardDir + 'shl.png');
	  
	  qrcode.toFile(cardDir + 'shl.png', shl, {
		width: 400,
		errorCorrectionLevel: 'L'
	  });
	});
}






