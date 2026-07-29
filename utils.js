/**
 * MKOnlinePlayer v2.4 — Node.js API 工具模块
 * 对应 api.php 中的工具函数
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 获取 GET 或 POST 过来的参数
 * @param {object} params - 已解析的参数对象（含 query 和 body）
 * @param {string} key - 键值
 * @param {*} defaultVal - 默认值
 * @returns {string} 获取到的内容（没有则为默认值）
 */
export function getParam(params, key, defaultVal = '') {
  if (!key || typeof key !== 'string') return defaultVal;
  const val = params[key];
  return val !== undefined && val !== null ? String(val).trim() : defaultVal;
}

/**
 * 输出 JSON 或 JSONP 格式的内容
 * @param {object} res - HTTP 响应对象
 * @param {string} data - JSON 字符串
 * @param {object} params - 请求参数（含 callback）
 * @param {object} config - 全局配置
 */
export function echojson(res, data, params, config) {
  let output = String(data);
  const callback = getParam(params, 'callback');
  const source = getParam(params, 'source', config.defaultSource);

  // HTTPS 链接替换（排除不支持 HTTPS 的源）
  if (config.https && !config.sourcesNoHttps.includes(source)) {
    output = output.replace(/http:\/\//g, 'https://');
    output = output.replace(/http:\\\/\\\//g, 'https:\\/\\/');
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (callback) {
    // JSONP 输出
    const safeCallback = callback.replace(/[^a-zA-Z0-9_.]/g, '');
    res.end(`${safeCallback}(${output})`);
  } else {
    res.end(output);
  }
}

/**
 * 确保缓存目录存在
 * @param {string} cachePath - 缓存目录相对或绝对路径
 * @returns {string} 解析后的绝对路径
 */
export function ensureCacheDir(cachePath) {
  const resolvedPath = path.resolve(__dirname, cachePath);
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }
  return resolvedPath;
}

/**
 * 生成缓存文件路径
 * @param {string} resolvedCachePath - 解析后的缓存目录绝对路径
 * @param {string} source - 音乐源
 * @param {string} type - 缓存类型（lyric / playlist）
 * @param {string} id - 资源 ID
 * @returns {string} 完整的缓存文件路径
 */
export function cacheFilePath(resolvedCachePath, source, type, id) {
  return path.join(resolvedCachePath, `${source}_${type}_${id}.json`);
}

/**
 * 从文件缓存读取数据
 * @param {string} filePath - 缓存文件路径
 * @returns {string|null} 缓存内容，不存在则返回 null
 */
export function cacheRead(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    // 忽略读取错误
  }
  return null;
}

/**
 * 写入文件缓存
 * @param {string} filePath - 缓存文件路径
 * @param {string} data - 要缓存的数据
 */
export function cacheWrite(filePath, data) {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
  } catch (e) {
    // 忽略写入错误
  }
}

/**
 * 判断缓存文件是否为今天创建的（用于歌单缓存）
 * @param {string} filePath - 缓存文件路径
 * @returns {boolean}
 */
export function isCacheToday(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const mtime = new Date(stat.mtime);
      const now = new Date();
      return (
        mtime.getFullYear() === now.getFullYear() &&
        mtime.getMonth() === now.getMonth() &&
        mtime.getDate() === now.getDate()
      );
    }
  } catch (e) {
    // 忽略
  }
  return false;
}
