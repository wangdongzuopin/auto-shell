/** 将 undici/node fetch 的网络层失败转成可读说明（含 errno / cause） */
export function formatFetchFailureError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const base = err.message;
  const cause = err.cause;
  let detail = '';
  if (cause instanceof Error) {
    const ne = cause as NodeJS.ErrnoException;
    if (ne.message) {
      detail = ` — ${ne.message}`;
    }
    const code = ne.code;
    if (code === 'ECONNREFUSED') {
      detail +=
        '（连接被拒绝：若使用 Ollama 请先启动本机服务；第三方 API 请核对 Base URL 与端口。）';
    } else if (code === 'ENOTFOUND') {
      detail += '（域名无法解析：请检查 Base URL 与当前网络/DNS。）';
    } else if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      detail += '（TLS/证书异常：可检查系统时间、公司代理或网关证书。）';
    } else if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
      detail += '（连接超时：请检查网络、防火墙或代理。）';
    }
  }
  const isGenericFetch = /^fetch failed$/i.test(base.trim());
  if (isGenericFetch) {
    return `无法连接到接口${detail || '，请检查网络与 Base URL'}`;
  }
  return `${base}${detail}`;
}
