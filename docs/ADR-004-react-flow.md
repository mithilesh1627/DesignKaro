# ADR-004: React Flow / XYFlow for Interactive Architecture Canvas

## Status
Accepted

## Context
The architecture canvas is the core interactive differentiator of DesignKaro. Building an ad-hoc canvas engine from scratch incurs massive complexity with zoom, pan, touch gestures, custom node layout, connection snapping, and edge routing.

## Decision
We adopt **React Flow (@xyflow/react v12+)** for the architecture canvas interface.

## Consequences
### Positive
- Production-grade viewport navigation: touch-friendly, pinch-zoom, pan, minimap, background grid patterns.
- Fully customizable nodes and edges allowing rich component badges (status indicators, QPS meters, SPOF warnings).
- Clean separation between visual node state and underlying structured architecture JSON.
- Active developer ecosystem and high performance with hundreds of simultaneous nodes.

### Trade-offs
- Node coordinates and visual layout are decoupled from architectural logic; our serializer translates XYFlow visual graphs into canonical domain graph JSON for backend rule evaluation.
