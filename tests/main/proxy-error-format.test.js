const test = require('node:test');
const assert = require('node:assert/strict');

const {
    formatProxyDiagnosticMessage
} = require('../../src/main/proxy-error-format');

test('formats proxy link format errors in Chinese', () => {
    const message = formatProxyDiagnosticMessage({ category: 'format' });
    assert.equal(message, '代理链接格式错误');
});

test('formats startup failures with clear category', () => {
    const message = formatProxyDiagnosticMessage({
        category: 'startup',
        rawMessage: 'dial tcp failed'
    });

    assert.match(message, /代理服务未启动/);
    assert.match(message, /dial tcp failed/i);
});

test('formats probe timeout as upstream connectivity timeout', () => {
    const message = formatProxyDiagnosticMessage({
        category: 'probe',
        rawMessage: 'Timeout'
    });

    assert.equal(message, '上游代理连通性检查失败：连接超时');
});

test('formats probe generic failure with readable prefix', () => {
    const message = formatProxyDiagnosticMessage({
        category: 'probe',
        rawMessage: 'ECONNRESET'
    });

    assert.equal(message, '上游代理连通性检查失败：ECONNRESET');
});

test('falls back to generic proxy failure label', () => {
    const message = formatProxyDiagnosticMessage({
        category: 'unknown',
        rawMessage: 'mystery'
    });

    assert.equal(message, '代理操作失败：mystery');
});
