
import cors from "cors";
import path from "path";
import http from "http";
import https from "https";
import fs from "fs";
import express from "express";
import sanitize from "sanitize-filename";

const GITHUB_URL_PREFIX =
	  "https://raw.githubusercontent.com/seanno/shc-demo-data/main/cards/";

// +----------------+
// | handleManifest |
// +----------------+

const handleManifest = (req, res) => {

  console.log("handleManifest");
  
  if (req.query.passcode && req.query.passcode !== req.body.passcode) {
	res.status(401).end();
	return;
  }

  const payloadPath = cardFile(req.query.card, 'shl.json');
  if (!payloadPath) { res.status(500).end(); return; }
  
  const payloadJson = JSON.parse(fs.readFileSync(payloadPath));

  const manifestJson = {
	"files": [
	  {
		"contentType": "application/smart-health-card",
		"location": payloadJson.url
	  }
	]
  };

  res.json(manifestJson);
}

// +---------------------+
// | handleMultiManifest |
// +---------------------+

const handleMultiManifest = (req, res) => {

  console.log("handleMultiManifest");
  
  if (req.query.passcode && req.query.passcode !== req.body.passcode) {
	res.status(401).end();
	return;
  }

  const manifestJson = {
	"files": [
	  {
		"contentType": "application/smart-health-card",
		"location": GITHUB_URL_PREFIX + "carin-revocable/jws.txt"
	  },
	  {
		"contentType": "application/smart-health-card",
		"location": GITHUB_URL_PREFIX + "carin-revoked/jws.txt"
	  },
	  {
		"contentType": "application/fhir+json",
		"location": GITHUB_URL_PREFIX + "multi-shl/ips1.enc"
	  }
	]
  };

  res.json(manifestJson);
}

// +---------+
// | Helpers |
// +---------+

const cardFile = (card, file) => {

  if (!card) return(false);
  
  const shcPath = '..' + path.sep + 'cards' + path.sep + sanitize(card) + path.sep + file;
  if (!fs.existsSync(shcPath)) return(false);

  return(shcPath);
}

// +------------+
// | Entrypoint |
// +------------+

const app = express();

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json());
app.use(cors());

app.post("/manifest", handleManifest);
app.post("/multiManifest", handleMultiManifest);

const port = process.env.PORT || 3001;

if (process.env.HTTPS) {

  app.get("/trustme", (req, res) => { res.send("yay"); });
  
  const options = {
	"key": fs.readFileSync('key.pem'),
	"cert": fs.readFileSync('cert.pem')
  };

  https.createServer(options, app)
	.listen(port, console.log(`running https on port ${port}`));
}
else {

  http.createServer(app)
	.listen(port, console.log(`running http on port ${port}`));
}







