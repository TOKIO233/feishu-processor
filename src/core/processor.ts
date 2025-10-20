import * as path from 'path';
import { extractImages, replaceImageLinks } from './parser';
import { ImageUploader } from './uploader';
import { readMarkdownFile, writeMarkdownFile, extractFirstTitle, generateFileName, fileExists, resolveImagePath } from '../utils/file';
import { Logger } from '../utils/logger';
import { ProcessingResult, UploadResult } from '../types';
import { WechatAdapter } from '../adapters/wechat.adapter';
import { AliyunAdapter } from '../adapters/aliyun.adapter';
import { loadConfig, validateConfig } from '../utils/config';

export class MarkdownProcessor {
  private uploader: ImageUploader;

  constructor(configPath?: string) {
    const config = loadConfig(configPath);

    if (!validateConfig(config)) {
      throw new Error('配置验证失败');
    }

    const adapters = [
      new WechatAdapter(config.imageHosts.wechat),
      new AliyunAdapter(config.imageHosts.aliyun)
    ];

    this.uploader = new ImageUploader(adapters);
  }

  async processFile(inputPath: string, outputDir?: string): Promise<ProcessingResult> {
    Logger.info(`开始处理文件: ${inputPath}`);

    if (!fileExists(inputPath)) {
      throw new Error(`输入文件不存在: ${inputPath}`);
    }

    const content = readMarkdownFile(inputPath);
    const images = extractImages(content, inputPath);

    Logger.info(`发现 ${images.length} 张图片`);

    const localImages = images.filter(img => img.isLocal);
    Logger.info(`其中 ${localImages.length} 张为本地图片需要上传`);

    let uploadResults: UploadResult[] = [];

    if (localImages.length > 0) {
      // 将相对路径转换为绝对路径用于上传，但保留原始相对路径用于替换
      const localImagePaths = localImages.map(img => resolveImagePath(inputPath, img.originalPath));
      uploadResults = await this.uploader.uploadImages(localImagePaths);
    }

    const successUploads = uploadResults.filter(r => r.success && r.newUrl);
    Logger.info(`成功上传 ${successUploads.length} 张图片`);

    // 将上传结果与本地图片信息进行匹配，映射回相对路径
    const replacements: Array<{originalPath: string, newUrl: string}> = [];
    successUploads.forEach((upload, index) => {
      // 找到对应的本地图片信息
      const localImage = localImages.find(img => {
        const absolutePath = resolveImagePath(inputPath, img.originalPath);
        return absolutePath === upload.originalPath;
      });

      if (localImage) {
        replacements.push({
          originalPath: localImage.originalPath, // 使用相对路径
          newUrl: upload.newUrl!
        });
      }
    });

    let newContent = content;
    if (replacements.length > 0) {
      Logger.info('开始替换图片链接...');
      newContent = replaceImageLinks(content, replacements);
      Logger.info('图片链接替换完成');
    }

    const outputPath = this.generateOutputPath(inputPath, newContent, outputDir);
    writeMarkdownFile(outputPath, newContent);

    const result: ProcessingResult = {
      totalImages: images.length,
      successCount: successUploads.length,
      failedCount: localImages.length - successUploads.length,
      uploadResults,
      newFileName: path.basename(outputPath),
      outputPath: outputPath // 添加输出路径到结果中
    };

    return result;
  }

  private generateOutputPath(inputPath: string, content: string, outputDir?: string): string {
    const inputDir = path.dirname(inputPath);
    const title = extractFirstTitle(content);
    const outputFileName = title ? generateFileName(title) : 'processed.md';

    // 如果指定了输出目录，使用输出目录；否则使用输入文件所在目录
    const targetDir = outputDir || inputDir;

    // 确保输出目录存在
    const fs = require('fs');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      Logger.info(`创建输出目录: ${targetDir}`);
    }

    return path.join(targetDir, outputFileName);
  }
}