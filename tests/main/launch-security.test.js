const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildManagedLaunchArgs,
    sanitizeCustomLaunchArgs
} = require('../../src/main/launch-security');

test('buildManagedLaunchArgs keeps sandbox and site isolation enabled', () => {
    const args = buildManagedLaunchArgs({
        userDataDir: '/tmp/profile',
        windowWidth: 1280,
        windowHeight: 800,
        extPaths: '/tmp/ext',
        shouldRestoreSession: false,
        localPort: 1080,
        userAgent: 'UA',
        targetLang: 'en-US',
        remoteDebugPort: 9222,
        platform: 'win32'
    });

    assert.equal(args.includes('--no-sandbox'), false);
    assert.equal(args.includes('--disable-setuid-sandbox'), false);

    const disableFeaturesArg = args.find((arg) => arg.startsWith('--disable-features='));
    assert.ok(disableFeaturesArg, 'expected managed disabled features flag');
    assert.equal(/IsolateOrigins/i.test(disableFeaturesArg), false);
    assert.equal(/site-per-process/i.test(disableFeaturesArg), false);

    assert.ok(args.includes('--remote-debugging-address=127.0.0.1'));
    assert.ok(args.includes('--remote-debugging-port=9222'));
});

test('sanitizeCustomLaunchArgs blocks dangerous sandbox and override flags', () => {
    const result = sanitizeCustomLaunchArgs(`
      --start-maximized
      --no-sandbox
      --disable-setuid-sandbox
      --proxy-server=socks5://1.2.3.4:1080
      --user-data-dir=/tmp/hijack
      --remote-debugging-port=9333
    `);

    assert.deepEqual(result.allowedArgs, ['--start-maximized']);
    assert.deepEqual(
        result.blockedArgs.map((item) => item.arg),
        [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--proxy-server=socks5://1.2.3.4:1080',
            '--user-data-dir=/tmp/hijack',
            '--remote-debugging-port=9333'
        ]
    );
});

test('sanitizeCustomLaunchArgs blocks disable-features values that would break isolation', () => {
    const result = sanitizeCustomLaunchArgs('--disable-features=IsolateOrigins,site-per-process,OtherFeature');

    assert.deepEqual(result.allowedArgs, []);
    assert.equal(result.blockedArgs.length, 1);
    assert.match(result.blockedArgs[0].reason, /site isolation/i);
});

test('sanitizeCustomLaunchArgs keeps safe custom flags', () => {
    const result = sanitizeCustomLaunchArgs('--start-maximized --force-dark-mode --disable-features=WebGPU');

    assert.deepEqual(result.blockedArgs, []);
    assert.deepEqual(result.allowedArgs, [
        '--start-maximized',
        '--force-dark-mode',
        '--disable-features=WebGPU'
    ]);
});

test('sanitizeCustomLaunchArgs also blocks bare managed flags without inline values', () => {
    const result = sanitizeCustomLaunchArgs('--remote-debugging-port 9333 --lang en-US --proxy-server socks5://127.0.0.1:1080');

    assert.deepEqual(result.allowedArgs, []);
    assert.deepEqual(
        result.blockedArgs.map((item) => item.arg),
        ['--remote-debugging-port', '--lang', '--proxy-server']
    );
});
