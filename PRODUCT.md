# CellShift AI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Telco engineers exploring a proposed power change and demo reviewers evaluating the workflow.

## Product Purpose

An explainable pre-change review sandbox: inspect a fictional network, propose a bounded change, explicitly confirm a simulation, and compare deterministic evidence.

## Capabilities and Constraints

Five fictional XY cell sites and one hundred seeded simulated users. Integer power deltas from -6 to +6 dB, validated on the server. Numeric evidence comes exclusively from the TypeScript simulation engine. AI parses intent and writes qualitative review. Human confirmation precedes simulation. No live network controls, real subscriber data, or calibrated RF claims. Offline local fallback remains usable.

Live assistance supports OpenRouter and optional Gemini. Credentials stay on the server in ignored local configuration. Ordinary product screens use plain AI/local/fallback status; exact provider/model provenance remains in API/export metadata.

## Brand Commitments

CellShiftAI is a legible network operations interface with complete light and dark themes, distinct section identities, selected-tower motion, visible coverage and a spatial view. Preserve comparisons, explicit approval, evidence, exports and necessary simulation limitations. Decorative movement must remain pausable and respect reduced-motion preferences.

## Evidence on Hand

Existing executable Next.js application, deterministic engine in lib/simulation.ts, tests, and engineering constraints in docs/. No validated field measurements or production operator integration.

## Product Principles

- Make the next action and its scope clear.
- Keep numerical facts reproducible and independent of AI.
- Preserve accurate provenance without provider branding in ordinary product screens.
- Reveal detail when useful; preserve review evidence.
