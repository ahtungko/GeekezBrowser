const test = require('node:test');
const assert = require('node:assert/strict');

function createStoreHarness({ saveOk = true, updateOk = true, deleteOk = true, loadError = null, loadResult = [{ id: 'p1', name: 'Profile 1' }], runningIdsResult = ['p1'] } = {}) {
    const state = {
        profiles: [],
        runningIds: [],
        selectedIds: ['ghost']
    };

    const profileService = {
        async loadProfiles() {
            if (loadError) throw loadError;
            return loadResult;
        },
        async getRunningIds() {
            return runningIdsResult;
        },
        async saveProfile() {
            if (!saveOk) throw new Error('save failed');
            return true;
        },
        async updateProfile() {
            if (!updateOk) throw new Error('update failed');
            return true;
        },
        async deleteProfile() {
            if (!deleteOk) throw new Error('delete failed');
            return true;
        }
    };

    const loadProfiles = async ({ strict = false } = {}) => {
        try {
            const profilesResult = await profileService.loadProfiles();
            if (!Array.isArray(profilesResult)) {
                throw new Error(`Expected profiles array from get-profiles, received ${profilesResult === null ? 'null' : typeof profilesResult}`);
            }

            const runningIdsResultValue = await profileService.getRunningIds();
            if (!Array.isArray(runningIdsResultValue)) {
                throw new Error(`Expected running id array from get-running-ids, received ${runningIdsResultValue === null ? 'null' : typeof runningIdsResultValue}`);
            }

            state.profiles = profilesResult;
            state.runningIds = runningIdsResultValue;
            const profileIdSet = new Set(state.profiles.map((p) => p.id));
            state.selectedIds = state.selectedIds.filter((id) => profileIdSet.has(id));
        } catch (error) {
            if (strict) throw error;
        }
    };

    const createProfile = async (payload) => {
        await profileService.saveProfile(payload);
        await loadProfiles({ strict: true });
    };

    return {
        state,
        loadProfiles,
        createProfile
    };
}

test('strict loadProfiles rethrows refresh failures for callers that need certainty', async () => {
    const harness = createStoreHarness({ loadError: new Error('refresh failed') });

    await assert.rejects(
        harness.loadProfiles({ strict: true }),
        /refresh failed/
    );
});

test('non-strict loadProfiles keeps legacy tolerant behavior', async () => {
    const harness = createStoreHarness({ loadError: new Error('refresh failed') });

    await assert.doesNotReject(harness.loadProfiles());
});

test('createProfile propagates refresh failures after save succeeds', async () => {
    const harness = createStoreHarness({ loadError: new Error('refresh failed after save') });

    await assert.rejects(
        harness.createProfile({ name: 'Profile X' }),
        /refresh failed after save/
    );
});

test('successful strict refresh trims stale selected ids', async () => {
    const harness = createStoreHarness();

    await harness.loadProfiles({ strict: true });

    assert.deepEqual(harness.state.profiles.map((p) => p.id), ['p1']);
    assert.deepEqual(harness.state.runningIds, ['p1']);
    assert.deepEqual(harness.state.selectedIds, []);
});

test('strict loadProfiles rejects non-array profile payloads with a clear message', async () => {
    const harness = createStoreHarness({ loadResult: null });

    await assert.rejects(
        harness.loadProfiles({ strict: true }),
        /expected profiles array from get-profiles, received null/i
    );
});
