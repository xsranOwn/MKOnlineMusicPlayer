/**
 * MKOnlinePlayer v1.0.0 — Node.js 全栈服务器
 * 同时提供 API 和静态文件服务，完全替代 nginx
 *
 * 启动：node api.js
 * 默认端口：9500（可通过 MK_PORT 环境变量修改）
 *
 * 修改：@xsran2008
 * 时间：2025-7-28
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getParam, echojson } from './utils.js';
import {
  handleSearch,
  handleUrl,
  handlePic,
  handleLyric,
  handlePlaylist,
  handleUserlist,
  handleDownload,
  handleDefault,
} from './handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 静态文件根目录 = music/（api-node/ 的父目录）
const STATIC_ROOT = path.join(__dirname, 'html');

// MIME 类型映射表
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
};

/**
 * 安全地解析静态文件路径（防止路径穿越）
 */
function resolveStaticPath(urlPath) {
  // 解码 URL 路径
  let decodedPath = decodeURIComponent(urlPath);
  // 默认为 index.html
  if (decodedPath === '/' || decodedPath === '') {
    decodedPath = '/index.html';
  }
  // 解析并检查是否仍在 STATIC_ROOT 内
  const fullPath = path.resolve(STATIC_ROOT, decodedPath.slice(1));
  if (!fullPath.startsWith(STATIC_ROOT)) {
    return null; // 路径穿越攻击
  }
  return fullPath;
}

/**
 * 提供静态文件
 */
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // 文本类扩展名用 utf-8 读取，二进制文件（图片/字体等）用 Buffer 读取
  const textExtensions = ['.html', '.css', '.js', '.json'];
  const encoding = textExtensions.includes(ext) ? 'utf-8' : undefined;

  fs.readFile(filePath, encoding, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      }
      return;
    }

    // 如果开启了调试模式，在 HTML 的 </body> 前注入 debug 标记，
    // 使前端 player.js 中的 mkPlayer.debug 自动同步；
    // 同时对静态资源 URL 追加 ?={timestamp} 防止浏览器缓存
    if (ext === '.html' && config.debug) {
      const ts = Date.now();
      content = content.replace(
        /(src|href)\s*=\s*"([^"]*\.(?:css|js|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot))(?:\?[^"]*)?"/gi,
        (match, attr, url) => {
          // 跳过外部链接
          if (/^(https?:|\/\/|data:)/.test(url)) return match;
          return `${attr}="${url}?=${ts}"`;
        }
      );
      content = content.replace(
        '</body>',
        '<script>window.__MK_DEBUG__=true;</script></body>'
      );
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    // 缓存控制：调试模式下所有文件不缓存，非调试模式 html 不缓存、其他缓存 7 天
    if (config.debug) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    res.end(content);
  });
}

/**
 * 解析请求体（支持 JSON 和表单格式）
 */
function parseBody(req) {
  return new Promise((resolve) => {
    if (req.method !== 'POST') {
      return resolve({});
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      const contentType = req.headers['content-type'] || '';
      try {
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(body));
        } else {
          const params = {};
          for (const [key, value] of new URLSearchParams(body)) {
            params[key] = value;
          }
          resolve(params);
        }
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * 主请求处理
 */
async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
  const bodyParams = await parseBody(req);
  const params = { ...queryParams, ...bodyParams };

  // —— 路径以 /api 开头 → API 路由 ——
  if (pathname.startsWith('/api')) {
    const types = getParam(params, 'types');
    try {
      let data;
      switch (types) {
        case 'url':
          data = await handleUrl(params, config);
          echojson(res, data, params, config);
          break;
        case 'pic':
          data = await handlePic(params, config);
          echojson(res, data, params, config);
          break;
        case 'lyric':
          data = await handleLyric(params, config);
          echojson(res, data, params, config);
          break;
        case 'download':
          data = handleDownload(params, config);
          echojson(res, data, params, config);
          break;
        case 'userlist':
          data = await handleUserlist(params, config);
          echojson(res, data, params, config);
          break;
        case 'playlist':
          data = await handlePlaylist(params, config);
          echojson(res, data, params, config);
          break;
        case 'search':
          data = await handleSearch(params, config);
          echojson(res, data, params, config);
          break;
        default:
          // 无 types 或未知 types — 输出信息页
          const html = handleDefault(config);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
          break;
      }
    } catch (error) {
      if (config.debug) console.error('API Error:', error);
      const errorMsg = JSON.stringify({
        error: true,
        message: config.debug ? error.message : 'Internal Server Error',
      });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 500;
      res.end(errorMsg);
    }
    return;
  }

  // —— 无 types 参数 → 静态文件服务 ——
  const filePath = resolveStaticPath(parsedUrl.pathname);
  if (!filePath) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Forbidden');
    return;
  }
  serveStaticFile(res, filePath);
}

// 创建 HTTP 服务器
const server = http.createServer(handleRequest);

// 启动服务器
server.listen(config.port, () => {
  console.log(`[MKOnlinePlayer] 服务器已启动`);
  console.log(`[MKOnlinePlayer] 监听地址: http://localhost:${config.port}`);
  console.log(`[MKOnlinePlayer] 静态文件根目录: ${STATIC_ROOT}`);
  console.log(`[MKOnlinePlayer] 调试模式: ${config.debug ? '开启' : '关闭'}`);
  console.log(`[MKOnlinePlayer] HTTPS 替换: ${config.https ? '开启' : '关闭'}`);
  console.log(`[MKOnlinePlayer] 缓存目录: ${config.cachePath}`);
  console.log(`[MKOnlinePlayer] 默认音乐源: ${config.defaultSource}`);
  if (config.neteaseCookie) {
    console.log(`[MKOnlinePlayer] 网易云 Cookie: 已设置`);
  }
});
