# MKOnlinePlayer — Node.js API Server

基于 [@meting/core](https://github.com/metowolf/Meting) 构建的全栈音乐播放器后端，取代原 PHP 版本，**无需 nginx 和 PHP**。

## 快速开始

```bash
# 安装依赖（仅首次）
npm install

# 启动服务器（生产模式）
npm start

# 启动服务器（调试模式）
npm run dev
```

打开浏览器访问 `http://localhost:9500`

## 目录结构

```
music/
├── app.js              # 服务器入口（HTTP + 静态文件）
├── config.js           # 配置文件
├── utils.js            # 工具函数
├── handlers.js         # API 路由处理器
├── package.json
├── node_modules/
├── cache/              # 歌词和歌单的缓存文件
└── html/               # 前端静态文件
    ├── index.html
    ├── js/
    ├── css/
    ├── images/
    └── plugins/
```

## 配置

编辑 `config.js`（直接修改默认值即可生效）或通过环境变量覆盖：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `MK_PORT` | 9500 | 监听端口 |
| `MK_HTTPS` | true | 是否将资源链接替换为 HTTPS |
| `MK_DEBUG` | false | 开启调试模式 |
| `MK_CACHE_PATH` | ./cache/ | 缓存目录路径 |
| `MK_NETEASE_COOKIE` | (空) | 某云 Cookie（歌曲失效时设置） |
| `MK_SOURCE` | netease | 默认音乐源 |

## API 端点

所有 API 请求路径以 `/api/` 开头，通过 `types` 参数路由，支持 GET/POST，支持 JSONP（加 `callback` 参数）。

### 搜索歌曲

```
/api/?types=search&source=netease&name=周杰伦&count=10&pages=1
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `source` | 否 | netease | 音乐源 |
| `name` | **是** | — | 关键词 |
| `count` | 否 | 20 | 每页数量 |
| `pages` | 否 | 1 | 页码 |

**响应：** 统一格式数组

```json
[{
  "id": "509781655",
  "name": "想你就写信 (Live)",
  "artist": ["周杰伦", "李硕", "张鑫"],
  "album": "中国新歌声第二季 第13期",
  "pic_id": "109951163038292176",
  "url_id": "509781655",
  "lyric_id": "509781655",
  "source": "netease"
}]
```

### 获取播放链接

```
/api/?types=url&source=netease&id=509781655
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `source` | 否 | netease | 音乐源 |
| `id` | **是** | — | 歌曲 ID（或 url_id） |

**响应：** `{"url":"https://...","size":...}`

### 获取封面

```
/api/?types=pic&source=netease&id=109951163038292176
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `source` | 否 | netease | 音乐源 |
| `id` | **是** | — | 封面 ID（或 pic_id） |

**响应：** `{"url":"https://..."}`

### 获取歌词

```
/api/?types=lyric&source=netease&id=509781655
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `source` | 否 | netease | 音乐源 |
| `id` | **是** | — | 歌词 ID（或 lyric_id） |

**响应：** `{"lyric":"[00:00...]","tlyric":"..."}`

> 某云歌词会自动缓存到 `cache/` 目录，下次请求直接读缓存。

### 获取歌单

```
/api/?types=playlist&id=3778678
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `id` | **是** | — | 歌单 ID |

**响应：** 某云原始格式（含 `playlist.tracks` 数组）

> 歌单缓存当天有效，每天自动刷新。

### 获取用户歌单列表

```
/api/?types=userlist&uid=287364143
```

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `uid` | **是** | — | 某云用户 ID |

**响应：** 某云 API 原始格式（含 `playlist[]` 数组）

> 此接口直接请求某云官方 API，不经过 Meting。

## 支持的音乐源

| 平台 | 代码 | 搜索 | 链接 | 封面 | 歌词 | 歌单 |
|---|---|---|---|---|---|---|
| 某云音乐 | `netease` | ✅ | ✅ | ✅ | ✅ | ✅ |
| QQ音乐 | `tencent` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 酷狗音乐 | `kugou` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 百度音乐 | `baidu` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 酷我音乐 | `kuwo` | ✅ | ✅ | ✅ | ✅ | ✅ |

## JSONP

所有 API 端点支持 JSONP，只需添加 `callback` 参数：

```
/api/?types=search&source=netease&name=hello&count=1&callback=myFunc
```

响应：`myFunc([{...}])`

## 许可证

MIT
