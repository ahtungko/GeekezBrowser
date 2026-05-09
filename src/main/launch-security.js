const FORBIDDEN_CUSTOM_ARG_PREFIXES = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--user-data-dir',
    '--user-data-dir=',
    '--proxy-server',
    '--proxy-server=',
    '--no-proxy-server',
    '--remote-debugging-port',
    '--remote-debugging-port=',
    '--remote-debugging-address',
    '--remote-debugging-address=',
    '--lang',
    '--lang=',
    '--accept-lang',
    '--accept-lang=',
    '--disable-extensions-except',
    '--disable-extensions-except=',
    '--load-extension',
    '--load-extension='
];

const FORBIDDEN_DISABLE_FEATURES = new Set([
    'isolateorigins',
    'site-per-process',
    'siteperprocess',
    'disablesiteisolationtrials'
]);

function buildSafeDisabledFeatures({ platform = process.platform } = {}) {
    const disabledFeatures = [
        'ExtensionsMenuAccessControl',
        'WebGPU'
    ];

    if (platform === 'win32') {
        disabledFeatures.push('StartupLaunch', 'StartupBoost');
    }

    return disabledFeatures;
}

function buildManagedLaunchArgs({
    userDataDir,
    windowWidth = 1280,
    windowHeight = 800,
    extPaths = '',
    shouldRestoreSession = false,
    localPort = null,
    userAgent = '',
    targetLang = '',
    remoteDebugPort = null,
    platform = process.platform
} = {}) {
    const disabledFeatures = buildSafeDisabledFeatures({ platform });
    const launchArgs = [
        `--user-data-dir=${userDataDir}`,
        `--window-size=${windowWidth},${windowHeight}`,
        '--disable-blink-features=AutomationControlled',
        `--disable-features=${disabledFeatures.join(',')}`,
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        `--disable-extensions-except=${extPaths}`,
        `--load-extension=${extPaths}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-session-crashed-bubble',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-dev-shm-usage',
        '--disk-cache-size=52428800',
        '--media-cache-size=52428800'
    ];

    if (shouldRestoreSession) {
        launchArgs.push('--restore-last-session');
    }

    if (localPort) {
        launchArgs.unshift(`--proxy-server=socks5://127.0.0.1:${localPort}`);
    } else {
        launchArgs.unshift('--no-proxy-server');
    }

    if (userAgent) {
        launchArgs.push(`--user-agent=${userAgent}`);
    }

    if (targetLang) {
        launchArgs.push(`--lang=${targetLang}`);
        launchArgs.push(`--accept-lang=${targetLang}`);
    }

    if (remoteDebugPort) {
        launchArgs.push('--remote-debugging-address=127.0.0.1');
        launchArgs.push(`--remote-debugging-port=${remoteDebugPort}`);
    }

    return launchArgs;
}

function splitCustomArgs(rawArgs = '') {
    return String(rawArgs || '')
        .split(/[\n\s]+/)
        .map((arg) => arg.trim())
        .filter((arg) => arg && arg.startsWith('--'));
}

function findDisableFeaturesViolations(arg) {
    if (!arg.toLowerCase().startsWith('--disable-features=')) return [];
    const [, values = ''] = arg.split('=', 2);
    return values
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => FORBIDDEN_DISABLE_FEATURES.has(item.replace(/[^a-z-]/gi, '').toLowerCase()));
}

function sanitizeCustomLaunchArgs(rawArgs = '') {
    const allowedArgs = [];
    const blockedArgs = [];

    for (const arg of splitCustomArgs(rawArgs)) {
        const normalized = arg.toLowerCase();

        const forbiddenPrefix = FORBIDDEN_CUSTOM_ARG_PREFIXES.find((prefix) => normalized.startsWith(prefix));
        if (forbiddenPrefix) {
            blockedArgs.push({ arg, reason: 'Managed by browser security policy' });
            continue;
        }

        const disableFeatureViolations = findDisableFeaturesViolations(arg);
        if (disableFeatureViolations.length > 0) {
            blockedArgs.push({ arg, reason: 'Blocked because it would disable site isolation or other managed security features' });
            continue;
        }

        allowedArgs.push(arg);
    }

    return { allowedArgs, blockedArgs };
}

module.exports = {
    buildManagedLaunchArgs,
    buildSafeDisabledFeatures,
    sanitizeCustomLaunchArgs
};
