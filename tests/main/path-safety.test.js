const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    isPathInsideBase,
    resolvePathInsideBase
} = require('../../src/main/path-safety');

test('resolvePathInsideBase accepts a normal relative path', () => {
    const result = resolvePathInsideBase('/tmp/base', 'Default/Bookmarks');
    assert.equal(result, path.resolve('/tmp/base', 'Default/Bookmarks'));
});

test('resolvePathInsideBase rejects parent-directory traversal', () => {
    assert.throws(
        () => resolvePathInsideBase('/tmp/base', '../outside.txt'),
        /escapes base directory/i
    );
});

test('resolvePathInsideBase rejects absolute paths', () => {
    assert.throws(
        () => resolvePathInsideBase('/tmp/base', '/etc/passwd'),
        /absolute paths are not allowed/i
    );
});

test('isPathInsideBase returns true only for descendants of the base directory', () => {
    assert.equal(isPathInsideBase('/tmp/base', '/tmp/base/Default/History'), true);
    assert.equal(isPathInsideBase('/tmp/base', '/tmp/other/place.txt'), false);
});
