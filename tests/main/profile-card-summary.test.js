const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildProfileCardSummary
} = require('../../src/shared/profile-card-summary');

test('buildProfileCardSummary returns persistent environment metadata and explicit network label', () => {
    const summary = buildProfileCardSummary({
        environmentType: 'persistent',
        network: {
            country: 'JP',
            region: 'asia'
        }
    });

    assert.equal(summary.environmentType, 'persistent');
    assert.equal(summary.environmentLabelKey, 'environmentTypePersistent');
    assert.equal(summary.locationLabel, 'JP / asia');
    assert.equal(summary.locationKnown, true);
});

test('buildProfileCardSummary returns disposable environment metadata', () => {
    const summary = buildProfileCardSummary({
        environmentType: 'disposable',
        network: {
            country: 'US',
            region: 'america'
        }
    });

    assert.equal(summary.environmentType, 'disposable');
    assert.equal(summary.environmentLabelKey, 'environmentTypeDisposable');
    assert.equal(summary.locationLabel, 'US / america');
});

test('buildProfileCardSummary falls back to persistent and unknown network when metadata is missing', () => {
    const summary = buildProfileCardSummary({});

    assert.equal(summary.environmentType, 'persistent');
    assert.equal(summary.environmentLabelKey, 'environmentTypePersistent');
    assert.equal(summary.locationLabel, 'Net ?');
    assert.equal(summary.locationKnown, false);
});
