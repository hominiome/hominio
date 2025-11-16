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

### Required Secrets (for TestFlight upload):

- `APPSTORE_CONNECT_API_KEY` - Contents of the downloaded `.p8` file (the entire file content)
- `APPSTORE_CONNECT_API_KEY_ID` - The Key ID (e.g., `ABC123DEF4`)
- `APPSTORE_CONNECT_ISSUER_ID` - The Issuer ID (e.g., `12345678-1234-1234-1234-123456789012`)
- `APPLE_DEVELOPMENT_TEAM` - Your Apple Developer Team ID (e.g., `2P6VCHVJWB`)

### Optional Secrets (for code signing - recommended for CI/CD):

If you want to avoid manual Apple ID authentication in CI, you can provide certificates and provisioning profiles:

#### Step 1: Create an Apple Distribution Certificate

1. **Open Keychain Access on your Mac:**
   - Open Keychain Access (Applications > Utilities > Keychain Access)

2. **Request a Certificate from a Certificate Authority:**
   - Go to Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority
   - Enter your email address (use the one associated with your Apple Developer account)
   - Enter a common name (e.g., "iOS Distribution")
   - Select "Saved to disk"
   - Click "Continue" and save the `.certSigningRequest` file

3. **Create the Certificate in Apple Developer Portal:**
   - Go to [Apple Developer Portal - Certificates](https://developer.apple.com/account/resources/certificates/list)
   - Click the **"+"** button
   - Select **"Apple Distribution"** under "Software"
   - Click "Continue"
   - Upload the `.certSigningRequest` file you just created
   - Click "Continue" and then "Register"
   - Download the certificate (`.cer` file)

4. **Install and Export the Certificate:**
   - Double-click the downloaded `.cer` file to install it in Keychain Access
   - In Keychain Access, find the certificate under "My Certificates"
   - Right-click the certificate → **"Export 'Apple Distribution: ...'"**
   - Choose format: **"Personal Information Exchange (.p12)"**
   - Set a password (remember this - you'll need it for `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`)
   - Save the `.p12` file

#### Step 2: Create an App Store Provisioning Profile

1. **Go to Apple Developer Portal:**
   - Go to [Apple Developer Portal - Profiles](https://developer.apple.com/account/resources/profiles/list)

2. **Create a New Profile:**
   - Click the **"+"** button
   - Under "Distribution", select **"App Store"**
   - Click "Continue"

3. **Select App ID:**
   - Select **"me.hominio.app"** (or create it if it doesn't exist)
   - Click "Continue"

4. **Select Certificate:**
   - Select the **"Apple Distribution"** certificate you just created
   - Click "Continue"

5. **Name and Download:**
   - Enter a profile name (e.g., "Hominio App Store")
   - Click "Generate"
   - Download the `.mobileprovision` file

#### Step 3: Encode and Add as GitHub Secrets

1. **Encode the Certificate (.p12):**
   ```bash
   # In Terminal, navigate to where you saved the .p12 file
   base64 -i YourCertificate.p12 | pbcopy
   ```
   - This copies the base64-encoded certificate to your clipboard
   - Go to GitHub → Settings → Secrets → Actions
   - Click "New repository secret"
   - Name: `IOS_DISTRIBUTION_CERTIFICATE`
   - Value: Paste the base64 string from clipboard
   - Click "Add secret"

2. **Encode the Provisioning Profile (.mobileprovision):**
   ```bash
   # In Terminal, navigate to where you saved the .mobileprovision file
   base64 -i YourProfile.mobileprovision | pbcopy
   ```
   - This copies the base64-encoded profile to your clipboard
   - Go to GitHub → Settings → Secrets → Actions
   - Click "New repository secret"
   - Name: `IOS_PROVISIONING_PROFILE`
   - Value: Paste the base64 string from clipboard
   - Click "Add secret"

3. **Add Certificate Password:**
   - Go to GitHub → Settings → Secrets → Actions
   - Click "New repository secret"
   - Name: `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`
   - Value: The password you set when exporting the `.p12` file
   - Click "Add secret"

**Note:** If you don't provide certificates/profiles, the workflow will try automatic signing, but this requires Xcode to be authenticated with an Apple ID (not available in CI). Providing certificates/profiles is the recommended approach for reliable CI/CD.

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
