# 飞书文档处理工具

将飞书文档下载为 Markdown，并可选上传图片到图床后替换链接，提供 Web 界面一键处理。

## 功能概览

- 下载飞书文档为 Markdown（依赖 `feishu2md`）
- 支持微信公众号图床与阿里云 OSS 图床
- 自动替换 Markdown 中本地图片链接
- 结果文件支持直接下载，支持复制路径和内容

## 环境要求

- Node.js >= 18
- npm
- Linux / macOS（内置 `feishu2md` 安装脚本支持这两个平台）

## 快速开始

```bash
npm install
npm run start:all
```

`start:all` 会自动执行：

1. 加载 `.env` / `.env.local`
2. 安装依赖
3. 安装项目内置 `feishu2md`
4. 构建并启动服务

启动后访问：`http://localhost:3000`

如果未配置 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`，脚本会在终端中提示你交互输入，并可选择写入 `.env.local`。

## 配置方式（统一使用环境变量）

推荐使用 `.env.local` 管理敏感信息：

```bash
cp .env.example .env.local
```

至少需要填写：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

可选图床配置：

- 微信公众号图床：`WECHAT_ENABLED=true`、`WECHAT_APP_ID`、`WECHAT_APP_SECRET`
- 阿里云 OSS：`ALIYUN_ENABLED=true` 及对应 AK/SK、Bucket、Endpoint

说明：`config/default.json` 仅作为非敏感默认值，生产配置以环境变量为准。

## 如何获取凭证

### 1) 飞书凭证（`FEISHU_APP_ID` / `FEISHU_APP_SECRET`）

1. 进入飞书开放平台：`https://open.feishu.cn`
2. 创建企业自建应用
3. 配置并开通文档读取相关权限（详见 `feishu2md` 官方文档）
4. 发布应用版本
5. 在应用“凭证与基础信息”中获取 App ID 与 App Secret

### 2) 公众号图床凭证（`WECHAT_APP_ID` / `WECHAT_APP_SECRET`）

1. 登录微信开发者平台：`https://developers.weixin.qq.com/platform/`
2. 进入控制台，上方“我的业务与服务”里面选公众号
3. 获取 `AppID` 与 `AppSecret`
4. 将服务端出口 IP 加入公众号后台 IP 白名单

说明：微信 `access_token` 由程序在运行时自动获取，无需手动写入。

## 常用命令

```bash
npm run setup:feishu2md   # 仅安装项目内置 feishu2md
npm run build             # 编译 TypeScript
npm start                 # 启动服务（默认 3000）
PORT=3100 npm run start:all  # 指定端口启动
```

## 目录说明

- `src/`：核心代码（下载、处理、上传、Web API）
- `public/`：前端页面
- `scripts/`：一键安装与启动脚本
- `config/default.json`：非敏感默认配置
- `.env.example`：环境变量模板
