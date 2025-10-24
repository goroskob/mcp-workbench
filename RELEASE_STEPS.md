# Release Steps for MCP Workbench

## Current Status

✅ Git repository initialized
✅ Initial commit created by Hlib Koval
✅ Version tagged as v0.0.1
✅ GitHub Actions workflows configured

## Next Steps to Publish

### 1. Create GitHub Repository

Go to https://github.com/new and create a new repository:

- **Repository name**: `mcp-workbench`
- **Description**: "MCP server that aggregates other MCP tools and provides dynamic discovery through toolboxes"
- **Visibility**: Public (recommended for MCP ecosystem)
- **DO NOT** initialize with README, .gitignore, or license (we have these already)

### 2. Push to GitHub

After creating the repository, run these commands:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/mcp-workbench.git

# Push main branch
git push -u origin main

# Push tags (this will trigger the release workflow)
git push origin v0.0.1
```

### 3. Verify GitHub Actions

After pushing the tag, check:

1. Go to your repository → **Actions** tab
2. Verify "Release" workflow is running
3. It will:
   - Build the project
   - Create a GitHub release with release notes
   - Attach distribution archive (tar.gz)

### 4. Edit the GitHub Release (Optional)

Once the release is created automatically:

1. Go to **Releases** tab
2. Click **Edit** on v0.0.1
3. You can:
   - Add more details to the description
   - Mark as pre-release (recommended for 0.0.x)
   - Add badges or screenshots

### 5. Announce (Optional)

Consider announcing in:
- MCP Discord/community
- Your Twitter/social media
- Reddit r/LocalLLaMA or similar communities

## What the GitHub Actions Do

### Build Workflow (`.github/workflows/build.yml`)

Runs on every push to `main` and on pull requests:
- Tests Node.js 18, 20, and 22
- Installs dependencies
- Builds TypeScript
- Verifies output

### Release Workflow (`.github/workflows/release.yml`)

Runs when you push a tag starting with `v`:
- Builds the project
- Creates GitHub release with auto-generated notes
- Attaches documentation files
- Creates and uploads distribution archive

## Distribution Archive Contents

The release includes `mcp-workbench-v0.0.1.tar.gz` with:
- `dist/` - Compiled JavaScript
- `package.json` - For npm install
- `package-lock.json` - Locked dependencies
- `README.md` - User documentation

Users can install it by:
1. Downloading the tar.gz
2. Extracting it
3. Running `npm install`
4. Using `node dist/index.js` in their MCP config

## Future Releases

To create a new release:

1. Update version in `package.json`
2. Update version in `src/index.ts` and `src/client-manager.ts`
3. Rebuild: `npm run build`
4. Commit changes: `git commit -am "Bump version to x.y.z"`
5. Create tag: `git tag -a vx.y.z -m "Release message"`
6. Push: `git push && git push origin vx.y.z`

## Troubleshooting

### "Permission denied" when pushing

Make sure you have:
- Created the repository on GitHub first
- Added the correct remote URL
- Authentication set up (SSH key or Personal Access Token)

### GitHub Actions fail

Check:
- Node version compatibility (requires Node 18+)
- All dependencies in package.json are correct
- Build completes locally with `npm run build`

### Release not created

Verify:
- Tag pushed successfully: `git ls-remote --tags origin`
- Tag format is correct (must start with `v`)
- Repository has GitHub Actions enabled

## Contact

For issues or questions, open an issue on GitHub after the repository is published.
