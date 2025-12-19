const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version from git tag, environment variable, or generate one
function getVersion() {
  // 1. Check for VERSION environment variable (set by CI)
  if (process.env.VERSION) {
    const version = process.env.VERSION.replace(/^v/, '');
    console.log(`Using version from VERSION env: ${version}`);
    return version;
  }

  // 2. Try to get version from git tag
  try {
    const tag = execSync('git describe --tags --exact-match 2>/dev/null || git describe --tags 2>/dev/null', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    }).trim();

    if (tag) {
      const version = tag.replace(/^v/, '').split('-')[0];
      console.log(`Using version from git tag: ${version}`);
      return version;
    }
  } catch (e) {
    // No git tag found, fall through to generated version
  }

  // 3. Fallback: Generate version based on timestamp
  return generateTimestampVersion();
}

// Generate version: 1.yy.mmddhhiiss
function generateTimestampVersion() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const ii = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const version = `1.${yy}.${mm}${dd}${hh}${ii}${ss}`;
  console.log(`Using generated timestamp version: ${version}`);
  return version;
}

// Update package.json version
function updatePackageVersion(version) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const oldVersion = packageJson.version;
  packageJson.version = version;

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`Version updated: ${oldVersion} -> ${version}`);
  return version;
}

// Run build
function runBuild() {
  // In CI, only compile (electron-builder runs separately)
  const command = process.env.CI ? 'npm run compile' : 'npm run build';
  console.log(`Running ${command}...\n`);
  execSync(command, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
}

// Main
const version = getVersion();
console.log(`\nBuilding version: ${version}\n`);

updatePackageVersion(version);
runBuild();

console.log(`\nBuild completed: v${version}`);
