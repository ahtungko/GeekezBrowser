export function buildLaunchFeedback(result = {}) {
    const warnings = Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [];
    const message = String(result?.message || '').trim();

    if (result?.success === false) {
        return {
            level: 'error',
            text: `启动失败：${message || '未知错误'}`
        };
    }

    if (warnings.length > 0) {
        return {
            level: 'warning',
            text: `启动成功，但有以下提示：\n- ${warnings.join('\n- ')}`
        };
    }

    return null;
}
