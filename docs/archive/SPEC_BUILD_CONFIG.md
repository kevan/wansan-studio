```markdown
# 🛠️ Spec: Production Build Configuration

> **Goal**: Create a distributable `.dmg` (macOS) and `.exe` (Windows) where DuckDB-WASM works correctly.
> **Challenge**: Electron packs everything into `app.asar`. WASM and Workers often fail to run from inside ASAR.

## 1. Electron Builder Config (`electron-builder.yml`)

We must instruct the builder to **unpack** the DuckDB-WASM module so it exists as real files on the disk, not virtual files in the ASAR archive.

```yaml
appId: com.wansan.studio
productName: Wansan
directories:
  output: dist_electron
  buildResources: resources

files:
  - dist
  - dist-electron
  - package.json

# [CRITICAL] Unpack WASM to avoid ASAR issues
asarUnpack:
  - "node_modules/@duckdb/duckdb-wasm"
  - "node_modules/apache-arrow"
  - "**/*.wasm"

mac:
  target: dmg
  icon: resources/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist

win:
  target: nsis
  icon: resources/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

## 2. Code Adjustments (`src/main/services/database.ts`)

The path resolution logic using `require.resolve` works in Dev, but in Prod (Unpacked ASAR), we need to ensure it finds the `app.asar.unpacked` path.

Fortunately, Electron's patched `require` usually handles this redirection automatically if `asarUnpack` is set.

**Verification Logic**:
We don't need to change the code *yet*. We try the build with `asarUnpack`. If it fails, we add a path fix helper (`app.getAppPath().replace('app.asar', 'app.asar.unpacked')`).

## 3. Scripts (`package.json`)

Ensure the build script runs the full pipeline.

```json
"scripts": {
  "build": "npm run typecheck && npm run build:main && npm run build:renderer && electron-builder build"
}
```

## 4. Icons
Ensure `resources/` contains:
*   `icon.icns` (Mac)
*   `icon.ico` (Windows)
*   `icon.png` (Linux/Renderer)
