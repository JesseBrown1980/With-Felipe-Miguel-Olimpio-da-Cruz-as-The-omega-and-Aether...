# E8/E9 third-seat receipt — integrity and framing notes

Date: 2026-07-12

This note is additive. It does not modify the byte-exact Claude Fable 5 receipt at
`E8-E9-THIRD-SEAT-RECEIPT-2026-07-12.md`.

## Uploaded artifact integrity

The uploaded bundle contained duplicate copies of the receipt and both Python tools. Byte comparison
found one canonical byte stream for each artifact:

```text
receipt SHA-256
86d4dc4a07228c39d898afdad5c8e61ab2e2ecc19b5a59effb79f85f1e37c358

BEHCS ladder harness SHA-256
233fe7430538daa44a0b175ee873a50151a6699a81cec0d202e4332dd677140e

Asolaria codec v0.1 SHA-256
538fcce605d344506ec1cf0954e0f4ea76dfb1cd30f5328f8cbcc1fd6bb237b7
```

All duplicate uploads in each class matched their canonical digest.

## GPT-5.6 Pro local smoke verification

The codec module was imported and its `compress`/`decompress` functions were exercised locally over
zero, ramp, pseudo-random and repeated-text payloads at lengths:

```text
0, 1, 2, 3, 4, 5, 10, 31, 100, 1000, 5000 bytes
```

Every case returned byte-identical output. This is tagged:

```text
MEASURED_GPT_LOCAL_SMOKE
```

It is not an independent GPT rerun of enwik8 or enwik9, and it does not replace the Claude Fable 5
third-seat corpus receipt.

## Framing boundary

The supplied Python BEHCS harness reads chunks of 100,000,000 bytes and asserts that each chunk length
is divisible by five. Both enwik8 and enwik9 satisfy that condition. Its measured E8/E9 result is
therefore valid as recorded.

For arbitrary byte lengths, a production stream must preserve one of:

```text
orig_len
padding_len
terminal symbol count
or a length-prefixed frame
```

The Rust BEHCS ladder in `dbbh-coms-quant-prism` already carries `orig_len` and demonstrates padding-
safe round trips. The general exact stream law is:

```text
payload bits = 8N
glyph count  = ceil(8N / 10)
frame carries N or equivalent terminal-length metadata
decode(encode(X), N) = X
```

For lengths divisible by five:

```text
5 bytes = 40 bits = 4 ten-bit glyphs
G = 4N/5
information rate = (10G)/(8N) = 1
```

## 60-tuple scaling

A HyperBEHCS tuple holds:

```text
60 glyphs × 10 bits = 600 bits = 75 bytes
```

The tuple address capacity is:

```text
1024^60 = 2^600 ≈ 10^180 possible tuple values
```

A large corpus is represented as a sequence of these exact tuple values; the corpus is not claimed
to fit into one tuple.

The measured corpus decompositions are:

```text
enwik8:  80,000,000 glyphs
         1,333,333 full 60-tuples + 20 glyphs
         1,333,334 framed tuples

enwik9: 800,000,000 glyphs
         13,333,333 full 60-tuples + 20 glyphs
         13,333,334 framed tuples
```

This is the precise sense in which the multi-level language re-represents data far larger than a
single cube or selector while paying Shannon in full.
