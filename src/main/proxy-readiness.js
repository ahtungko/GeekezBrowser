const { formatProxyDiagnosticMessage } = require('./proxy-error-format');

function buildProxyReadinessFailure({ ready, probeResult, xrayExited = false, xrayLog = '' } = {}) {
    if (ready && probeResult && probeResult.success) return null;

    if (!ready) {
        return {
            stage: 'startup',
            message: formatProxyDiagnosticMessage({
                category: 'startup',
                rawMessage: xrayExited && xrayLog ? String(xrayLog).trim() : ''
            })
        };
    }

    const probeMsg = probeResult?.msg || probeResult?.error || 'unknown error';
    return {
        stage: 'probe',
        message: formatProxyDiagnosticMessage({
            category: 'probe',
            rawMessage: probeMsg
        })
    };
}

module.exports = {
    buildProxyReadinessFailure
};
