// Edge Function · catch-all 代理：/e/<encodeURIComponent(url)> -> 还原并代理上游。
// 协议占位符：ht-tps:// -> https://，ht-tp:// -> http://；?query 自动透传上游。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

// 还原协议占位符，防止链接被平台拦截
function restoreProtocol(rawUrl) {
  return rawUrl.replace('ht-tps://', 'https://').replace('ht-tp://', 'http://');
}

// 生成 e 云函数的绝对代理地址（用于 m3u8 内嵌套播放列表 / 密钥二次转发）
function makeM3u8Proxy(origin) {
  return (absoluteUrl) => {
    const transformed = String(absoluteUrl)
      .replace(/^https:\/\//i, 'ht-tps://')
      .replace(/^http:\/\//i, 'ht-tp://')
    return `${origin}/e/${encodeURIComponent(transformed)}`;
  };
}

// 改写 m3u8：嵌套播放列表 / #EXT-X-KEY 继续走云函数，ts/fMP4 分片改写为原始地址直连
// （避免云函数承载全部视频流量而触发安全预警）。
function rewriteM3u8(content, baseUrl, proxy) {
  const resolve = (uri) => {
    try {
      return new URL(uri, baseUrl).href;
    } catch {
      return uri;
    }
  };
  // 嵌套播放列表 / 密钥需继续走代理，分片直连
  const needProxy = (line, absoluteUrl) =>
    line.startsWith('#EXT-X-KEY') || /\.m3u8($|\?)/i.test(absoluteUrl);
  return content
    .split('\n')
    .map((line) => {
      if (!line.includes('URI=')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const abs = resolve(trimmed);
          return needProxy(line, abs) ? proxy(abs) : abs;
        }
        return line;
      }
      // 含 URI="..." 的属性行（#EXT-X-KEY/#EXT-X-MEDIA/#EXT-X-MAP 等）
      return line.replace(/URI="([^"]*)"/g, (_m, uri) => {
        const abs = resolve(uri);
        return `URI="${needProxy(line, abs) ? proxy(abs) : abs}"`;
      });
    })
    .join('\n');
}

// 模拟浏览器请求头发起单次请求
async function tryFetch(url) {
  const urlObj = new URL(url);
  return fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Referer: urlObj.origin,
    },
    redirect: 'follow',
  });
}

// 依次尝试候选地址，返回首个成功的响应；全部失败则抛出最后一个错误
async function fetchWithFallback(candidates) {
  let lastError;
  for (const url of candidates) {
    try {
      return await tryFetch(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// 复制上游响应头，放开跨域并清除限制性安全头
function buildProxyHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', '*');
  headers.delete('Content-Security-Policy');
  headers.delete('X-Frame-Options');
  headers.delete('X-Content-Type-Options');
  return headers;
}

// 统一的 JSON 错误响应
function jsonError(message, status, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// 将请求自带的查询参数透传给上游（路径型路由 /e/<url>?a=1 中的 a=1）
function mergeIncomingQuery(targetUrl, incomingRequestUrl) {
  try {
    const base = new URL(targetUrl); // 此时协议已还原，可安全解析
    const extra = new URL(incomingRequestUrl).search;
    if (extra) base.search += (base.search ? '&' : '') + extra.slice(1);
    return base.href;
  } catch {
    return targetUrl; // 裸域名等无法解析时不合并，交由兜底逻辑处理
  }
}

/**
 * 代理核心：传入目标 URL（可带协议占位符），返回 Response。
 * @param {string} rawTargetUrl 目标地址，如 https://example.com 或 ht-tps://example.com
 * @param {string} [incomingRequestUrl] 可选，调用方原始请求 URL，用于透传查询参数
 */
async function proxyRequest(rawTargetUrl, incomingRequestUrl) {
  if (!rawTargetUrl) {
    return jsonError('缺少目标 URL', 400);
  }

  // 1) 还原协议占位符
  let targetUrl = restoreProtocol(rawTargetUrl);

  // 2) 透传调用方自带的查询参数
  if (incomingRequestUrl) {
    targetUrl = mergeIncomingQuery(targetUrl, incomingRequestUrl);
  }

  // 3) 构造候选地址：带协议直连；无协议则 HTTPS / HTTP 兜底
  const candidates = /^https?:\/\//i.test(targetUrl)
    ? [targetUrl]
    : ['https://' + targetUrl, 'http://' + targetUrl];

  // 4) 请求上游
  let response;
  try {
    response = await fetchWithFallback(candidates);
  } catch (error) {
    let message = error.message;
    if (error.message.includes("Failed to construct 'URL'")) {
      message = '无效的URL格式，请检查URL是否正确';
    } else if (error.message.includes('Failed to fetch')) {
      message = '请求失败，可能是URL不存在或网络问题';
    }
    return jsonError(message, 500, { originalUrl: rawTargetUrl });
  }

  // 5) 处理响应：文本类缓冲读取，二进制流式转发
  const contentType = response.headers.get('Content-Type') || '';
  const proxyHeaders = buildProxyHeaders(response);
  const isTextBased = /json|text|xml|html|javascript|css|svg/i.test(contentType);
  // m3u8 播放列表：需改写内部相对/绝对 URI（嵌套列表/密钥走代理，分片直连）
  const isM3u8 =
    /\.m3u8($|\?)/i.test(targetUrl) ||
    /mpegurl|vnd\.apple\.mpegurl/i.test(contentType);
  const origin = incomingRequestUrl
    ? new URL(incomingRequestUrl).origin
    : '';

  if (isTextBased || isM3u8) {
    const text = await response.text();
    // fetch 自动解压 gzip，但 Content-Length 仍是压缩后大小，必须删除
    for (const h of ['Content-Length', 'Content-Encoding', 'Transfer-Encoding']) {
      proxyHeaders.delete(h);
    }
    const finalText = isM3u8
      ? rewriteM3u8(text, targetUrl, makeM3u8Proxy(origin))
      : text;
    proxyHeaders.set(
      'Content-Type',
      isM3u8 ? 'application/vnd.apple.mpegurl' : contentType || 'text/plain; charset=utf-8'
    );
    return new Response(finalText, {
      status: response.status,
      statusText: response.statusText,
      headers: proxyHeaders,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: proxyHeaders,
  });
}

/**
 * 从 catch-all 路由参数还原目标 URL。
 * edge-functions 的 params.default 为字符串，做 URL 解码。
 * @param {string|string[]} paramsDefault
 * @returns {string}
 */
function parsePathTarget(paramsDefault) {
  const raw = Array.isArray(paramsDefault)
    ? paramsDefault.join('/')
    : String(paramsDefault ?? '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function onRequest(context) {
  const target = parsePathTarget(context.params.default);
  return proxyRequest(target || '', context.request.url);
}
