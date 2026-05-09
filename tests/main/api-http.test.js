const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { URLSearchParams } = require('node:url');

const {
    applyCorsHeaders,
    ensureInternalApiAuthorized,
    ensurePublicApiAuthorized,
    generateInternalApiToken,
    normalizePublicApiAuthSettings,
    readApiTokenFromHeaders,
    readInternalApiTokenFromHeaders,
    readRequestBody,
    resolveExportAllPassword,
    PUBLIC_API_MAX_BODY_BYTES,
    INTERNAL_API_MAX_BODY_BYTES
} = require('../../src/main/api-http');

function createResponseRecorder() {
    const headers = new Map();
    return {
        setHeader(name, value) {
            headers.set(String(name).toLowerCase(), value);
        },
        getHeader(name) {
            return headers.get(String(name).toLowerCase());
        }
    };
}

function createRequest({ method = 'GET', origin, chunks = [] } = {}) {
    const req = Readable.from(chunks);
    req.method = method;
    req.headers = {};
    if (origin !== undefined) req.headers.origin = origin;
    return req;
}

test('applyCorsHeaders allows loopback browser origins for the public API', () => {
    const req = createRequest({ origin: 'http://localhost:3000' });
    const res = createResponseRecorder();

    applyCorsHeaders(req, res, {
        allowLoopbackOrigins: true,
        allowExtensionOrigins: false,
        allowMethods: ['GET', 'POST']
    });

    assert.equal(res.getHeader('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.getHeader('vary'), 'Origin');
    assert.match(res.getHeader('access-control-allow-methods'), /GET/);
});

test('applyCorsHeaders ignores remote web origins by default', () => {
    const req = createRequest({ origin: 'https://example.com' });
    const res = createResponseRecorder();

    applyCorsHeaders(req, res, {
        allowLoopbackOrigins: true,
        allowExtensionOrigins: false,
        allowMethods: ['GET']
    });

    assert.equal(res.getHeader('access-control-allow-origin'), undefined);
});

test('applyCorsHeaders allows extension origins only when explicitly enabled', () => {
    const req = createRequest({ origin: 'chrome-extension://abcdefghijklmnop' });
    const res = createResponseRecorder();

    applyCorsHeaders(req, res, {
        allowLoopbackOrigins: false,
        allowExtensionOrigins: true,
        allowMethods: ['POST']
    });

    assert.equal(res.getHeader('access-control-allow-origin'), 'chrome-extension://abcdefghijklmnop');
});

test('applyCorsHeaders allows authorization headers for browser API auth preflight', () => {
    const req = createRequest({ origin: 'http://localhost:3000' });
    const res = createResponseRecorder();

    applyCorsHeaders(req, res, {
        allowLoopbackOrigins: true,
        allowExtensionOrigins: false,
        allowMethods: ['GET', 'POST', 'OPTIONS']
    });

    const allowHeaders = res.getHeader('access-control-allow-headers');
    assert.match(allowHeaders, /content-type/i);
    assert.match(allowHeaders, /authorization/i);
    assert.match(allowHeaders, /x-api-token/i);
});

test('readApiTokenFromHeaders prefers bearer authorization', () => {
    const token = readApiTokenFromHeaders({
        authorization: 'Bearer top-secret',
        'x-api-token': 'fallback'
    });

    assert.equal(token, 'top-secret');
});

test('readApiTokenFromHeaders falls back to x-api-token', () => {
    const token = readApiTokenFromHeaders({ 'x-api-token': 'header-token' });

    assert.equal(token, 'header-token');
});

test('ensurePublicApiAuthorized allows OPTIONS without a token', () => {
    assert.doesNotThrow(() => ensurePublicApiAuthorized({ method: 'OPTIONS', headers: {} }, 'expected-token'));
});

test('ensurePublicApiAuthorized rejects missing token with 401', () => {
    assert.throws(
        () => ensurePublicApiAuthorized({ method: 'GET', headers: {} }, 'expected-token'),
        (error) => {
            assert.equal(error.statusCode, 401);
            assert.match(error.message, /required/i);
            return true;
        }
    );
});

test('ensurePublicApiAuthorized rejects invalid token with 401', () => {
    assert.throws(
        () => ensurePublicApiAuthorized({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, 'expected-token'),
        (error) => {
            assert.equal(error.statusCode, 401);
            assert.match(error.message, /invalid/i);
            return true;
        }
    );
});

test('normalizePublicApiAuthSettings generates a token when auth is enabled and token missing', () => {
    const normalized = normalizePublicApiAuthSettings({ enableApiServer: true, apiAuthEnabled: true, apiToken: '' });

    assert.equal(normalized.apiAuthEnabled, true);
    assert.match(normalized.apiToken, /^[A-Fa-f0-9]{64}$/);
});

test('normalizePublicApiAuthSettings preserves explicit token', () => {
    const normalized = normalizePublicApiAuthSettings({ apiAuthEnabled: true, apiToken: 'keep-me' });

    assert.equal(normalized.apiToken, 'keep-me');
});

test('generateInternalApiToken creates a 64-hex runtime secret', () => {
    const token = generateInternalApiToken();
    assert.match(token, /^[A-Fa-f0-9]{64}$/);
});

test('readInternalApiTokenFromHeaders reads x-internal-api-token', () => {
    const token = readInternalApiTokenFromHeaders({
        'x-internal-api-token': 'internal-secret'
    });

    assert.equal(token, 'internal-secret');
});

test('ensureInternalApiAuthorized rejects missing internal token', () => {
    assert.throws(
        () => ensureInternalApiAuthorized({ method: 'POST', headers: {} }, 'expected-secret'),
        (error) => {
            assert.equal(error.statusCode, 401);
            assert.match(error.message, /internal api token required/i);
            return true;
        }
    );
});

test('ensureInternalApiAuthorized rejects wrong internal token', () => {
    assert.throws(
        () => ensureInternalApiAuthorized({
            method: 'POST',
            headers: { 'x-internal-api-token': 'wrong-secret' }
        }, 'expected-secret'),
        (error) => {
            assert.equal(error.statusCode, 401);
            assert.match(error.message, /invalid internal api token/i);
            return true;
        }
    );
});

test('ensureInternalApiAuthorized accepts the expected runtime token', () => {
    assert.doesNotThrow(() => ensureInternalApiAuthorized({
        method: 'POST',
        headers: { 'x-internal-api-token': 'expected-secret' }
    }, 'expected-secret'));
});

test('readRequestBody rejects bodies larger than the configured limit', async () => {
    const req = createRequest({ method: 'POST', chunks: [Buffer.alloc(12, 1)] });

    await assert.rejects(
        readRequestBody(req, { maxBytes: 8 }),
        (error) => {
            assert.equal(error.statusCode, 413);
            assert.match(error.message, /too large/i);
            return true;
        }
    );
});

test('readRequestBody returns the concatenated request body for allowed payloads', async () => {
    const req = createRequest({ method: 'POST', chunks: ['{"hello":"world"}'] });

    const body = await readRequestBody(req, { maxBytes: 1024 });

    assert.equal(body, '{"hello":"world"}');
});

test('resolveExportAllPassword accepts POST body JSON', () => {
    const password = resolveExportAllPassword({
        method: 'POST',
        body: '{"password":"s3cr3t"}',
        searchParams: new URLSearchParams()
    });

    assert.equal(password, 's3cr3t');
});

test('resolveExportAllPassword rejects legacy GET requests with a migration hint', () => {
    assert.throws(
        () => resolveExportAllPassword({
            method: 'GET',
            body: '',
            searchParams: new URLSearchParams('password=legacy')
        }),
        (error) => {
            assert.equal(error.statusCode, 405);
            assert.match(error.message, /post/i);
            return true;
        }
    );
});

test('api body size constants leave headroom for imports but keep internal sync smaller', () => {
    assert.ok(PUBLIC_API_MAX_BODY_BYTES > INTERNAL_API_MAX_BODY_BYTES);
    assert.ok(PUBLIC_API_MAX_BODY_BYTES >= 16 * 1024 * 1024);
});
