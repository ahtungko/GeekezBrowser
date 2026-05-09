const COUNTRY_LANGUAGE_HINTS = {
    JP: ['ja'],
    US: ['en'],
    SG: ['en', 'zh', 'ms'],
    MY: ['ms', 'en', 'zh'],
    HK: ['zh', 'en'],
    TW: ['zh'],
    KR: ['ko'],
    DE: ['de'],
    FR: ['fr']
};

function normalizeLanguageRoot(language) {
    const value = String(language || '').trim().toLowerCase();
    if (!value || value === 'auto') return '';
    return value.split('-')[0];
}

function normalizeTimezoneRoot(timezone) {
    const value = String(timezone || '').trim();
    if (!value || value === 'Auto') return '';
    return value.split('/')[0];
}

function buildNetworkConsistencyWarnings({ profile, geoInfo } = {}) {
    if (!profile || !geoInfo) return [];

    const warnings = [];
    const fingerprint = profile.fingerprint || {};
    const environmentType = String(profile.environmentType || 'persistent').toLowerCase();
    const expectedTimezoneRoot = normalizeTimezoneRoot(geoInfo.timezone);
    const actualTimezoneRoot = normalizeTimezoneRoot(fingerprint.timezone);
    const languageRoot = normalizeLanguageRoot(fingerprint.language);
    const countryCode = String(geoInfo.countryCode || '').trim().toUpperCase();
    const expectedLanguageRoots = COUNTRY_LANGUAGE_HINTS[countryCode] || [];

    if (expectedTimezoneRoot && actualTimezoneRoot && expectedTimezoneRoot !== actualTimezoneRoot) {
        warnings.push(
            environmentType === 'disposable'
                ? `Disposable profile timezone (${fingerprint.timezone}) does not match proxy timezone (${geoInfo.timezone}).`
                : `Profile timezone (${fingerprint.timezone}) does not match proxy timezone (${geoInfo.timezone}).`
        );
    }

    if (languageRoot && expectedLanguageRoots.length > 0 && !expectedLanguageRoots.includes(languageRoot)) {
        warnings.push(
            environmentType === 'disposable'
                ? `Disposable profile language (${fingerprint.language}) looks unusual for proxy country ${countryCode}.`
                : `Profile language (${fingerprint.language}) looks unusual for proxy country ${countryCode}.`
        );
    }

    return warnings;
}

function buildNetworkConsistencySummary({ profile, geoInfo } = {}) {
    const warnings = buildNetworkConsistencyWarnings({ profile, geoInfo });
    if (warnings.length === 0) {
        return {
            level: 'ok',
            label: 'Aligned',
            warnings: []
        };
    }

    return {
        level: 'warn',
        label: warnings.length > 1 ? 'Multiple mismatches' : 'Mismatch',
        warnings
    };
}

module.exports = {
    buildNetworkConsistencySummary,
    buildNetworkConsistencyWarnings
};
