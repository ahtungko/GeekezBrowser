const { contextBridge, ipcRenderer } = require('electron');
const {
    assertAllowedEventChannel,
    assertAllowedInvokeChannel
} = require('../shared/ipc-contract');

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
