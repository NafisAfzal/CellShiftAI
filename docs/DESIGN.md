# Design decisions

The workspace is built around a network and an explicit review sequence, rather than a chat transcript.

## Hierarchy

The network is the main visual surface. Proposal controls sit beside it on desktop and follow it on smaller screens. KPI comparison, affected-user evidence and engineering review form the next level. Section bands use restrained cyan, amber, blue, coral and violet to distinguish purpose without competing with site colors.

Actions follow a consistent hierarchy: Interpret change prepares a draft; confirmation approves that draft for simulation; Run simulation is the strongest ready action. Generate/Refresh review and JSON/Markdown exports are visible secondary controls. Changing parameters revokes approval.

## Themes

| Surface | Dark | Light |
| --- | --- | --- |
| Application background | `#080f1c` | `#e9e8e2` |
| Main panel | `#112238` | `#f1f1e9` |
| Inset panel | `#0c192c` | `#eaece5` |
| Main text | `#f0f6ff` | `#14263f` |
| Accent | `#70e4ce` | `#087268` |

Light mode uses warm stone, softly tinted section headers and differentiated fields. It avoids a full white page while keeping readable text and controls. Dark mode retains the established navy/cyan/emerald palette. Colors come from semantic tokens in `app/globals.css`; the detailed reference is [root DESIGN.md](../DESIGN.md).

## Topology framing

A large panel is useful only when the network uses its drawing area. Framing accounts for the full projected plane, tower labels and touch targets, and stays stable during rotation. The toolbar, status row, legend and selection readout sit outside the plot so they do not obscure the network. Uniform scaling preserves XY proportions.

2D prioritizes the spatial plan; 3D adds inspection controls without changing the model. Mobile has compact labels, native site selectors and camera targets of at least 44 pixels. Exact positions are preserved rather than moving users to avoid overlap.

## Interaction and motion

Selected-tower waves identify selection, not measured RF reach. A visible control pauses them, and reduced-motion preferences disable their animation. Camera movement is user-driven. Short hover, pressed and disclosure feedback supports recognition; KPI values do not count up and no animation delays an action.

Interpretation moves keyboard focus to confirmation. Clarification returns focus to the instruction. Errors and completion states use in-flow feedback. Results do not force a scroll; View results is an explicit link. Export buttons stay above optional review prose and announce when a download starts.

## What we deliberately leave out

No map provider is placed over invented XY coordinates. No provider/model branding appears in ordinary product copy. No decorative animated background, automatic camera orbit, fake report completion, fabricated prediction or production claim is used.

See the [gallery](GALLERY.md) for actual screenshots and [testing](TESTING.md) for the responsive and interaction checks.
