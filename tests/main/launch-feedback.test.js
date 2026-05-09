const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule() {
    const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../src/shared/launch-feedback.mjs')).href;
    return await import(moduleUrl);
}

test('buildLaunchFeedback returns null for silent success', async () => {
    const { buildLaunchFeedback } = await loadModule();
    const result = buildLaunchFeedback({ success: true, message: '', warnings: [] });
    assert.equal(result, null);
});

test('buildLaunchFeedback formats launch warnings into a unified success notice', async () => {
    const { buildLaunchFeedback } = await loadModule();
    const result = buildLaunchFeedback({
        success: true,
        message: 'Launched',
        warnings: ['时区与代理地区不一致', '语言与代理国家不一致']
    });

    assert.equal(result.level, 'warning');
    assert.match(result.text, /启动成功，但有以下提示/);
    assert.match(result.text, /时区与代理地区不一致/);
    assert.match(result.text, /语言与代理国家不一致/);
});

test('buildLaunchFeedback formats launch failure with a consistent prefix', async () => {
    const { buildLaunchFeedback } = await loadModule();
    const result = buildLaunchFeedback({
        success: false,
        message: '代理服务未启动：dial tcp failed',
        warnings: []
    });

    assert.equal(result.level, 'error');
    assert.equal(result.text, '启动失败：代理服务未启动：dial tcp failed');
});
