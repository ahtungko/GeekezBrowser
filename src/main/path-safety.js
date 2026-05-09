const path = require('node:path');

function isPathInsideBase(basePath, targetPath) {
    const base = path.resolve(basePath);
    const target = path.resolve(targetPath);
    const relative = path.relative(base, target);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolvePathInsideBase(basePath, relativePath) {
    const raw = String(relativePath || '').trim();
    if (!raw) throw new Error('Relative path is required');
    if (path.isAbsolute(raw)) throw new Error('Absolute paths are not allowed');

    const base = path.resolve(basePath);
    const target = path.resolve(base, raw);
    if (!isPathInsideBase(base, target)) {
        throw new Error(`Path escapes base directory: ${raw}`);
    }

    return target;
}

module.exports = {
    isPathInsideBase,
    resolvePathInsideBase
};
