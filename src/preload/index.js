const { contextBridge, ipcRenderer } = require('electron');

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

function assertAllowedInvokeChannel(channel) {
    const normalized = normalizeChannel(channel);
    if (!ALLOWED_INVOKE_CHANNELS.has(normalized)) {
        throw new Error(`Blocked IPC invoke channel: ${normalized || '<empty>'}`);
    }
    return normalized;
}

function assertAllowedEventChannel(channel) {
    const normalized = normalizeChannel(channel);
    if (!ALLOWED_EVENT_CHANNELS.has(normalized)) {
        throw new Error(`Blocked IPC event channel: ${normalized || '<empty>'}`);
    }
    return normalized;
}

function safeInvoke(channel, ...args) {
    return ipcRenderer.invoke(assertAllowedInvokeChannel(channel), ...args);
}

function safeOn(channel, callback) {
    const allowedChannel = assertAllowedEventChannel(channel);
    ipcRenderer.on(allowedChannel, (event, ...args) => callback(event, ...args));
}

contextBridge.exposeInMainWorld('electronAPI', {
    getProfiles: () => safeInvoke('get-profiles'),
    saveProfile: (data) => safeInvoke('save-profile', data),
    updateProfile: (data) => safeInvoke('update-profile', data),
    deleteProfile: (id) => safeInvoke('delete-profile', id),
    launchProfile: (id, watermarkStyle) => safeInvoke('launch-profile', id, watermarkStyle),
    getSettings: () => safeInvoke('get-settings'),
    saveSettings: (data) => safeInvoke('save-settings', data),
    invoke: (channel, ...args) => safeInvoke(channel, ...args),
    on: (channel, callback) => safeOn(channel, callback),
    getRunningIds: () => safeInvoke('get-running-ids'),
    onProfileStatus: (callback) => safeOn('profile-status', (_event, data) => callback(data)),
    onRefreshProfiles: (callback) => safeOn('refresh-profiles', () => callback()),
    onApiLaunchProfile: (callback) => safeOn('api-launch-profile', (_event, id) => callback(id)),
    onExtensionInstallProgress: (callback) => safeOn('extension-install-progress', (_event, payload) => callback(payload))
});
