const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { MarkdownProcessor } = require('../../dist/core/processor');

const router = express.Router();

// 处理飞书文档下载
router.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请提供飞书文档URL' });
  }

  try {
    // 创建下载目录
    const downloadsDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // 执行 feishu2md 下载
    const result = await executeFeishuDownload(url, downloadsDir);
    res.json(result);
  } catch (error) {
    console.error('下载失败:', error);
    res.status(500).json({
      error: '下载失败',
      details: error.message
    });
  }
});

// 处理图片上传
router.post('/upload', async (req, res) => {
  const { filePath, outputDir } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径' });
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 输出路径可以是相对路径或绝对路径
    if (outputDir && typeof outputDir !== 'string') {
      return res.status(400).json({ error: '输出路径格式无效' });
    }

    // 创建处理器并处理文件
    const processor = new MarkdownProcessor();
    const result = await processor.processFile(filePath, outputDir);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({
      error: '上传失败',
      details: error.message
    });
  }
});

// 完整处理流程：下载 + 上传
router.post('/process', async (req, res) => {
  const { url, outputDir } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请提供飞书文档URL' });
  }

  try {
    // 输出路径可以是相对路径或绝对路径
    if (outputDir && typeof outputDir !== 'string') {
      return res.status(400).json({ error: '输出路径格式无效' });
    }

    // 第一步：下载文档
    const downloadsDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    console.log('开始下载飞书文档...');
    const downloadResult = await executeFeishuDownload(url, downloadsDir);

    if (!downloadResult.success) {
      console.error('文档下载失败:', downloadResult.error);
      throw new Error(downloadResult.error || '下载失败');
    }

    console.log('✅ 文档下载完成:', downloadResult.filePath);

    // 第二步：处理图片上传
    console.log('开始处理图片上传...');
    const processor = new MarkdownProcessor();
    const uploadResult = await processor.processFile(downloadResult.filePath, outputDir);

    console.log('✅ 图片处理完成，成功上传', uploadResult.successCount, '张图片');

    res.json({
      success: true,
      download: downloadResult,
      upload: uploadResult
    });

  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    console.error('错误详情:', error);
    res.status(500).json({
      error: '处理失败',
      details: error.message
    });
  }
});

// 执行飞书下载的辅助函数
function executeFeishuDownload(url, downloadsDir) {
  return new Promise((resolve, reject) => {
    // 假设 feishu2md 在系统PATH中，或者在同一目录下
    const feishuCommand = process.platform === 'win32' ? 'feishu2md.exe' : 'feishu2md';

    // 添加调试日志：打印传递给feishu2md的URL
    console.log('🔍 调试信息：传递给feishu2md的URL:', url);
    console.log('🔍 调试信息：执行命令:', feishuCommand, 'dl', url);
    console.log('🔍 调试信息：工作目录:', downloadsDir);

    const childProcess = spawn(feishuCommand, ['dl', url], {
      cwd: downloadsDir,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        // 尝试从输出中找到生成的文件
        const output = stdout + stderr;
        const markdownFile = findMarkdownFile(downloadsDir);

        if (markdownFile) {
          resolve({
            success: true,
            filePath: markdownFile,
            output: output
          });
        } else {
          reject(new Error('未找到生成的markdown文件'));
        }
      } else {
        reject(new Error(`feishu2md执行失败，退出码: ${code}, 错误: ${stderr}`));
      }
    });

    childProcess.on('error', (error) => {
      reject(new Error(`启动feishu2md失败: ${error.message}。请确保feishu2md已安装并在PATH中。`));
    });
  });
}

// 查找markdown文件 - 查找最新创建的文件
function findMarkdownFile(dir) {
  const files = fs.readdirSync(dir);
  const markdownFiles = files.filter(file => file.endsWith('.md'));

  if (markdownFiles.length > 0) {
    // 添加调试信息
    console.log('🔍 调试信息：找到的markdown文件:', markdownFiles);

    // 获取文件状态并按创建时间排序，选择最新的文件
    const fileStats = markdownFiles.map(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        created: stats.birthtime.getTime(),
        modified: stats.mtime.getTime()
      };
    });

    // 按创建时间排序，选择最新的
    fileStats.sort((a, b) => Math.max(b.created, b.modified) - Math.max(a.created, a.modified));

    console.log('🔍 调试信息：选择的文件:', fileStats[0].path);
    return fileStats[0].path;
  }
  return null;
}

// 读取文件内容API
router.post('/read-file', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径' });
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    res.json({
      success: true,
      content: content,
      fileName: fileName,
      size: Buffer.byteLength(content, 'utf8')
    });
  } catch (error) {
    console.error('读取文件失败:', error);
    res.status(500).json({
      error: '读取文件失败',
      details: error.message
    });
  }
});

module.exports = router;