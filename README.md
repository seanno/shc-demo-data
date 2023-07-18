
## TLDR

* Insurance SHLs are in the subdirectories of [cards](cards). Use the "shl.txt" or "shl.png" files. Trust the issuer either by [ISS URL](https://raw.githubusercontent.com/seanno/shc-demo-data/main) or using the demo data [directory](https://raw.githubusercontent.com/seanno/shc-demo-data/main/keystore/directory.json).

* IPS SHLs are the *-shl.txt and *-shl.png files in the [ips](ips) directory.

* More complicated test scenarios described below.

## Overview

A (pretty much ad-hoc) collection of FHIR data and SMART Health Cards and Links
to aid in testing viewers and other SHC- or SHL-consuming apps. 

FHIR data is all fake, collected and sometimes slightly modified from vendor
and working-group samples and demos. As many of the standards are still evolving,
buyer beware --- some files may be out of date. If you do find such, please drop
a pull request here and I'll try to fix things up.

## Keys and Directories

[keystore/keystore.json](keystore/keystore.json) contains two private keys that 
can be used to sign SHCs. The corresponding public keys are in 
[.well-known/jwks.json](.well-known/jwks.json). 

The second key (id Viof-Tjl...) has an associated CRL in
[.well-known/crl/ViOf-Tjl_GjJhYkOtWv9o7BcnVR1Bz4RNWfY34dAw_k.json](.well-known/crl/ViOf-Tjl_GjJhYkOtWv9o7BcnVR1Bz4RNWfY34dAw_k.json). Any SHC signed with this key and with
an rid value of "imrevoked" will return as revoked. 

These keys should be used with
the ISS value https://raw.githubusercontent.com/seanno/shc-demo-data/main which 
can be trusted by consumers for test purposes only. Alternatively, the directory
file [keystore/directory.json](keystore/directory.json) can be fetched from the
URL https://raw.githubusercontent.com/seanno/shc-demo-data/main/keystore/directory.json.
It includes the JWKS above but also public keys used by the SMART examples and
a few vendors during demos. Unlike "real" directory files this one is NOT 
auto-updated in any way.

## SMART Health Insurance Cards and Links

[cards](cards) holds a bunch of example SHICs. Each directory holds a bunch of
different forms of the same data. All of these formats are created using the
node script in [make-card](make-card); only the fhir.json files are hand-coded.

* `fhir.json` is the source array of FHIR resources
* Signed SHC versions of the data
  * `jws-raw.txt` is the signed VC
  * `jws.txt` is an encrypted version (referenced by shl.txt)
  * `shc.txt` is a shc:/ string IFF the data is small enough for a QR
  * `shc.png` is a shc:/ QR IFF the data is small enough for a QR
* U-flag SHLs that can be used in consumers:
  * `shl.txt` contains the SHC, no passcode
  * `shl.png` is a QR code for shl.txt
  * `shl-expired.txt` is shl.txt but with exp=1 (note the actual jws.txt still exists)
  * `shl-expired.png` is a QR code for the above
  * `shl.json` is the payload coded into `shl.txt` (not directly useful)

## Hosted SHLs

Some features can only be tested using a "live" hosted SHL, rather than the U-flag
version described above. Test these by running the express app in 
[shl-host](shl-host) with `HTTPS=true npm start`. You'll want to make sure your
browser is ok with the self-signed cert by hitting https://localhost:3001/trustme
and busting through the warning before testing. Then, from the cards directory, use:

* `shl-hosted.txt` for a hosted SHL
* `shl-hosted-pass.txt` for a hosted SHL that requires a passcode ("passcode").
* `.png` versions of the above as QR codes.

## Multi-SHL

Lastly, when running shl-host you can use two SHLs in [multi-shl](cards/multi-shl) 
to test a link containing multiple bundles (one valid SHIC, one revoked SHIC, one IPS):

* `shl.txt` a basic SHL
* `shl-pass.txt` the same with a passcode ("passcode")











