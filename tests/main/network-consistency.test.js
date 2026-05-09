const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildNetworkConsistencySummary,
    buildNetworkConsistencyWarnings
} = require('../../src/main/network-consistency');

test('returns no warnings when profile locale matches proxy geo at a coarse level', () => {
    const warnings = buildNetworkConsistencyWarnings({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'Asia/Tokyo',
                language: 'ja-JP'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.deepEqual(warnings, []);
});

test('warns when persistent profile timezone conflicts with proxy country timezone family', () => {
    const warnings = buildNetworkConsistencyWarnings({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'America/Los_Angeles',
                language: 'ja-JP'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.equal(warnings.length >= 1, true);
    assert.match(warnings.join(' '), /timezone/i);
});

test('warns when persistent profile language mismatches proxy country expectation', () => {
    const warnings = buildNetworkConsistencyWarnings({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'Asia/Tokyo',
                language: 'en-US'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.equal(warnings.length >= 1, true);
    assert.match(warnings.join(' '), /language/i);
});

test('is lenient for disposable profiles and only emits soft warnings', () => {
    const warnings = buildNetworkConsistencyWarnings({
        profile: {
            environmentType: 'disposable',
            fingerprint: {
                timezone: 'America/Los_Angeles',
                language: 'en-US'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.equal(warnings.length >= 1, true);
    assert.match(warnings[0], /disposable/i);
});

test('returns no warnings when geo info is unavailable', () => {
    const warnings = buildNetworkConsistencyWarnings({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'Asia/Tokyo',
                language: 'ja-JP'
            }
        },
        geoInfo: null
    });

    assert.deepEqual(warnings, []);
});

test('buildNetworkConsistencySummary reports ok when no warnings are present', () => {
    const summary = buildNetworkConsistencySummary({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'Asia/Tokyo',
                language: 'ja-JP'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.equal(summary.level, 'ok');
    assert.equal(summary.label, 'Aligned');
    assert.deepEqual(summary.warnings, []);
});

test('buildNetworkConsistencySummary reports warn for persistent mismatches', () => {
    const summary = buildNetworkConsistencySummary({
        profile: {
            environmentType: 'persistent',
            fingerprint: {
                timezone: 'America/Los_Angeles',
                language: 'en-US'
            }
        },
        geoInfo: {
            countryCode: 'JP',
            timezone: 'Asia/Tokyo'
        }
    });

    assert.equal(summary.level, 'warn');
    assert.match(summary.label, /mismatch/i);
    assert.equal(summary.warnings.length >= 1, true);
});
