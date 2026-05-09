import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { profileService } from '../services/profile.service';

export const useProfileStore = defineStore('profile', () => {
    // State
    const profiles = ref([]);
    const runningIds = ref([]);
    const searchText = ref('');
    const selectedTag = ref('');
    const selectedIds = ref([]);
    const viewMode = ref(localStorage.getItem('geekez_view') || 'list');

    const callDirect = async (methodName, fallback) => {
        if (window.electronAPI && typeof window.electronAPI[methodName] === 'function') {
            return await window.electronAPI[methodName](...(Array.isArray(fallback?.args) ? fallback.args : []));
        }
        return await fallback.fn();
    };

    // Actions
    const loadProfiles = async ({ strict = false } = {}) => {
        try {
            const nextProfiles = await callDirect('getProfiles', {
                fn: () => profileService.loadProfiles()
            });
            if (!Array.isArray(nextProfiles)) {
                throw new Error(`Expected profiles array from get-profiles, received ${nextProfiles === null ? 'null' : typeof nextProfiles}`);
            }

            const nextRunningIds = await callDirect('getRunningIds', {
                fn: () => profileService.getRunningIds()
            });
            if (!Array.isArray(nextRunningIds)) {
                throw new Error(`Expected running id array from get-running-ids, received ${nextRunningIds === null ? 'null' : typeof nextRunningIds}`);
            }

            profiles.value = nextProfiles;
            runningIds.value = nextRunningIds;
            const profileIdSet = new Set(profiles.value.map(p => p.id));
            selectedIds.value = selectedIds.value.filter(id => profileIdSet.has(id));
        } catch (e) {
            console.error('Failed to load profiles:', e);
            if (strict) throw e;
        }
    };

    const toggleViewMode = () => {
        viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
        localStorage.setItem('geekez_view', viewMode.value);
    };

    const setSearchText = (text) => {
        searchText.value = text;
    };

    const setSelectedTag = (tag) => {
        selectedTag.value = tag || '';
    };

    // Getters
    const filteredProfiles = computed(() => {
        let next = profiles.value;
        if (selectedTag.value) {
            next = next.filter(profile => (profile.tags || []).includes(selectedTag.value));
        }
        if (!searchText.value) return next;
        const text = searchText.value.toLowerCase();
        return next.filter(p => {
            return (p.name || '').toLowerCase().includes(text) ||
                (p.proxyStr && p.proxyStr.toLowerCase().includes(text)) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(text)));
        });
    });

    const availableTags = computed(() => {
        const tagSet = new Set();
        profiles.value.forEach(profile => {
            (profile.tags || []).forEach(tag => {
                if (tag) tagSet.add(tag);
            });
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    });

    const selectedCount = computed(() => selectedIds.value.length);

    const isSelected = (id) => selectedIds.value.includes(id);

    const toggleSelected = (id, forceValue = null) => {
        const has = selectedIds.value.includes(id);
        const shouldSelect = forceValue === null ? !has : !!forceValue;
        if (shouldSelect && !has) selectedIds.value.push(id);
        if (!shouldSelect && has) selectedIds.value = selectedIds.value.filter(item => item !== id);
    };

    const clearSelection = () => {
        selectedIds.value = [];
    };

    const toggleSelectAllFiltered = () => {
        const filteredIds = filteredProfiles.value.map(profile => profile.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.value.includes(id));
        if (allSelected) {
            selectedIds.value = selectedIds.value.filter(id => !filteredIds.includes(id));
            return;
        }
        const next = new Set(selectedIds.value);
        filteredIds.forEach(id => next.add(id));
        selectedIds.value = Array.from(next);
    };

    const isRunning = (id) => runningIds.value.includes(id);

    const createProfile = async (data) => {
        try {
            await callDirect('saveProfile', {
                args: [data],
                fn: () => profileService.saveProfile(data)
            });
            await loadProfiles({ strict: true });
        } catch (e) {
            console.error('Failed to create profile:', e);
            throw e;
        }
    };

    const updateProfile = async (profile) => {
        try {
            await callDirect('updateProfile', {
                args: [profile],
                fn: () => profileService.updateProfile(profile)
            });
            await loadProfiles({ strict: true });
        } catch (e) {
            console.error('Failed to update profile:', e);
            throw e;
        }
    };

    const deleteProfile = async (id) => {
        try {
            await callDirect('deleteProfile', {
                args: [id],
                fn: () => profileService.deleteProfile(id)
            });
            await loadProfiles({ strict: true });
        } catch (e) {
            console.error('Failed to delete profile:', e);
            throw e;
        }
    };

    return {
        profiles,
        runningIds,
        searchText,
        selectedTag,
        selectedIds,
        viewMode,
        loadProfiles,
        toggleViewMode,
        setSearchText,
        setSelectedTag,
        filteredProfiles,
        availableTags,
        selectedCount,
        isSelected,
        toggleSelected,
        clearSelection,
        toggleSelectAllFiltered,
        isRunning,
        createProfile,
        updateProfile,
        deleteProfile
    };
});
