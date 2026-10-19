# Seat 4 B3 addendum — original Colour QR and 3-lane projector
2026-10-15. The operator supplied two historical links after B3 preregistration but before the B3 encoding implementation and test. Preserve the previous preregistration; this is additive.

## Colour QR actual protocol
Source: https://github.com/JesseBrown1980/the-colour-qr/blob/main/README.md
Git blob dec43dd370de557f2511e69227b1e234e001ddfc.
Original protocol: split source into 2100-byte chunks; prepend a four-byte little-endian Fischer chunk index; Base64; encode each as an ordinary QR; put consecutive chunks 3k,3k+1,3k+2 into red/green/blue image planes, using filler when no symbol. Read each plane independently, Base64-decode, sort by index, concatenate, check SHA256. Reported 65536-byte prior example and independently scanned crop are historical reports, NOT reverified by B3.

B3 added test: independently serialize ALL indexed chunks as RGB channel transport payloads in Python and Node. Test index 30/31 bytes, filler final plane, last short chunk, shuffled reassembly, duplicates, gaps, malformed Base64, wrong index, wrong digest. This packetized transport is separate from the proposed internal three-bank, 2-of-3 erasure code. A transport-layer success does NOT by itself prove generation and camera recovery of actual QR pixels; any genuine image-level QR test must be labeled separately and executed.

## Space/light/colour projector law
Source: https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/blob/main/README.md
Git blob 6412cb3b82ec084b03b68c9c4d074a58920ac1ee.

The defined matrix P=I-J/3 over exact rationals has diagonal 2/3, off-diagonal -1/3, is idempotent, rank two and nullity one. The exact integer-numerator equivalent 3*P*x is y_i=3*x_i-sum(x). Adding the same k to all three input lanes leaves y invariant. Therefore P alone LOSES the common mode. Additional sum(x) restores the input via x_i=(y_i+sum(x))/3. B3 must explicitly test both the collision and lossless reconstruction with the extra scalar across many ternary triples using integer arithmetic. The source's travel metaphor is not a demonstrated physical light-storage or faster-than-light effect.

Evidence boundaries: All B3 optical sticks are symbolic ternary colour bytes on regular CI hardware, not actual photons or memory-stick hardware. QR packetization is NOT QR-pixel decoding; parity erasure code is not secret sharing or encryption. Two-bank archive recovery and single-bank ambiguity must be demonstrated from raw original bytes rather than only hashes.
