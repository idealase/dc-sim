# dc-sim — Copilot Instructions

## Project Overview

An interactive educational simulator/game about AI data center proliferation and energy-consumption constraints. Players manage grid capacity, cooling systems, carbon emissions, and public acceptance while scaling AI compute infrastructure. Built with React, TypeScript, and D3.js time-series visualizations.

## Tech Stack

- **Frontend**: React 18.2 / Vite 5.2 / TypeScript 5.2
- **Visualization**: D3.js 7.8.5 (time-series line/area charts)
- **Data**: In-memory simulation state (no persistence)
- **Styling**: Vanilla CSS (`src/styles/globals.css`)
- **Testing**: None configured yet
- **Deployment**: GitHub Pages via GitHub Actions
- **CI/CD**: GitHub Actions (`deploy.yml`) — builds and deploys on push to `master`

## Quick Commands

```bash
# Install dependencies
npm ci

# Start dev server
npm run dev

# Build for production (TypeScript check + Vite build)
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages (manual, via gh-pages package)
npm run deploy

# Type check (part of build)
npx tsc --noEmit
```

## Project Structure

```
dc-sim/
├── src/
│   ├── app/                # Main App component
│   │   └── App.tsx
│   ├── components/         # React UI components
│   │   ├── Charts/         # D3.js visualizations
│   │   │   ├── CarbonChart.tsx    # Dual-axis emissions chart
│   │   │   ├── DemandChart.tsx    # Multi-line demand/served/backlog
│   │   │   └── PowerChart.tsx     # Area + line power vs grid capacity
│   │   ├── Controls/       # Player action controls
│   │   ├── Dashboard/      # Metrics display
│   │   ├── EventTicker/    # Event feed
│   │   ├── MapBoard/       # Region selection map
│   │   ├── RunSummary/     # End-game summary
│   │   └── Tutorial/       # Tutorial overlay
│   ├── sim/                # Pure simulation engine (no React deps)
│   │   ├── model.ts        # Type definitions & TimeSeriesPoint
│   │   ├── state.ts        # Initial state factory
│   │   ├── dynamics.ts     # Core tick simulation logic
│   │   ├── events.ts       # Random event generation
│   │   ├── scoring.ts      # Score calculation
│   │   ├── tutorial.ts     # Tutorial stage progression
│   │   ├── archetypes.ts   # Data center type definitions
│   │   ├── regionData.ts   # Region configuration
│   │   └── rng.ts          # Seeded random number generator
│   ├── styles/
│   │   └── globals.css
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── .github/
│   ├── workflows/deploy.yml
│   └── copilot-instructions.md
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts          # base: '/dc-sim/'
```

## Coding Conventions

### General
- Use TypeScript strict mode — no `any` types
- Prefer named exports over default exports (barrel `index.ts` files in each component dir)
- Keep simulation logic in `src/sim/` completely separate from React components
- Error messages must be user-friendly, not stack traces

### Naming
- Components: PascalCase (`PowerChart.tsx`)
- Simulation modules: camelCase (`dynamics.ts`, `regionData.ts`)
- Types/interfaces: PascalCase (`TimeSeriesPoint`, `SimState`)
- CSS classes: kebab-case in globals.css

### File Organization
- One component per file
- Each component directory has a barrel `index.ts`
- All simulation types defined in `src/sim/model.ts`
- Pure simulation logic has zero React imports

### Git
- Conventional commits: `feat|fix|docs|chore|refactor|test|ci: description`
- Branch naming: `type/issue-number-short-description`
- Default branch: `master`

## Architecture Decisions

- **Simulation/View separation**: All game logic lives in `src/sim/` as pure TypeScript functions with no React dependencies, enabling future testing and reuse
- **D3 via React refs**: Charts use `useRef` + `useEffect` to give D3 full control of SVG rendering inside React components
- **Seeded RNG**: Deterministic random events via `src/sim/rng.ts` for reproducible gameplay
- **Vite base path**: Set to `/dc-sim/` for GitHub Pages deployment
- **No state management library**: React state + prop drilling is sufficient for the component tree depth

## D3 Visualization Patterns

All charts in `src/components/Charts/` follow the same pattern:
1. React component with `useRef<SVGSVGElement>` for the SVG element
2. `useEffect` runs D3 rendering when data changes
3. D3 handles all SVG manipulation via `d3.select(ref.current)`
4. Common D3 APIs: `scaleLinear`, `line`, `area`, `axisBottom`, `axisLeft`, `curveMonotoneX`

### Chart Types
| Chart | Type | Data Fields | Axes |
|-------|------|-------------|------|
| DemandChart | Multi-line time series | demand, served, backlog | X: weeks (W#), Y: compute units |
| PowerChart | Area + line | totalPowerMW, totalGridCapacityMW | X: weeks, Y: megawatts |
| CarbonChart | Dual-axis area + line | cumulativeEmissions, avgCarbonIntensity | X: weeks, Y-left: tonnes CO₂, Y-right: kg CO₂/MWh |

### Data Format
```typescript
interface TimeSeriesPoint {
  tick: number;           // Week number
  demand: number;         // AI work units requested
  served: number;         // AI work units fulfilled
  backlog: number;        // Unserved demand
  totalPowerMW: number;   // Facility power consumption
  totalGridCapacityMW: number;  // Grid capacity
  cumulativeEmissions: number;  // Total CO₂
  avgCarbonIntensity: number;   // g CO₂/MWh
}
```

## Deployment

- **URL**: https://idealase.github.io/dc-sim/
- **Build path**: `dist/`
- **Method**: GitHub Pages via GitHub Actions (auto-deploy on push to `master`)
- **Base path**: `/dc-sim/` (configured in `vite.config.ts`)

### Deployment Checklist
1. Build succeeds: `npm run build`
2. Push to `master` triggers GitHub Actions deploy
3. Verify: `curl -s https://idealase.github.io/dc-sim/`

## Testing Strategy

- **Status**: No testing framework configured yet
- **Recommended**: Vitest for unit tests on `src/sim/` pure functions
- **Priority**: Simulation logic (`dynamics.ts`, `scoring.ts`, `events.ts`) is ideal for unit testing since it's pure TypeScript with no React dependencies

## Common Pitfalls

- **Base path**: Vite base is `/dc-sim/` — all asset paths must be relative or use the base. Dev server runs at `http://localhost:5173/dc-sim/`
- **D3 + React**: Never let React re-render interfere with D3's SVG manipulation. The `useEffect` dependency arrays in Chart components must be correct
- **Tick timing**: 1 tick = 1 week in simulation time. Don't confuse with real-time or animation frames
- **Data center build times**: Construction takes multiple ticks. Don't assume immediate availability after a build action

## Related Repos

- **idealase.github.io**: Meta-repo with agentic SDLC docs and shared templates

## Agent-Specific Instructions

### Scope Control
- Stay within the files listed in the issue. Do not refactor unrelated code.
- If you discover a bug outside your scope, note it in the PR but don't fix it.
- Maximum diff size: 200 lines for size/S, 500 lines for size/M

### PR Format
- Title: conventional commit format (`feat: add dark mode toggle`)
- Body: reference the issue (`Closes #42`)
- Include a "Changes" section listing what was modified and why
- Include a "Testing" section showing test commands run and results

### What NOT to Do
- Do not modify CI/CD workflows unless the issue specifically asks for it
- Do not update dependencies unless the issue specifically asks for it
- Do not add new dev dependencies without explicit instruction
- Do not modify nginx configs, systemd units, or deployment scripts
- Do not read or modify `.env` files, credentials, or secrets
