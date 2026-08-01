# ADR-001: Thin Client Composition Roots

## Context
Level-Up-Game-Zone is migrating from a thick-client Firebase model to a secure Thin Client architecture backed by an Express server to secure financial logic.

## Decision
The React application (`packages/client`) must act strictly as a Thin Client.
- **Data Mutation:** Direct Firestore writes from the client are strictly forbidden. All mutations must route through the Express Backend API.
- **Composition Roots:** The client's Composition Root (e.g., `App.tsx` and Route declarations) must remain decoupled from specific transaction logic, delegating to layout and page components.
- **State Management:** The client may cache reads but cannot optimistically assume transaction success without server-side validation and audit logging.

## Consequences
- **Positive:** Financial integrity is protected by zero-trust backend transaction wrappers.
- **Negative:** Increased latency for user actions as they must wait for network roundtrips to the Express server.
