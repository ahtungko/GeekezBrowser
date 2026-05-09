const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ALLOWED_EVENT_CHANNELS,
    ALLOWED_INVOKE_CHANNELS,
    assertAllowedEventChannel,
    assertAllowedInvokeChannel,
    isAllowedEventChannel,
    isAllowedInvokeChannel
} = require('../../src/shared/ipc-contract');

test('allowed invoke channels include the renderer channels used by current services', () => {
    for (const channel of [
        'get-profiles',
        'launch-profile',
        'get-running-ids',
        'get-settings',
        'save-settings',
        'start-api-server',
        'stop-api-server',
        'get-api-status',
        'reset-api-token',
        'fetch-url',
        'open-url',
        'download-xray-update',
        'import-full-backup'
    ]) {
        assert.equal(isAllowedInvokeChannel(channel), true, `expected ${channel} to be allowed`);
        assert.equal(assertAllowedInvokeChannel(channel), channel);
    }
});

test('disallowed invoke channels are rejected with a clear error', () => {
    assert.equal(isAllowedInvokeChannel('totally-made-up-channel'), false);
    assert.throws(
        () => assertAllowedInvokeChannel('totally-made-up-channel'),
        /blocked ipc invoke channel/i
    );
});

test('allowed event channels are explicitly listed', () => {
    for (const channel of [
        'profile-status',
        'refresh-profiles',
        'api-launch-profile',
        'extension-install-progress'
    ]) {
        assert.equal(isAllowedEventChannel(channel), true);
        assert.equal(assertAllowedEventChannel(channel), channel);
    }
});

test('unexpected event channels are blocked', () => {
    assert.equal(ALLOWED_EVENT_CHANNELS.has('evil-event'), false);
    assert.throws(
        () => assertAllowedEventChannel('evil-event'),
        /blocked ipc event channel/i
    );
});

test('allowlists stay as sets so membership checks are O(1)', () => {
    assert.ok(ALLOWED_INVOKE_CHANNELS instanceof Set);
    assert.ok(ALLOWED_EVENT_CHANNELS instanceof Set);
});
