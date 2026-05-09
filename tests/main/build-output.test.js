const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function runBuild() {
    execSync('npm run build', {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe',
        shell: true
    });
}

test('build output does not contain unresolved local helper requires', () => {
    runBuild();

    const repoRoot = path.resolve(__dirname, '../..');
    const expectedBuildFiles = [
        'out/main/api-http.js',
        'out/main/path-safety.js',
        'out/main/launch-security.js',
        'out/main/profile-identity.js'
    ];

    for (const filePath of expectedBuildFiles) {
        assert.equal(
            fs.existsSync(path.join(repoRoot, filePath)),
            true,
            `expected build artifact missing: ${filePath}`
        );
    }

    const preloadBundle = fs.readFileSync(path.join(repoRoot, 'out/preload/index.js'), 'utf8');
    assert.equal(preloadBundle.includes('./ipc-contract'), false, 'preload bundle should be self-contained and not require local helper modules at runtime');
});
