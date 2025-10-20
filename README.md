# 飞书文档处理工具

一个集成飞书文档下载、图片上传和链接替换的完整解决方案。

## 功能特性

- 🚀 一键处理飞书文档：下载文档并上传图片到图床
- 📱 支持微信公众号图床
- ☁️ 支持阿里云 OSS 图床
- 🔗 自动替换 Markdown 中的图片链接
- 📝 生成基于一级标题的新文件名
- 🌐 简洁易用的 Web 界面
- 🛡️ 完善的错误处理和重试机制

## 项目结构

```
feishu-processor/
├── package.json                 # 根项目配置
├── README.md                   # 项目说明
├── tsconfig.json              # TypeScript配置
├── config/                    # 配置文件目录
│   └── default.json          # 图床配置
├── src/                      # 源代码目录
│   ├── web/                 # Web服务相关
│   │   ├── server.js        # Express服务器
│   │   └── api.js           # API路由
│   ├── core/                # 核心处理逻辑
│   │   ├── parser.ts        # Markdown解析
│   │   ├── processor.ts     # 主处理器
│   │   ├── uploader.ts      # 图片上传器
│   │   └── file-utils.ts    # 文件工具
│   ├── adapters/            # 图床适配器
│   │   ├── wechat.adapter.ts # 微信适配器
│   │   └── aliyun.adapter.ts # 阿里云适配器
│   ├── types/               # TypeScript类型定义
│   │   └── index.ts
│   └── utils/               # 工具函数
│       ├── logger.ts        # 日志工具
│       ├── config.ts        # 配置工具
│       └── file.ts          # 文件工具
├── public/                  # 静态资源
│   └── index.html          # 主页面
├── downloads/              # 下载目录（运行时创建）
└── dist/                   # 编译输出目录
```

## 安装和配置

### 1. 安装依赖

```bash
cd feishu-processor
npm install
```

### 2. 配置图床服务

编辑 `config/default.json` 文件：

```json
{
  "imageHosts": {
    "wechat": {
      "enabled": false,
      "appId": "your_app_id",
      "appSecret": "your_app_secret",
      "apiBaseUrl": "https://api.weixin.qq.com/cgi-bin"
    },
    "aliyun": {
      "enabled": true,
      "region": "oss-cn-hangzhou",
      "accessKeyId": "your_access_key_id",
      "accessKeySecret": "your_access_key_secret",
      "bucket": "your_bucket_name",
      "endpoint": "your_endpoint"
    }
  },
  "upload": {
    "maxConcurrency": 5,
    "retryCount": 3,
    "timeout": 30000
  }
}
```

### 3. 安装 feishu2md 工具

确保系统已安装 `feishu2md` 工具并添加到 PATH，或者将可执行文件放在项目根目录。

## 使用方法

### Web界面使用

1. 启动服务：
```bash
npm start
```

2. 打开浏览器访问：`http://localhost:3000`

3. 输入飞书文档URL，点击"开始处理"

### 命令行使用（编译后）

```bash
# 编译TypeScript代码
npm run build

# 使用Node.js直接处理
node -e "
const { MarkdownProcessor } = require('./dist/core/processor');
const processor = new MarkdownProcessor();
processor.processFile('./downloads/your-file.md').then(console.log);
"
```

## 配置说明

### 微信公众号图床

- `appId`: 微信公众号 AppID
- `appSecret`: 微信公众号 AppSecret
- `apiBaseUrl`: API 基础URL（一般不需要修改）

**注意**：需要将服务器IP添加到微信公众号IP白名单中。

### 阿里云OSS图床

- `region`: OSS 区域
- `accessKeyId`: 阿里云 AccessKey ID
- `accessKeySecret`: 阿里云 AccessKey Secret
- `bucket`: OSS 存储桶名称
- `endpoint`: OSS 访问域名
- `cdnDomain`: CDN 域名（可选）

## 工作流程

1. **下载文档**：使用 feishu2md 下载飞书文档为 Markdown 格式
2. **解析图片**：提取 Markdown 文件中的所有本地图片链接
3. **批量上传**：并发上传本地图片到配置的图床服务
4. **替换链接**：将本地链接替换为图床 URL
5. **生成新文件**：以一级标题作为新文件名保存

## API接口

### POST /api/process

完整的文档处理流程（下载 + 上传）

**请求体**：
```json
{
  "url": "https://feishu.cn/docx/..."
}
```

**响应**：
```json
{
  "success": true,
  "download": {
    "filePath": "/path/to/downloaded/file.md",
    "fileName": "document.md"
  },
  "upload": {
    "totalImages": 5,
    "successCount": 5,
    "failedCount": 0,
    "newFileName": "document-name.md"
  }
}
```

### POST /api/download

仅下载飞书文档

### POST /api/upload

仅处理图片上传

## 错误处理

- 上传失败的图片会自动跳过
- 支持 3 次重试机制
- 详细的错误日志输出
- 不会修改原始文件

## 开发

### 开发模式

```bash
npm run dev
```

### 编译

```bash
npm run build
```

## 依赖项

- Node.js >= 14
- TypeScript
- Express.js
- markdown-it
- ali-oss
- axios
- chalk
- ora

## 许可证

MIT License