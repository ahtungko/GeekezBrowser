const test = require('node:test');
const assert = require('node:assert/strict');

const {
    deriveNetworkMetaFromGeoInfo,
    derivePersonaFingerprintOptions,
    mergeResolvedNetworkMeta,
    ensureProfileIdentityMeta,
    generatePersonaSeed,
    normalizeEnvironmentType,
    normalizeProfileIdentityList
} = require('../../src/main/profile-identity');

test('normalizeEnvironmentType falls back to persistent for unknown values', () => {
    assert.equal(normalizeEnvironmentType('persistent'), 'persistent');
    assert.equal(normalizeEnvironmentType('disposable'), 'disposable');
    assert.equal(normalizeEnvironmentType('weird-value'), 'persistent');
    assert.equal(normalizeEnvironmentType(''), 'persistent');
});

test('generatePersonaSeed creates a stable-length hex seed', () => {
    const seed = generatePersonaSeed();
    assert.match(seed, /^[A-Fa-f0-9]{32}$/);
});

test('ensureProfileIdentityMeta backfills environment type and persona seed', () => {
    const profile = ensureProfileIdentityMeta({
        id: 'p1',
        name: 'Profile 1'
    });

    assert.equal(profile.environmentType, 'persistent');
    assert.match(profile.personaSeed, /^[A-Fa-f0-9]{32}$/);
});

test('ensureProfileIdentityMeta preserves explicit identity metadata', () => {
    const profile = ensureProfileIdentityMeta({
        id: 'p2',
        name: 'Profile 2',
        environmentType: 'disposable',
        personaSeed: 'abcdabcdabcdabcdabcdabcdabcdabcd'
    });

    assert.equal(profile.environmentType, 'disposable');
    assert.equal(profile.personaSeed, 'abcdabcdabcdabcdabcdabcdabcdabcd');
});

test('normalizeProfileIdentityList updates every profile entry', () => {
    const profiles = normalizeProfileIdentityList([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B', environmentType: 'disposable', personaSeed: '12341234123412341234123412341234' }
    ]);

    assert.equal(profiles.length, 2);
    assert.equal(profiles[0].environmentType, 'persistent');
    assert.match(profiles[0].personaSeed, /^[A-Fa-f0-9]{32}$/);
    assert.equal(profiles[1].environmentType, 'disposable');
    assert.equal(profiles[1].personaSeed, '12341234123412341234123412341234');
    assert.deepEqual(profiles[0].network, { country: '', region: '' });
    assert.deepEqual(profiles[1].network, { country: '', region: '' });
});

test('derivePersonaFingerprintOptions is deterministic for the same persona seed', () => {
    const input = {
        personaSeed: 'abcdabcdabcdabcdabcdabcdabcdabcd',
        platform: 'Win32'
    };

    const first = derivePersonaFingerprintOptions(input);
    const second = derivePersonaFingerprintOptions(input);

    assert.deepEqual(first, second);
    assert.ok(first.browserType);
    assert.ok(first.browserMajorVersion);
    assert.ok(first.webglProfile);
    assert.ok(first.screen);
    assert.ok(first.noiseSeed);
});

test('derivePersonaFingerprintOptions preserves explicit fingerprint choices', () => {
    const derived = derivePersonaFingerprintOptions({
        personaSeed: 'abcdabcdabcdabcdabcdabcdabcdabcd',
        platform: 'MacIntel',
        browserType: 'edge',
        browserMajorVersion: 145,
        hardwareConcurrency: 16,
        deviceMemory: 8,
        webglProfile: 'mac_apple_m2',
        screen: { width: 1440, height: 900 }
    });

    assert.equal(derived.browserType, 'edge');
    assert.equal(derived.browserMajorVersion, 145);
    assert.equal(derived.hardwareConcurrency, 16);
    assert.equal(derived.deviceMemory, 8);
    assert.equal(derived.webglProfile, 'mac_apple_m2');
    assert.deepEqual(derived.screen, { width: 1440, height: 900 });
});

test('ensureProfileIdentityMeta preserves explicit network metadata', () => {
    const profile = ensureProfileIdentityMeta({
        id: 'p3',
        name: 'Profile 3',
        network: {
            country: 'JP',
            region: 'asia'
        }
    });

    assert.deepEqual(profile.network, {
        country: 'JP',
        region: 'asia'
    });
});

test('deriveNetworkMetaFromGeoInfo maps country and region from resolved geo data', () => {
    const network = deriveNetworkMetaFromGeoInfo({
        countryCode: 'jp',
        timezone: 'Asia/Tokyo'
    });

    assert.deepEqual(network, {
        country: 'JP',
        region: 'asia'
    });
});

test('mergeResolvedNetworkMeta backfills empty network metadata only', () => {
    const merged = mergeResolvedNetworkMeta({
        network: { country: '', region: '' }
    }, {
        countryCode: 'SG',
        timezone: 'Asia/Singapore'
    });

    assert.deepEqual(merged.network, {
        country: 'SG',
        region: 'asia'
    });
});

test('mergeResolvedNetworkMeta does not overwrite explicit network metadata', () => {
    const merged = mergeResolvedNetworkMeta({
        network: { country: 'JP', region: 'asia' }
    }, {
        countryCode: 'US',
        timezone: 'America/Los_Angeles'
    });

    assert.deepEqual(merged.network, {
        country: 'JP',
        region: 'asia'
    });
});
