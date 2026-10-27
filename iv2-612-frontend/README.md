# ILM Cascade

ILM Cascade is a React + TypeScript application built with Vite. It uses TanStack Router, TanStack Query, and modern UI/component libraries to support a feature-rich frontend experience.

## Prerequisites

- Node.js 22 (recommended)
- npm
- Docker Desktop (for containerized development)

## Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update environment values as needed for your local workflow.

## Local Development (Without Docker)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Docker Development

The project includes `docker-compose.yml` and `Dockerfile.local` for running the Vite dev server in a container.

### 1. Export UID/GID (Important)

Compose uses `user: "${UID}:${GID}"`. Export these in your shell before running Compose:

```bash
export UID=$(id -u)
export GID=$(id -g)
```

Do not use `sudo` for `docker compose` commands unless required in your environment. Running with `sudo` can drop these variables and cause warnings.

### 2. Build the image

```bash
docker compose build
```

### 3. Start the app

```bash
docker compose up
```

The app is available at `http://localhost:5173`.

### 4. Stop and remove containers

```bash
docker compose down
```

### 5. Stop and also remove volumes

```bash
docker compose down -v
```

Use this when you need a clean dependency volume or need to reset container state.

### 6. Rebuild from scratch (no layer cache)

```bash
docker compose build --no-cache
docker compose up
```

## HTTP vs HTTPS in Local

Local Docker development is HTTP by default.

- Default local URL: `http://localhost:5173`
- HTTPS is opt-in via `VITE_ENABLE_HTTPS=true`

If you explicitly need HTTPS locally, set:

```bash
VITE_ENABLE_HTTPS=true docker compose up
```

When HTTPS is enabled, Vite uses `vite-plugin-mkcert`.

## Common Troubleshooting

### UID/GID warning in Compose output

If you see:

- `The "UID" variable is not set`
- `The "GID" variable is not set`

Run:

```bash
export UID=$(id -u)
export GID=$(id -g)
```

Then re-run `docker compose up`.

### esbuild version mismatch at startup

If the dev server fails with an esbuild host/binary version mismatch, do a clean rebuild:

```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Project-wide lint/typecheck fix before deploy

To auto-fix Biome issues across the whole project and then verify checks, run:

```bash
npm run fix:project-ci
```

This command:

- Runs `npm run lint:fix` for the entire project
- Runs `npm run lint`
- Runs `npm run typecheck`

If you only want to verify without auto-fixing:

```bash
npm run check:project-ci
```

## Available Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Build the production bundle
- `npm run preview`: Preview the production build locally
- `npm run fix:project-ci`: Auto-fix Biome issues project-wide, then run lint + typecheck
- `npm run check:project-ci`: Run lint + typecheck without auto-fixing
- `npm run lint`: Run Biome checks
- `npm run lint:fix`: Run Biome checks with auto-fixes
- `npm run format`: Format code with Biome
- `npm run typecheck`: Run TypeScript type checks
- `npm run test`: Run unit tests in watch mode
- `npm run test:unit`: Alias for watch mode
- `npm run test:coverage`: Run unit tests with v8 coverage report

---

## Code Quality & Developer Tooling

### Biome — Linting & Formatting

This project uses [Biome](https://biomejs.dev/) as the single tool for both linting and formatting. ESLint and Prettier are **not used**.

**Configuration file:** `biome.json`

Key settings:

- Indentation: **tabs**, width 2
- Line width: **80 characters**
- Quotes: **double**
- Semicolons: **always**
- Trailing commas: **always**
- CSS Modules: **enabled**
- Import organization: **auto-sorted on save**

**Commands:**

```bash
# Check for lint/format issues (no changes made)
npm run lint

# Auto-fix all lint and format issues
npm run lint:fix

# Format only (no lint)
npm run format
```

Biome runs automatically on staged files before every commit via Husky + lint-staged (see below).

---

### Unit Testing — Vitest + React Testing Library

**Framework:** [Vitest](https://vitest.dev/) v3 + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) + [happy-dom](https://github.com/capricorn86/happy-dom)

**Why happy-dom over jsdom?** `happy-dom` has no ESM/CJS compatibility issues on Node 20+ and is significantly faster.

**Test location:** `src/test/` or co-located as `*.test.tsx` anywhere under `src/`

**Setup file:** `src/test/setup.ts` — imports `@testing-library/jest-dom` matchers globally.

**Writing a test:**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MyComponent from "$components/my-feature/MyComponent";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onSubmit when button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MyComponent onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
```

**Rules:**

