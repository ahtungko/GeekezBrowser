const ALLOWED_INVOKE_CHANNELS = new Set([
    'start-api-server',
    'stop-api-server',
    'get-api-status',
    'reset-api-token',
    'get-app-info',
    'check-updates',
    'get-proxy-remark',
    'fetch-url',
    'test-proxy-latency',
    'test-proxy-latency-batch',
    'set-title-bar-color',
    'check-app-update',
    'check-xray-update',
    'download-xray-update',
    'get-running-ids',
    'get-profiles',
    'update-profile',
    'save-profile',
    'delete-profile',
    'get-settings',
    'save-settings',
    'select-extension-folder',
    'select-extension-crx',
    'search-extension-store',
    'add-user-extension',
    'update-user-extension-scope',
    'remove-user-extension',
    'get-user-extensions',
    'open-url',
    'get-data-path-info',
    'select-data-directory',
    'set-data-directory',
    'reset-data-directory',
    'get-export-profiles',
    'export-selected-data',
    'select-save-full-backup',
    'export-full-backup',
    'get-import-progress',
    'select-backup-file',
    'import-full-backup',
    'import-data',
    'export-data',
    'launch-profile'
]);

const ALLOWED_EVENT_CHANNELS = new Set([
    'profile-status',
    'refresh-profiles',
    'api-launch-profile',
    'extension-install-progress'
]);

function normalizeChannel(channel) {
    return String(channel || '').trim();
}

function isAllowedInvokeChannel(channel) {
    return ALLOWED_INVOKE_CHANNELS.has(normalizeChannel(channel));
}

function assertAllowedInvokeChannel(channel) {
    const normalized = normalizeChannel(channel);
    if (!isAllowedInvokeChannel(normalized)) {
        throw new Error(`Blocked IPC invoke channel: ${normalized || '<empty>'}`);
    }
    return normalized;
}

function isAllowedEventChannel(channel) {
    return ALLOWED_EVENT_CHANNELS.has(normalizeChannel(channel));
}

function assertAllowedEventChannel(channel) {
    const normalized = normalizeChannel(channel);
    if (!isAllowedEventChannel(normalized)) {
        throw new Error(`Blocked IPC event channel: ${normalized || '<empty>'}`);
    }
    return normalized;
}

module.exports = {
    ALLOWED_EVENT_CHANNELS,
    ALLOWED_INVOKE_CHANNELS,
    assertAllowedEventChannel,
    assertAllowedInvokeChannel,
    isAllowedEventChannel,
    isAllowedInvokeChannel
};
