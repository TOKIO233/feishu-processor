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
      throw new Error(downloadResult.error || '下载失败');
    }

    // 第二步：处理图片上传
    console.log('开始处理图片上传...');
    const processor = new MarkdownProcessor();
    const uploadResult = await processor.processFile(downloadResult.filePath, outputDir);

    res.json({
      success: true,
      download: downloadResult,
      upload: uploadResult
    });

  } catch (error) {
    console.error('处理失败:', error);
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

// 查找markdown文件
function findMarkdownFile(dir) {
  const files = fs.readdirSync(dir);
  const markdownFiles = files.filter(file => file.endsWith('.md'));

  if (markdownFiles.length > 0) {
    return path.join(dir, markdownFiles[0]);
  }
  return null;
}

module.exports = router;