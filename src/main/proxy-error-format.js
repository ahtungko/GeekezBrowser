function formatProxyDiagnosticMessage({ category = 'unknown', rawMessage = '' } = {}) {
    const detail = String(rawMessage || '').trim();
    const lower = detail.toLowerCase();

    if (category === 'format') {
        return '代理链接格式错误';
    }

    if (category === 'startup') {
        return detail ? `代理服务未启动：${detail}` : '代理服务未启动';
    }

    if (category === 'probe') {
        if (!detail || lower === 'timeout') {
            return '上游代理连通性检查失败：连接超时';
        }
        return `上游代理连通性检查失败：${detail}`;
    }

    return detail ? `代理操作失败：${detail}` : '代理操作失败';
}

module.exports = {
    formatProxyDiagnosticMessage
};
