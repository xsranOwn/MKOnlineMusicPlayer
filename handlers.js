/**
 * MKOnlinePlayer v2.4 — Node.js API 路由处理器
 * 对应 api.php 中 switch($types) 的各个分支
 */

import Meting from '@meting/core';
import { getParam, echojson, ensureCacheDir, cacheFilePath, cacheRead, cacheWrite, isCacheToday } from './utils.js';

/**
 * 创建 Meting 实例（带公共配置）
 * @param {string} source - 音乐源
 * @param {object} config - 全局配置
 * @param {boolean} enableFormat - 是否启用格式化
 * @returns {object} Meting 实例
 */
function createMeting(source, config, enableFormat = true) {
  const meting = new Meting(source);
  if (enableFormat) {
    meting.format(true);
  }
  if (source === 'netease' && config.neteaseCookie) {
    meting.cookie(config.neteaseCookie);
  }
  return meting;
}

/**
 * 处理 search 请求 — 搜索歌曲
 * 对应 PHP: $API->search($s, ['page'=>$pages, 'limit'=>$limit])
 */
export async function handleSearch(params, config) {
  const source = getParam(params, 'source', config.defaultSource);
  const keyword = getParam(params, 'name');
  const limit = parseInt(getParam(params, 'count', '20'), 10);
  const pages = parseInt(getParam(params, 'pages', '1'), 10);

  if (!keyword) {
    return JSON.stringify([]);
  }

  const meting = createMeting(source, config, true);
  const data = await meting.search(keyword, {
    page: pages,
    limit: limit,
  });
  return data;
}

/**
 * 处理 url 请求 — 获取歌曲播放链接
 * 对应 PHP: $API->url($id)
 */
export async function handleUrl(params, config) {
  const source = getParam(params, 'source', config.defaultSource);
  const id = getParam(params, 'id');

  if (!id) {
    return JSON.stringify({ url: '' });
  }

  const meting = createMeting(source, config, true);
  const data = await meting.url(id, 320);
  return data;
}

/**
 * 处理 pic 请求 — 获取歌曲封面
 * 对应 PHP: $API->pic($id)
 */
export async function handlePic(params, config) {
  const source = getParam(params, 'source', config.defaultSource);
  const id = getParam(params, 'id');

  if (!id) {
    return JSON.stringify({ url: '' });
  }

  const meting = createMeting(source, config, true);
  const data = await meting.pic(id);
  return data;
}

/**
 * 处理 lyric 请求 — 获取歌词（网易云有文件缓存）
 * 对应 PHP: 读取/写入 cache/ 目录
 */
export async function handleLyric(params, config) {
  const source = getParam(params, 'source', config.defaultSource);
  const id = getParam(params, 'id');

  if (!id) {
    return JSON.stringify({ lyric: '', tlyric: '' });
  }

  // 网易云歌词缓存
  if (source === 'netease' && config.cachePath) {
    const cacheDir = ensureCacheDir(config.cachePath);
    const cacheFile = cacheFilePath(cacheDir, source, 'lyric', id);

    const cached = cacheRead(cacheFile);
    if (cached !== null) {
      return cached;
    }

    const meting = createMeting(source, config, true);
    const data = await meting.lyric(id);

    // 只缓存有歌词的响应
    try {
      const parsed = JSON.parse(data);
      if (parsed.lyric && parsed.lyric !== '') {
        cacheWrite(cacheFile, data);
      }
    } catch (e) {
      // 解析失败时不缓存
    }

    return data;
  }

  // 非网易云或未启用缓存
  const meting = createMeting(source, config, true);
  const data = await meting.lyric(id);
  return data;
}

/**
 * 处理 playlist 请求 — 获取歌单歌曲（网易云有缓存）
 * 对应 PHP: $API->format(false)->playlist($id) 且检查当天缓存
 */
export async function handlePlaylist(params, config) {
  const source = getParam(params, 'source', config.defaultSource);
  const id = getParam(params, 'id');

  if (!id) {
    return JSON.stringify({});
  }

  // 网易云歌单缓存（当天有效）
  if (source === 'netease' && config.cachePath) {
    const cacheDir = ensureCacheDir(config.cachePath);
    const cacheFile = cacheFilePath(cacheDir, source, 'playlist', id);

    const cached = cacheRead(cacheFile);
    if (cached !== null && isCacheToday(cacheFile)) {
      return cached;
    }

    // playlist 不使用 format(true)，因为前端期望网易云原始格式（含 playlist.tracks 等字段）
    const meting = createMeting(source, config, false);
    const data = await meting.playlist(id);

    // 只缓存有歌曲数据的响应
    try {
      const parsed = JSON.parse(data);
      if (parsed.playlist && parsed.playlist.tracks) {
        cacheWrite(cacheFile, data);
      }
    } catch (e) {
      // 解析失败时不缓存
    }

    return data;
  }

  // 非网易云源
  const meting = createMeting(source, config, false);
  const data = await meting.playlist(id);
  return data;
}

/**
 * 处理 userlist 请求 — 获取用户歌单列表（直接调网易云 API）
 * 对应 PHP: file_get_contents('http://music.163.com/api/user/playlist/?offset=0&limit=1001&uid='.$uid)
 */
export async function handleUserlist(params, config) {
  const uid = getParam(params, 'uid');

  if (!uid) {
    return JSON.stringify({ code: -1, message: 'uid is required' });
  }

  const url = `http://music.163.com/api/user/playlist/?offset=0&limit=1001&uid=${uid}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    return text;
  } catch (error) {
    return JSON.stringify({ code: -1, message: error.message });
  }
}

/**
 * 处理 download 请求 — 已弃用
 * 对应 PHP: header('location:$fileurl'); exit();
 */
export function handleDownload(params, config) {
  // 已弃用，返回空
  return JSON.stringify({});
}

/**
 * 生成调试/信息页面 HTML
 * 对应 PHP default 分支
 */
export function handleDefault(config) {
  const lines = [];
  lines.push('<!doctype html><html><head><meta charset="utf-8"><title>信息</title>');
  lines.push('<style>* {font-family: microsoft yahei}</style></head><body>');
  lines.push('<h2>MKOnlinePlayer</h2>');
  lines.push('<h3>Github: https://github.com/mengkunsoft/MKOnlineMusicPlayer</h3><br>');

  if (!config.debug) {
    lines.push('<p>Api 调试模式已关闭</p>');
  } else {
    lines.push('<p><font color="red">您已开启 Api 调试功能，正常使用时请在 config.js 中关闭该选项！</font></p><br>');
    lines.push(`<p>Node.js 版本：${process.version}（本程序要求 Node.js 12+）</p><br>`);
    lines.push('<p>运行环境检查</p>');
    lines.push(`<p>@meting/core: 可用（用于获取音乐数据）</p>`);
    lines.push(`<p>fetch: ${typeof fetch !== 'undefined' ? '<font color="green">可用</font>' : '<font color="red">不支持</font>'} （用于获取用户歌单数据）</p>`);
    lines.push('<p>文件系统: <font color="green">可用</font> （用于缓存）</p>');
  }

  lines.push('</body></html>');
  return lines.join('\n');
}
