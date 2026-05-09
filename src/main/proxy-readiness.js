function buildProxyReadinessFailure({ ready, probeResult, xrayExited = false, xrayLog = '' } = {}) {
    if (ready && probeResult && probeResult.success) return null;

    if (!ready) {
        const detail = xrayExited && xrayLog
            ? ` ${String(xrayLog).trim()}`
            : '';
        return {
            stage: 'startup',
            message: `Proxy service failed to start.${detail}`.trim()
        };
    }

    const probeMsg = probeResult?.msg || probeResult?.error || 'unknown error';
    return {
        stage: 'probe',
        message: `Proxy connectivity check failed: ${probeMsg}`
    };
}

module.exports = {
    buildProxyReadinessFailure
};
