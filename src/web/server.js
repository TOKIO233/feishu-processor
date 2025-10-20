const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入API路由
const apiRouter = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../public')));

// API路由
app.use('/api', apiRouter);

// 默认路由 - 返回主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '页面未找到',
    message: `路径 ${req.originalUrl} 不存在`
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`飞书文档处理服务已启动`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
});

module.exports = app;