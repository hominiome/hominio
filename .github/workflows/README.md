# GitHub Actions Workflows

## Required GitHub Secrets

To enable automatic iOS builds and TestFlight uploads, you need to add these secrets in your GitHub repository:

Go to: **Settings → Secrets and variables → Actions**

## App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Integration** tab → **App Store Connect-API**
3. **If you see "Zugriff anfordern" (Request Access):**
   - Click the button to request API access
   - Wait for approval (may take a few hours/days)
4. **Once approved, create a new key:**
   - Click **"+"** or **"Generate API Key"**
   - Name it (e.g., "GitHub Actions")
   - Select **App Manager** role
   - Click **Generate**
5. **Download immediately:**
   - Download the `.p8` file (you can only download it once!)
   - Note the **Key ID** (shown on the page)
   - Note the **Issuer ID** (shown at the top of the Keys page)

## Add to GitHub Secrets

Add these four secrets:

- `APPSTORE_CONNECT_API_KEY` - Contents of the downloaded `.p8` file (the entire file content)
- `APPSTORE_CONNECT_API_KEY_ID` - The Key ID (e.g., `ABC123DEF4`)
- `APPSTORE_CONNECT_ISSUER_ID` - The Issuer ID (e.g., `12345678-1234-1234-1234-123456789012`)
- `APPLE_DEVELOPMENT_TEAM` - Your Apple Developer Team ID (e.g., `2P6VCHVJWB`)

## Workflows

### 1. Release Workflow (`release.yml`)

**Triggers:** Push to `main` branch

**What it does:**


- Runs semantic-release
- Analyzes commits
- Bumps version
- Creates GitHub release with tag
- Generates CHANGELOG.md

### 2. iOS Release Workflow (`ios-release.yml`)

**Triggers:**

- When a GitHub release is created (automatically after semantic-release)
- Manual trigger via GitHub Actions UI

**What it does:**


- Builds frontend (SvelteKit)
- Builds iOS app (Tauri)
- Uploads IPA to TestFlight
- Saves IPA as artifact

## Complete Automated Flow

1. **Developer commits** with conventional format: `feat: new feature`
2. **Push to main**: `git push`
3. **Release workflow** runs:
   - Analyzes commits
   - Bumps version (e.g., 0.1.1 → 0.2.0)
   - Creates GitHub release
4. **iOS workflow** automatically triggers:
   - Builds iOS app
   - Uploads to TestFlight
5. **Done!** App appears in TestFlight automatically

## Manual Trigger

You can also manually trigger the iOS build:

1. Go to **Actions** tab in GitHub
2. Select **iOS Release to TestFlight**
3. Click **Run workflow**
4. Optionally specify a version
5. Click **Run workflow**

## Troubleshooting

### Build fails

- Check that `APPLE_DEVELOPMENT_TEAM` secret is set correctly
- Verify Xcode version compatibility
- Check Rust toolchain installation

### TestFlight upload fails

- Verify App Store Connect API key secrets are correct
- Check that the API key has App Manager permissions
- Ensure the bundle ID matches App Store Connect

### IPA not found

- Check build logs for errors
- Verify the build path: `src-tauri/gen/apple/build/*/hominio-app.ipa`
