import * as path from 'path';
import { ImageHostAdapter, UploadResult } from '../types';
import { Logger } from '../utils/logger';

export class ImageUploader {
  private adapters: ImageHostAdapter[];

  constructor(adapters: ImageHostAdapter[]) {
    this.adapters = adapters.filter(adapter => adapter.isConfigured());

    if (this.adapters.length === 0) {
      throw new Error('没有可用的图床服务，请检查配置');
    }

    // 记录已配置的图床服务
    Logger.info(`已配置的图床服务: ${this.adapters.map(a => a.name).join(', ')}`);
  }

  async uploadImages(imagePaths: string[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    Logger.info(`开始上传 ${imagePaths.length} 张图片到 ${this.adapters[0].name}`);

    // 并发上传控制
    const concurrency = 3; // 固定并发数
    for (let i = 0; i < imagePaths.length; i += concurrency) {
      const batch = imagePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(async (imagePath) => {
        return this.uploadSingleImage(imagePath);
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        Logger.error(`批次上传失败: ${error instanceof Error ? error.message : error}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    Logger.info(`上传完成: 成功 ${successCount}/${imagePaths.length}`);

    return results;
  }

  private async uploadSingleImage(imagePath: string): Promise<UploadResult> {
    const fileName = path.basename(imagePath);

    try {
      if (!this.adapters[0]) {
        throw new Error('没有可用的图床适配器');
      }

      const newUrl = await this.adapters[0].upload(imagePath, fileName);

      return {
        originalPath: imagePath,
        newUrl,
        success: true,
        imageHost: this.adapters[0].name
      };
    } catch (error) {
      Logger.error(`图片上传失败 [${fileName}]: ${error instanceof Error ? error.message : error}`);

      return {
        originalPath: imagePath,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        imageHost: this.adapters[0]?.name || '未知'
      };
    }
  }
}