# Brand Assets Management

## Overview

Brand assets (logos, images, fonts, etc.) are centrally stored in `libs/hominio-brand/src/assets/` and automatically synced to all service static folders during development.

## How It Works

### 1. **Single Source of Truth**
All brand assets live in one place:
```
libs/hominio-brand/src/assets/
├── logo_clean.png
├── [future assets...]
```

### 2. **Hot-Reload-Aware Sync**
When you run `bun dev`, a file watcher automatically syncs assets to:
- `services/app/static/brand/`
- `services/wallet/static/brand/`
- `services/website/public/brand/`

The `brand/` subfolder makes it clear these assets come from the hominio-brand package! 🎨

### 3. **SvelteKit Standard Usage**
Services use assets the normal way - no special imports needed:

```svelte
<!-- In any service component -->
<img src="/brand/logo_clean.png" alt="Logo" />
```

## Scripts

### Sync Once (Manual)
```bash
node libs/hominio-brand/scripts/sync-assets.js
```

### Watch Mode (Automatic during dev)
```bash
node libs/hominio-brand/scripts/sync-assets.js --watch
```

The watch mode runs automatically when you use `bun dev` 🎉

## Adding New Assets

1. **Add to brand package:**
   ```bash
   cp my-new-asset.png libs/hominio-brand/src/assets/
   ```

2. **If dev server is running:**
   - Asset is automatically synced to all services ✅
   - Hot reload works! ♻️

3. **If dev server is not running:**
   - Run sync manually: `node libs/hominio-brand/scripts/sync-assets.js`

4. **Use in any service:**
   ```svelte
   <img src="/brand/my-new-asset.png" alt="My Asset" />
   ```

## Git Workflow

The synced `brand/` folders are **gitignored** - they're generated automatically:
- ✅ Source assets in `libs/hominio-brand/src/assets/` ARE tracked in git
- ❌ Synced folders `services/*/static/brand/` are NOT tracked in git
- 🔄 Running `bun dev` automatically syncs assets before starting services

## Production Builds

- Each service builds with its own copy of assets (in `static/brand/` or `public/brand/`)
- The sync script runs as part of the dev workflow (integrated in `bun dev`)
- No runtime dependencies on the brand package
- Assets are optimized by Vite during build

## Benefits

✅ **Single source of truth** - One place to manage all brand assets
✅ **Hot reload** - Changes to assets trigger automatic reload
✅ **Simple imports** - Use standard SvelteKit syntax (`/logo.png`)
✅ **No build hacks** - Works with standard Vite/SvelteKit setup
✅ **Monorepo friendly** - No complex module resolution
✅ **Production ready** - Each service has its own optimized copies

## Architecture

```
┌─────────────────────────────────────┐
│  libs/hominio-brand/src/assets/     │
│  ├── logo_clean.png (SINGLE SOURCE) │
│  └── [other assets...]              │
└─────────────┬───────────────────────┘
              │
              │ (sync-assets.js --watch)
              │
       ┌──────┴──────┬──────────────┐
       │             │              │
       ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   app    │  │  wallet  │  │ website  │
│ /static/ │  │ /static/ │  │ /public/ │
│  brand/  │  │  brand/  │  │  brand/  │
└──────────┘  └──────────┘  └──────────┘
```

## Fonts

### Shrikhand - Default Title Font

The Shrikhand font is configured as the default title font across all services:

**Location:**
```
libs/hominio-brand/src/assets/fonts/Shrikhand/
├── Shrikhand-Regular.ttf
└── OFL.txt
```

**Synced to:**
```
services/app/static/brand/fonts/Shrikhand/
services/wallet/static/brand/fonts/Shrikhand/
services/website/public/brand/fonts/Shrikhand/
```

**Usage:**
- Automatically applied to all `h1`, `h2`, `h3`, `h4`, `h5`, `h6` elements
- Available as Tailwind class: `font-title`
- Available as CSS variable: `var(--font-title)`

**Styling:**
- Font: Shrikhand (cursive display font)
- Color: `#081b47` (dark navy blue - not pure black)
- Weight: 400 (Regular)
- Line height: 1.2
- Letter spacing: 0.5px

**Example:**
```svelte
<h1>This uses Shrikhand automatically with navy color</h1>
<p class="font-title text-title">Custom text with Shrikhand + navy color</p>
<p class="text-brand-navy-500">Navy text without title font</p>
```

### Adding More Fonts

To add more custom fonts:
1. Add font files to `libs/hominio-brand/src/assets/fonts/YourFont/`
2. Add `@font-face` declaration to `libs/hominio-brand/src/app.css`
3. Fonts automatically sync to all services! ✨

## Icons, Images, etc.

This same pattern works for:
- Custom fonts (`.woff`, `.woff2`, `.ttf`)
- Icons/images (`.svg`, `.png`, `.jpg`)
- Favicons (`favicon.ico`)
- Any other static assets

Just add them to `libs/hominio-brand/src/assets/` (with subfolders for organization) and they'll sync automatically! 🚀

## NavPill Component

The centralized NavPill component provides:

**When authenticated:**
- Logo (left) - clickable to go home
- Voice Call Button (center) - start/stop calls
- User Avatar (right) - clickable to sign out

**When not authenticated:**
- Google Sign-in Button

**Props:**
```typescript
{
  onHome: () => void;
  onSignOut?: () => void;
  onGoogleSignIn: () => void;
  isAuthenticated: boolean;
  signingOut?: boolean;
  user?: { name: string; image?: string };
  isCallActive?: boolean;
  isConnecting?: boolean;
  isWaitingForPermission?: boolean;
  onStartCall?: () => Promise<void>;
  onStopCall?: () => Promise<void>;
}
```

**Usage:**
```svelte
<script>
  import { NavPill } from '@hominio/brand';
  
  // Define handlers...
</script>

<NavPill 
  onHome={handleHome}
  onSignOut={handleSignOut}
  onGoogleSignIn={handleSignIn}
  isAuthenticated={isAuth}
  user={currentUser}
  isCallActive={callActive}
  onStartCall={startCall}
  onStopCall={stopCall}
/>
```

## Footer & Legal Pages

The brand package now includes:

**Footer Component:**
```svelte
import { Footer } from '@hominio/brand';
```

**Legal Pages:**
- Privacy Policy: `@hominio/brand/legal/privacy-policy`
- Legal Notice: `@hominio/brand/legal/legal-notice`
- Social Media Policy: `@hominio/brand/legal/social-media-privacy-policy`

These can be imported and used in SvelteKit routes as needed.

