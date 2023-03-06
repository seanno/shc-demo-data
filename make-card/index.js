
const json5 = require('json5');
const fs = require('fs');
const zlib = require('zlib');
const jose = require('node-jose');
const qrcode = require('qrcode');

const KEYSTORE_PATH = '../keystore/keystore.json';
const MAX_SHC_LENGTH = 1195;

// Load up the JSON

const healthCardJson = {
  "iss": "https://shcdemo.z5.web.core.windows.net",
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
		"entry": json5.parse(fs.readFileSync(process.argv[2]))
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
  generateSHC(jws);
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
  
  console.log('shc:/' + numericJWS);
}



