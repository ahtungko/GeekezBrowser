const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildProxyReadinessFailure
} = require('../../src/main/proxy-readiness');

test('returns null when proxy readiness and probe are both successful', () => {
    const failure = buildProxyReadinessFailure({
        ready: true,
        probeResult: { success: true, latency: 120 }
    });

    assert.equal(failure, null);
});

test('reports startup failure when local socks port never becomes ready', () => {
    const failure = buildProxyReadinessFailure({
        ready: false,
        probeResult: null,
        xrayExited: false
    });

    assert.match(failure.message, /代理服务未启动/);
});

test('reports probe failure when socks port is up but upstream connectivity is dead', () => {
    const failure = buildProxyReadinessFailure({
        ready: true,
        probeResult: { success: false, msg: 'Timeout' }
    });

    assert.match(failure.message, /上游代理连通性检查失败/);
    assert.match(failure.message, /连接超时/);
});

test('includes xray log hint when startup crashes early', () => {
    const failure = buildProxyReadinessFailure({
        ready: false,
        probeResult: null,
        xrayExited: true,
        xrayLog: 'dial tcp failed'
    });

    assert.match(failure.message, /dial tcp failed/i);
});
