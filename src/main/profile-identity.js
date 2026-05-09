const crypto = require('node:crypto');
const os = require('node:os');

const VALID_ENVIRONMENT_TYPES = new Set(['persistent', 'disposable']);
const PERSONA_BROWSER_TYPES = ['chrome', 'edge'];
const PERSONA_BROWSER_MAJORS = Array.from({ length: 19 }, (_, i) => 129 + i);
const PERSONA_RESOLUTIONS = [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
];
const PERSONA_WEBGL_PROFILE_IDS = {
    windows: [
        'win_intel_uhd_620',
        'win_intel_uhd_630',
        'win_intel_iris_xe',
        'win_nvidia_gtx_1050',
        'win_nvidia_gtx_1660',
        'win_nvidia_rtx_2060',
        'win_nvidia_rtx_3060',
        'win_amd_rx_580',
        'win_amd_rx_6600',
        'win_amd_vega_8'
    ],
    mac: [
        'mac_apple_m1',
        'mac_apple_m2',
        'mac_apple_m3',
        'mac_intel_iris',
        'mac_amd_pro_560x'
    ],
    linux: [
        'linux_mesa_intel_620',
        'linux_mesa_intel_xe',
        'linux_nvidia_1650',
        'linux_nvidia_3060',
        'linux_mesa_amd_6600'
    ]
};

function normalizeEnvironmentType(value, fallback = 'persistent') {
    const normalized = String(value || '').trim().toLowerCase();
    if (VALID_ENVIRONMENT_TYPES.has(normalized)) {
        return normalized;
    }

    return VALID_ENVIRONMENT_TYPES.has(String(fallback || '').trim().toLowerCase())
        ? String(fallback).trim().toLowerCase()
        : 'persistent';
}

function generatePersonaSeed() {
    return crypto.randomBytes(16).toString('hex');
}

function normalizeNetworkMeta(network = {}) {
    return {
        country: String(network?.country || '').trim().toUpperCase(),
        region: String(network?.region || '').trim().toLowerCase()
    };
}

function deriveNetworkMetaFromGeoInfo(geoInfo = {}) {
    const country = String(geoInfo?.countryCode || '').trim().toUpperCase();
    const timezone = String(geoInfo?.timezone || '').trim();
    const region = timezone ? timezone.split('/')[0].toLowerCase() : '';
    return normalizeNetworkMeta({ country, region });
}

function mergeResolvedNetworkMeta(profile = {}, geoInfo = null) {
    const next = ensureProfileIdentityMeta(profile);
    if (!geoInfo) return next;

    const resolved = deriveNetworkMetaFromGeoInfo(geoInfo);
    next.network = {
        country: next.network.country || resolved.country,
        region: next.network.region || resolved.region
    };

    return next;
}

function hashSeed(personaSeed, slot = 'default') {
    const seed = String(personaSeed || '').trim();
    const digest = crypto.createHash('sha256').update(`${seed}:${slot}`).digest();
    return digest.readUInt32BE(0);
}

function pickStable(personaSeed, slot, values = []) {
    if (!Array.isArray(values) || values.length === 0) return undefined;
    return values[hashSeed(personaSeed, slot) % values.length];
}

function pickStableInt(personaSeed, slot, min, max) {
    const span = Math.max(0, Number(max) - Number(min));
    return Number(min) + (hashSeed(personaSeed, slot) % (span + 1));
}

function inferRuntimePlatform(platformValue) {
    if (platformValue === 'Win32') return 'windows';
    if (platformValue === 'MacIntel') return 'mac';
    if (platformValue === 'Linux x86_64') return 'linux';

    const runtime = os.platform();
    if (runtime === 'win32') return 'windows';
    if (runtime === 'darwin') return 'mac';
    return 'linux';
}

function derivePersonaFingerprintOptions(options = {}) {
    const next = { ...(options || {}) };
    const personaSeed = typeof next.personaSeed === 'string' ? next.personaSeed.trim() : '';
    if (!personaSeed) return next;

    const runtimePlatform = inferRuntimePlatform(next.platform);
    const selectedBrowserType = next.browserType || pickStable(personaSeed, 'browserType', PERSONA_BROWSER_TYPES);
    const selectedBrowserMajor = next.browserMajorVersion || pickStable(personaSeed, 'browserMajorVersion', PERSONA_BROWSER_MAJORS);

    if (!next.browserType) next.browserType = selectedBrowserType;
    if (!next.browserMajorVersion) next.browserMajorVersion = selectedBrowserMajor;
    if (!next.browserFullVersion && selectedBrowserMajor) {
        next.browserFullVersion = `${selectedBrowserMajor}.0.0.0`;
    }

    if (!next.hardwareConcurrency) {
        next.hardwareConcurrency = pickStable(personaSeed, 'hardwareConcurrency', [4, 8, 12, 16]);
    }
    if (!next.deviceMemory) {
        next.deviceMemory = pickStable(personaSeed, 'deviceMemory', [2, 4, 8, 16]);
    }
    if (!next.noiseSeed) {
        next.noiseSeed = pickStableInt(personaSeed, 'noiseSeed', 1000, 9999999);
    }
    if (typeof next.audioNoise !== 'number') {
        next.audioNoise = hashSeed(personaSeed, 'audioNoise') / 0xffffffff / 1000000;
    }
    if (!next.canvasNoise) {
        next.canvasNoise = {
            r: pickStableInt(personaSeed, 'canvasNoise:r', -5, 5),
            g: pickStableInt(personaSeed, 'canvasNoise:g', -5, 5),
            b: pickStableInt(personaSeed, 'canvasNoise:b', -5, 5),
            a: pickStableInt(personaSeed, 'canvasNoise:a', -5, 5)
        };
    }
    if (!next.screen && !next.resW && !next.resH) {
        const selectedResolution = pickStable(personaSeed, 'screen', PERSONA_RESOLUTIONS);
        if (selectedResolution) {
            next.screen = { ...selectedResolution };
        }
    }
    if (!next.webgl && !next.webglProfile) {
        const webglProfiles = PERSONA_WEBGL_PROFILE_IDS[runtimePlatform] || PERSONA_WEBGL_PROFILE_IDS.windows;
        next.webglProfile = pickStable(personaSeed, 'webglProfile', webglProfiles);
    }

    return next;
}

function ensureProfileIdentityMeta(profile = {}) {
    const next = { ...(profile || {}) };
    next.environmentType = normalizeEnvironmentType(next.environmentType, 'persistent');

    const existingSeed = typeof next.personaSeed === 'string' ? next.personaSeed.trim() : '';
    next.personaSeed = existingSeed || generatePersonaSeed();
    next.network = normalizeNetworkMeta(next.network);

    return next;
}

function normalizeProfileIdentityList(profiles = []) {
    return (Array.isArray(profiles) ? profiles : []).map((profile) => ensureProfileIdentityMeta(profile));
}

module.exports = {
    derivePersonaFingerprintOptions,
    deriveNetworkMetaFromGeoInfo,
    ensureProfileIdentityMeta,
    generatePersonaSeed,
    mergeResolvedNetworkMeta,
    normalizeNetworkMeta,
    normalizeEnvironmentType,
    normalizeProfileIdentityList,
    VALID_ENVIRONMENT_TYPES
};