- Prefer `screen.getByRole` over `getByTestId` — accessible queries test real behaviour
- Use `userEvent` over `fireEvent` — more realistic user interaction simulation
- Never import from `jsdom` — the configured environment is `happy-dom`
- Test files are excluded from coverage: `src/test/`, `src/routeTree.gen.ts`, `src/main.tsx`

**Run tests:**

```bash
# Watch mode (development)
npm run test

# Single run — same as CI
npx vitest run

# With coverage report (outputs to coverage/)
npm run test:coverage
```

---

### Git Hooks — Husky

[Husky](https://typicode.sh/husky) v9 manages Git hooks automatically. Hooks are installed on `npm install` via the `"prepare": "husky"` script in `package.json`.

**Hook files are in `.husky/`:**

| File         | Trigger            | Command           | Purpose                         |
| ------------ | ------------------ | ----------------- | ------------------------------- |
| `pre-commit` | Every `git commit` | `npx lint-staged` | Lint & format staged files only |
| `pre-push`   | Every `git push`   | `npx vitest run`  | Run full test suite before push |

**lint-staged** (`lint-staged.config.js`) runs Biome only on the files you are committing — not the entire codebase — keeping commits fast:

```js
// lint-staged.config.js
export default {
  "**/*.{js,jsx,ts,tsx,json,css}": (filenames) => [
    `npx biome check --write ${filenames.join(" ")}`,
  ],
};
```

**Workflow example:**

```bash
git add src/components/MyComponent.tsx
git commit -m "feat: add MyComponent"
# → Husky fires pre-commit
# → lint-staged runs Biome on MyComponent.tsx only (~0.5s)
# → commit succeeds

git push origin feature/my-feature
# → Husky fires pre-push
# → npx vitest run executes all unit tests (~5-10s)
# → push succeeds only if all tests pass
```

**Never bypass hooks with `--no-verify`** — CI enforces the same checks and will fail anyway.

---

### Git Push Strategy

We follow a **feature-branch + pull request** workflow. No direct commits to `main`.

```
main (protected)
 └── feature/your-feature-name    ← your work
 └── fix/bug-description          ← bug fixes
 └── chore/tooling-update         ← non-product changes
```

**Branch naming convention:**

| Prefix      | Use case                                    |
| ----------- | ------------------------------------------- |
| `feature/`  | New features or UI changes                  |
| `fix/`      | Bug fixes                                   |
| `chore/`    | Tooling, config, dependency updates         |
| `refactor/` | Code restructuring with no behaviour change |

**Step-by-step:**

```bash
# 1. Create a branch from latest main
git checkout main && git pull origin main
git checkout -b feature/my-feature

# 2. Make changes, commit often
git add -p             # stage specific hunks (preferred over git add .)
git commit -m "feat: describe what changed"
# → pre-commit hook runs Biome on staged files automatically

# 3. Push your branch
git push origin feature/my-feature
# → pre-push hook runs all Vitest unit tests

# 4. Open a pull request to main on GitHub
# → CI pipeline runs: lint → typecheck → build → vitest
# → All checks must pass before merge
```

**Commit message convention (Conventional Commits):**

```
feat: add supplier filter to marketplace page
fix: correct date format on workplan card
chore: update biome to 2.3.0
refactor: extract useFilters hook from LaborPage
docs: update README with test instructions
```

---

## CI/CD Pipeline

**Workflow file:** `.github/workflows/Build Test Deploy Frontend.yml`

**Triggers:** push to any branch, PRs to `main`, manual dispatch, releases.

**Pipeline steps (in order):**

| Step                 | Command                      | Purpose                       |
| -------------------- | ---------------------------- | ----------------------------- |
| Checkout             | `actions/checkout@v4`        | Fetch code                    |
| Node setup + install | `npm ci`                     | Clean install with lockfile   |
| Lint                 | `npm run lint`               | Biome lint check              |
| Type check           | `npm run typecheck`          | TypeScript strict check       |
| Build                | `npm run build`              | Vite production build         |
| Unit tests           | `npx vitest run`             | Run all Vitest tests          |
| Upload coverage      | `actions/upload-artifact@v4` | Store `coverage/` for 30 days |

**All steps must pass** before a PR can be merged to `main`.

The CI uses Node.js 22 and opts into Node.js 24 for action runners:

```yaml
env:
  NODE_VERSION: 22
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/)
- [Husky](https://typicode.sh/husky)
- [Docker Documentation](https://docs.docker.com/)

## Contributing

See the **Git Push Strategy** section above for the full branch + PR workflow. In short:

1. Branch off `main` with a descriptive prefix (`feature/`, `fix/`, `chore/`)
2. Commit often using Conventional Commits format
3. Push — Husky runs tests automatically
4. Open a pull request — CI must pass before merge

## License

This project is licensed under the MIT License.
