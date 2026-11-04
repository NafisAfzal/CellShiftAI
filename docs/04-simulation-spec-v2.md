# Shipped Simulation — Deterministic Synthetic RF Proxy v1.0

**Source of truth:** `lib/simulation.ts`. Tests at `tests/simulation.test.mjs`. This is a teaching / workflow demonstration, not a 3GPP calibration, actual coverage estimate or 5G/6G certified digital twin.

## Fictional topology
5 sites (`cell-a` through `cell-e`) in 2D grid 0..1000 and 100 seeded synthetic UEs, using a fixed pseudo-random generator. Every run starts from identical inputs. Per-site parameter `powerDbm`, `capacityUsers`; user has fictional ID, x/y and demand. Allowed operation: power delta integer -6..+6 dB; resulting power 30..46 dBm.

## Deterministic heuristic
- Distance km = max(0.07, Euclidean 2D distance / 1000).
- Signal proxy = `txPowerDbm + 12 - (128.1 + 37.6 log10(distanceKm))`.
- Serving site = strongest signal site. No real handover modeling.
- Cochannel interference approximated as sum of other site received powers, thermal noise 10^(-108/10) mW. SINR proxy = 10 log10(serving/interference).
- Covered iff received signal >= -70 dBm AND SINR >= 0 dB, purely illustrative threshold.
- Rate proxy = capped transform of SINR with simple capacity penalty; **not Mbps**.
- Re-association count = changed serving site IDs in two independent evaluations, not actual mobility handovers.
- Risk: HIGH if >=3 newly uncovered, avg SINR delta below -2 dB or >=2 overloaded cells; MODERATE if >0 uncovered, avg SINR delta below -0.6 dB or >=5 association changes; else LOW. Heuristic review priority, not incident probability.

## Output
`baseline`, `proposed` metrics: covered users, coveragePct, avgSinrDb, avgRateProxy, overloadedCells, highInterference and association evidence. `delta`, review priority reasons, `before`, `after`, changed cell parameters and explicit `limitations`. Numbers computed by deterministic code on SERVER. Gemini can only interpret results with validated bounded strings.

## Limitations
No real tower info or client subscriber identifiers. Fictional coordinates, no real antenna patterns/tilt, terrain, buildings, spectrum allocation, real scheduling, traffic shaping, real handover control or calibrated propagation. No real deployment decisions based on these proxies.

## Verify
`npm test` (Node 22+), then `POST /api/simulate` with `{"siteId":"cell-b","deltaPowerDb":3}`. Zero delta should produce no changes. Input should never mutate. Repeated runs should produce byte-identical parsed JSON values under same code and inputs.
