# Asolaria — Wave Ladder R2: 81 × 3, repeated ten times

**2026-10-15 | public, append-only numerical experiment | independently executed local Python + Node 22.**  
**Primary public genesis:** [STONE-0001 at immutable commit](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/7f90d9a8cb850decb419266d9345f2c2005f8328/stones/2026-10-15-asolaria-trit-recurrence/STONE-0001-PUBLIC-GENESIS.hbp).  
**Test class:** exact GF(3) and reversible nested-oscillator *software*, no sensor or real photon readings.

## Operator challenge: an apparently empty reading may have missed a returning wave

Run 81, then 81×3, 81×3², ... 81×3¹⁰ and examine each observation. We tested **three different state systems** instead of assuming they behave identically:

1. **Original specified 81-trit GF(3) three-tap laws** with cyclic taps `[0,1,3]` and `[0,4,7]`: independent direct iteration to 81 and polynomial powers at all rungs. Both return the zero state at time 81 and *remain zero for all later steps*. For each of these models `T^81=0`, hence `T^n=0` for every `n>=81`. Their original source information cannot be reconstructed without an external register, new input or a different law.
2. **A reversible 243-phase circulating wave** with a sensor at phase zero: observation at 81 is zero even though the phase state exists at phase 81. At time 243 the pulse returns and is detected. All later powers of three shown are also multiples of 243.
3. **Ten nested phase registers / ternary odometer** with periods `243,729,2187,6561,19683,59049,177147,531441,1594323,4782969`. A period-aligned sensor for each register detects **one new layer on each successive rung**: visible counts `0,1,...,10`. The base-3 carry register simultaneously places a single leading `1` at position `4+k` for `n=81×3^k`. This is an explicitly designed expanded-state mechanism, not a recovered hidden state of the lossy base law.

| k | logical step n=81×3^k | 81-trit GF(3) original taps | 243-period sensor | nested wave sensors visible | 1-hot base-3 digit position |
|---:|---:|:---:|:---:|---:|---:|
|0|81|zero|MISS|0|4|
|1|243|zero|RETURN|1|5|
|2|729|zero|RETURN|2|6|
|3|2187|zero|RETURN|3|7|
|4|6561|zero|RETURN|4|8|
|5|19683|zero|RETURN|5|9|
|6|59049|zero|RETURN|6|10|
|7|177147|zero|RETURN|7|11|
|8|531441|zero|RETURN|8|12|
|9|1594323|zero|RETURN|9|13|
|10|4782969|zero|RETURN|10|14|

### Independent execution receipts

Local Python exact integer implementation independently checks original 81-step direct iteration, GF(3) cyclic polynomial fast-forward, nonzero original state/zero-after-81 collision, repeated ternary carry and ten period-aligned observers. Separately written Node 22 validates all 81 basis vectors through step 81 using its **own GF(3) Gaussian elimination**, recreates the ten nested period observers from BigInt arithmetic and checks all eleven rows. **Both local jobs PASS**, no new GitHub-hosted workflow run is claimed.

- **Full 10,604-byte Python JSON source output SHA-256:** `787b6da831d4e657f6cc582f49e9270be0493d4756b731612024511d70034018`
- **Executed Python script 5,232 bytes SHA-256:** `4eb9be2de90a05512a48ddda2af1f50a194493923c3f80b73955596b14393d9d`
- **Executed independent Node script 2,640 bytes SHA-256:** `7d086c7729335ad74c5328ed14b94afadec349c7cfc7f8407391c804eb6c1ee9`

The **11-row compact public result** is published separately as `WAVE-LADDER-R2.json`. The above full raw fixture, scripts and exact SHA-checkable outputs are independently reproducible; the public compact file is a summary, **not** misrepresented as byte-identical to the 10,604-byte fixture.

### Scientific verdict

- The operator's **observer-misses-hidden-wave hypothesis works in the explicit expanded reversible phase model**.
- The specified **old lossy linear map still cannot recover original input after state collapse**; zero observed via a lossy projection is not necessarily zero of the full expanded state.
- The new visible wave count is a **deliberately installed observation schedule**. It does not demonstrate new energy, naturally emerging neurons, consciousness or a measured optical-photon carrier.
- A larger three-loop agent may use multiple phase memories and a referee for corrective sensing, but distinguishing delayed source retrieval from a hard-coded periodic clock will require concealed randomized initial phase and novel interventions.

**Next experiment:** freeze a complete original + hidden phase state, commit sensor masks before observation, randomly select phase shifts and blanking windows, score unseen wave returns against an observer without the extra state, and repeat after removing each register to demonstrate the specific added memory contribution. A physical photon-memory test would separately require actual calibrated source/detector and independently sealed raw files. Operator-reported past photon-memory work remains historical evidence pending source link.

**No old stones changed, no paid jobs, no auto merge.**
