const crypto = require('node:crypto');

const PUBLIC_API_MAX_BODY_BYTES = 64 * 1024 * 1024;
const INTERNAL_API_MAX_BODY_BYTES = 2 * 1024 * 1024;

function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.status = statusCode;
    error.statusCode = statusCode;
    return error;
}

function isLoopbackOrigin(origin) {
    if (!origin) return false;
    try {
        const parsed = new URL(origin);
        const hostname = String(parsed.hostname || '').toLowerCase();
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
            ? hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
            : false;
    } catch (error) {
        return false;
    }
}

function isExtensionOrigin(origin) {
    if (!origin) return false;
    try {
        const parsed = new URL(origin);
        return parsed.protocol === 'chrome-extension:';
    } catch (error) {
        return false;
    }
}

function isOriginAllowed(origin, { allowLoopbackOrigins = false, allowExtensionOrigins = false } = {}) {
    if (!origin) return false;
    if (allowLoopbackOrigins && isLoopbackOrigin(origin)) return true;
    if (allowExtensionOrigins && isExtensionOrigin(origin)) return true;
    return false;
}

function applyCorsHeaders(req, res, {
    allowLoopbackOrigins = false,
    allowExtensionOrigins = false,
    allowMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
} = {}) {
    const methods = Array.isArray(allowMethods) && allowMethods.length > 0
        ? allowMethods.join(', ')
        : 'GET, POST, PUT, DELETE, OPTIONS';
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Token');
    res.setHeader('Content-Type', 'application/json');

    const origin = req?.headers?.origin;
    if (isOriginAllowed(origin, { allowLoopbackOrigins, allowExtensionOrigins })) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
}

function generateApiToken() {
    return crypto.randomBytes(32).toString('hex');
}

function generateInternalApiToken() {
    return crypto.randomBytes(32).toString('hex');
}

function readApiTokenFromHeaders(headers = {}) {
    const authorization = typeof headers.authorization === 'string' ? headers.authorization.trim() : '';
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) return bearerMatch[1].trim();

    const headerToken = typeof headers['x-api-token'] === 'string' ? headers['x-api-token'].trim() : '';
    return headerToken || '';
}

function readInternalApiTokenFromHeaders(headers = {}) {
    const headerToken = typeof headers['x-internal-api-token'] === 'string'
        ? headers['x-internal-api-token'].trim()
        : '';
    return headerToken || '';
}

function ensurePublicApiAuthorized(req, expectedToken) {
    if (String(req?.method || '').toUpperCase() === 'OPTIONS') return;
    if (!expectedToken) throw createHttpError(500, 'Public API token is not configured');

    const providedToken = readApiTokenFromHeaders(req?.headers || {});
    if (!providedToken) throw createHttpError(401, 'API token required');
    if (providedToken !== expectedToken) throw createHttpError(401, 'Invalid API token');
}

function ensureInternalApiAuthorized(req, expectedToken) {
    if (String(req?.method || '').toUpperCase() === 'OPTIONS') return;
    if (!expectedToken) throw createHttpError(500, 'Internal API token is not configured');

    const providedToken = readInternalApiTokenFromHeaders(req?.headers || {});
    if (!providedToken) throw createHttpError(401, 'Internal API token required');
    if (providedToken !== expectedToken) throw createHttpError(401, 'Invalid internal API token');
}

function normalizePublicApiAuthSettings(settings = {}) {
    const next = settings || {};
    next.apiAuthEnabled = next.apiAuthEnabled !== false;

    const existingToken = typeof next.apiToken === 'string' ? next.apiToken.trim() : '';
    next.apiToken = next.apiAuthEnabled && !existingToken ? generateApiToken() : existingToken;
    return next;
}

function readRequestBody(req, { maxBytes = PUBLIC_API_MAX_BODY_BYTES } = {}) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        let settled = false;

        const fail = (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        req.on('data', (chunk) => {
            if (settled) return;

            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            totalBytes += buffer.length;
            if (totalBytes > maxBytes) {
                const error = createHttpError(413, `Request body too large (max ${maxBytes} bytes)`);
                fail(error);
                if (typeof req.destroy === 'function') req.destroy(error);
                return;
            }
            chunks.push(buffer);
        });

        req.on('end', () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks).toString('utf8'));
        });

        req.on('error', (error) => {
            if (settled) return;
            fail(error);
        });
    });
}

function parseJsonBody(body) {
    if (!body) return {};
    if (typeof body !== 'string') return body || {};

    try {
        return JSON.parse(body);
    } catch (error) {
        throw createHttpError(400, 'Invalid JSON body');
    }
}

function resolveExportAllPassword({ method, body, searchParams }) {
    if (method !== 'POST') {
        throw createHttpError(405, 'Use POST /api/export/all with a JSON body: { "password": "..." }');
    }

    const payload = parseJsonBody(body);
    const password = typeof payload?.password === 'string'
        ? payload.password.trim()
        : '';

    if (!password) {
        throw createHttpError(400, 'Password required in POST JSON body');
    }

    return password;
}

module.exports = {
    INTERNAL_API_MAX_BODY_BYTES,
    PUBLIC_API_MAX_BODY_BYTES,
    applyCorsHeaders,
    createHttpError,
    ensureInternalApiAuthorized,
    ensurePublicApiAuthorized,
    generateApiToken,
    generateInternalApiToken,
    isOriginAllowed,
    normalizePublicApiAuthSettings,
    parseJsonBody,
    readApiTokenFromHeaders,
    readInternalApiTokenFromHeaders,
    readRequestBody,
    resolveExportAllPassword
};
