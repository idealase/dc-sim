# AI Data Center: Policy vs Physics

An educational simulator/game about AI data center proliferation and energy-consumption constraints. Learn about the real-world challenges of scaling AI compute infrastructure while managing grid constraints, cooling systems, carbon emissions, and public acceptance.

![Screenshot](https://img.shields.io/badge/Status-Ready%20to%20Play-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![D3.js](https://img.shields.io/badge/D3.js-7.8-orange)

## 🎮 Play Now

Visit the live demo: **[Play AI Data Center Sim](https://YOUR_USERNAME.github.io/ai-datacenter-policy-vs-physics/)**

## 🎯 What You'll Learn

This simulator teaches you about the real constraints facing AI infrastructure:

- **Grid Capacity**: Data centers need massive amounts of power. Learn how grid constraints limit expansion.
- **Cooling & Thermal Management**: Servers generate tremendous heat. Understand PUE, cooling types, and heatwave risks.
- **Carbon & Regulation**: Emissions have limits. Balance growth with sustainability through renewable PPAs.
- **Public Acceptance**: Communities have concerns. Water usage, noise, and local impacts matter.
- **Supply Chain**: Building takes time. Permitting, construction, and grid connections all have delays.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-datacenter-policy-vs-physics.git
cd ai-datacenter-policy-vs-physics

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173/ai-datacenter-policy-vs-physics/ in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploying to GitHub Pages

**Option 1: Manual Deploy (using gh-pages)**

```bash
npm run deploy
```

**Option 2: Automatic Deploy (GitHub Actions)**

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to `main`. 

To enable:
1. Go to your repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions" as the source
3. Push to `main` branch

## 🎓 Tutorial System

The game features a progressive tutorial that gradually unlocks controls:

| Stage | Focus | Controls Unlocked |
|-------|-------|-------------------|
| 1 | Meeting Demand | Build Data Center (Modular) |
| 2 | Grid Constraints | Transmission Upgrade, Battery Storage |
| 3 | Cooling & Thermal | Cooling Upgrade, Cooling Type Selection |
| 4 | Carbon & Policy | Renewable PPAs |
| 5 | Multi-Region | All Regions, Community Investment |

Each stage introduces a crisis that requires using the newly unlocked tools.

## 🔧 Simulation Model

### Time Scale
- 1 tick = 1 week of simulation time

### Key Metrics

| Metric | Description |
|--------|-------------|
| AI Demand | Abstract "AI Work Units" requiring compute |
| Compute Capacity | Total operational compute units |
| Backlog | Unserved demand accumulating |
| Grid Reserve | Available MW minus facility consumption |
| Thermal Headroom | Cooling capacity margin |
| Carbon Budget | Total allowed CO2 emissions |
| Public Acceptance | Community support (0-100%) |

### Data Center Types

| Type | Capacity | Build Time | Best For |
|------|----------|------------|----------|
| Hyperscale | 1000 CU | 24+ weeks | Maximum capacity |
| Modular | 200 CU | 8+ weeks | Quick deployment |
| Retrofit | 300 CU | 12+ weeks | Lower permitting |
| Edge | 50 CU | 4+ weeks | Fast, expensive |

### Failure Conditions

The game ends if any condition persists:
- **Backlog Collapse**: Unserved demand exceeds threshold too long
- **Grid Instability**: Too many brownout events
- **Thermal Trip**: Repeated cooling failures
- **Regulatory Shutdown**: Carbon cap exceeded
- **Permitting Freeze**: Public acceptance too low in multiple regions

## 📊 Visualizations

All charts built with D3.js:
- **Demand vs Served vs Backlog**: Track service levels
- **Power vs Grid Capacity**: Monitor grid margins
- **Carbon Emissions**: Watch cumulative emissions against cap

## 🏗️ Project Structure

```
ai-datacenter-policy-vs-physics/
├── .github/workflows/     # GitHub Actions for deployment
├── public/                # Static assets
├── src/
│   ├── app/              # Main App component
│   ├── components/       # React components
│   │   ├── Charts/       # D3 visualizations
│   │   ├── Controls/     # Player action controls
│   │   ├── Dashboard/    # Metrics display
│   │   ├── EventTicker/  # Event feed
│   │   ├── MapBoard/     # Region selection
│   │   ├── RunSummary/   # End-game summary
│   │   └── Tutorial/     # Tutorial overlay
│   ├── sim/              # Pure simulation logic
│   │   ├── model.ts      # Type definitions
│   │   ├── state.ts      # Initial state
│   │   ├── dynamics.ts   # Core simulation
│   │   ├── events.ts     # Event generation
│   │   ├── scoring.ts    # Score calculation
│   │   ├── tutorial.ts   # Tutorial progression
│   │   └── rng.ts        # Seeded RNG
│   ├── styles/           # Global CSS
│   └── main.tsx          # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🛠️ Tech Stack

- **Vite** - Build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **D3.js** - Data visualization
- **gh-pages** - Deployment

## 📝 License

MIT License - feel free to use, modify, and distribute.

## 🙏 Acknowledgments

Inspired by real challenges in AI infrastructure scaling. This is an educational tool, not a precise simulation of any real system.

---

**Questions or feedback?** Open an issue on GitHub!
