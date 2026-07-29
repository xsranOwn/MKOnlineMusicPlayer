# MKOnlinePlayer — Node.js API Server

基于 [@meting/core](https://github.com/metowolf/Meting) 构建的全栈音乐播放器后端，原 PHP 版本基于 [@mengkunsoft/MKOnlineMusicPlayer](https://github.com/mengkunsoft/MKOnlineMusicPlayer/)，**无需 nginx 和 PHP**。

## 快速开始

```bash
# 安装依赖（仅首次）
npm install
# 启动服务器（生产环境）
npm start
# 启动服务器（调试模式，前后端统一）
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

## API 端点[wiki](https://github.com/xsranOwn/MKOnlineMusicPlayer/wiki/api)

所有 API 请求路径以 `/api/` 开头，通过 `types` 参数路由，支持 GET/POST，支持 JSONP（加 `callback` 参数）。
