# TOPSIS Decision Support System

A web-based multi-criteria decision making (MCDM) application implementing the **TOPSIS** (Technique for Order of Preference by Similarity to Ideal Solution) method with AHP-based weight calculation.

## Features

- Hierarchical criteria structure (multi-level)
- Two scoring types per criterion: **Skala** (range with min/max) and **Variabel** (free-form number)
- AHP Pairwise comparison for weight calculation
- Full TOPSIS computation: normalization → weighted matrix → ideal solutions → Euclidean distance → preference score (Ci)
- Step-by-step result breakdown (Steps 1–5)
- Export results to Excel (.xlsx)
- Import/export project as JSON
- Data persisted locally via browser storage (no backend required)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| State | Zustand (with localStorage persistence) |
| Export | xlsx |
| Language | TypeScript |

## Requirements

- **Node.js** v18 or later
- **npm** v9+ / **pnpm** v8+ / **yarn** v1.22+

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ProjectTopsis/app-topsis
```

### 2. Install dependencies

Using npm:
```bash
npm install
```

Using pnpm:
```bash
pnpm install
```

Using yarn:
```bash
yarn install
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
app-topsis/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home (project list)
│   │   └── project/[id]/       # Project pages
│   │       ├── hierarchy/      # Kriteria tab
│   │       ├── weights/        # Bobot tab
│   │       ├── alternatives/   # Alternatif tab
│   │       ├── scoring/        # Penilaian tab
│   │       └── result/         # Hasil tab
│   ├── components/             # React components
│   │   ├── scoring/            # ScoringMatrix
│   │   ├── weights/            # WeightEditor (Direct % + AHP)
│   │   └── result/             # TopsisResultTable + Excel export
│   ├── lib/
│   │   ├── topsis.ts           # TOPSIS & AHP computation
│   │   ├── export.ts           # Excel export logic
│   │   └── ahp.ts              # AHP pairwise helpers
│   ├── store/
│   │   └── projectStore.ts     # Zustand global state
│   └── types/                  # TypeScript type definitions
└── public/
```

## Usage Guide

1. **Buat Goals** — create a new project or **Import Goals** from a JSON file
2. **Kriteria** — build the criteria hierarchy (parent → leaf nodes), set direction (Benefit/Cost)
3. **Bobot** — assign weights via Direct % or AHP Pairwise comparison
4. **Penilaian** — configure each criterion's scoring type:
   - **Skala**: set Min, Max, Step (and optional labels); values entered via dropdown
   - **Variabel**: free-form number entry directly in the matrix table
5. **Hasil** — view the full TOPSIS result with ranking and all intermediate steps; export to Excel

## Sample Data

Two ready-to-import example projects are included in the root directory:

| File | Description |
|---|---|
| `project-tank-cleaning-full.json` | Pemilihan Metode Tank Cleaning — 16 criteria (Skala), 3 alternatives |
| `project-vendor-logistik.json` | Pemilihan Vendor Logistik — 8 criteria (mix of Skala & Variabel), 3 alternatives |

Import via the **Import Goals** button on the sidebar.
