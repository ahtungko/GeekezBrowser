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

const COUNTRY_TIMEZONE_HINTS = {
    JP: 'Asia',
    US: 'America',
    SG: 'Asia',
    MY: 'Asia',
    HK: 'Asia',
    TW: 'Asia',
    KR: 'Asia',
    DE: 'Europe',
    FR: 'Europe'
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

function inferCountryCode(profile) {
    const explicitCountry = String(profile?.network?.country || '').trim().toUpperCase();
    if (explicitCountry && COUNTRY_LANGUAGE_HINTS[explicitCountry]) {
        return explicitCountry;
    }

    const text = [
        profile?.name,
        ...(Array.isArray(profile?.tags) ? profile.tags : []),
        profile?.proxyStr
    ].join(' ').toUpperCase();

    for (const code of Object.keys(COUNTRY_LANGUAGE_HINTS)) {
        if (text.includes(code)) return code;
    }

    return '';
}

export function buildProfileNetworkSummary(profile) {
    const countryCode = inferCountryCode(profile);
    if (!countryCode) {
        return { level: 'unknown', label: 'Geo ?' };
    }

    const fingerprint = profile?.fingerprint || {};
    const timezoneRoot = normalizeTimezoneRoot(fingerprint.timezone);
    const languageRoot = normalizeLanguageRoot(fingerprint.language);
    const expectedTimezoneRoot = COUNTRY_TIMEZONE_HINTS[countryCode] || '';
    const expectedLanguages = COUNTRY_LANGUAGE_HINTS[countryCode] || [];

    const warnings = [];
    if (expectedTimezoneRoot && timezoneRoot && expectedTimezoneRoot !== timezoneRoot) {
        warnings.push('tz');
    }
    if (expectedLanguages.length > 0 && languageRoot && !expectedLanguages.includes(languageRoot)) {
        warnings.push('lang');
    }

    if (warnings.length === 0) {
        return { level: 'ok', label: 'Geo OK' };
    }

    return {
        level: 'warn',
        label: warnings.includes('tz') && warnings.includes('lang')
            ? 'Geo TZ/Lang'
            : (warnings.includes('tz') ? 'Geo TZ' : 'Geo Lang')
    };
}
