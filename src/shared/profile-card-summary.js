function normalizeEnvironmentType(value) {
    return String(value || '').trim().toLowerCase() === 'disposable'
        ? 'disposable'
        : 'persistent';
}

function buildProfileCardSummary(profile = {}) {
    const environmentType = normalizeEnvironmentType(profile.environmentType);
    const environmentLabelKey = environmentType === 'disposable'
        ? 'environmentTypeDisposable'
        : 'environmentTypePersistent';

    const country = String(profile?.network?.country || '').trim().toUpperCase();
    const region = String(profile?.network?.region || '').trim().toLowerCase();
    const locationKnown = !!country || !!region;
    const locationLabel = locationKnown
        ? `${country || '??'} / ${region || 'unknown'}`
        : 'Net ?';

    return {
        environmentType,
        environmentLabelKey,
        locationKnown,
        locationLabel
    };
}

module.exports = {
    buildProfileCardSummary
};
