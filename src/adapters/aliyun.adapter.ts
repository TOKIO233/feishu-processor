import OSS from 'ali-oss';
import * as path from 'path';
import { ImageHostAdapter } from '../types';
import { Logger } from '../utils/logger';

export class AliyunAdapter implements ImageHostAdapter {
  name = '阿里云OSS';
  private client: OSS | null = null;

  constructor(private config: any) {}

  isConfigured(): boolean {
    return this.config.enabled &&
           !!this.config.accessKeyId &&
           !!this.config.accessKeySecret &&
           !!this.config.bucket &&
           !!this.config.endpoint;
  }

  logConfiguration(): void {
    if (this.isConfigured()) {
      Logger.info(`阿里云OSS图床已启用 (Bucket: ${this.config.bucket})`);
    } else {
      Logger.warning(`阿里云OSS图床配置不完整`);
    }
  }

  private getClient(): OSS {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new Error('阿里云OSS配置不完整');
      }

      this.client = new OSS({
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        bucket: this.config.bucket,
        endpoint: this.config.endpoint
      });

      Logger.info('阿里云OSS客户端初始化成功');
    }

    return this.client;
  }

  async upload(filePath: string, fileName: string): Promise<string> {
    try {
      const client = this.getClient();
      const objectKey = this.generateObjectKey(fileName);

      const result = await client.put(objectKey, filePath, {
        timeout: this.config.timeout || 30000
      });

      Logger.info(`阿里云OSS上传成功: ${objectKey}`);

      if (this.config.cdnDomain) {
        return `${this.config.cdnDomain}/${objectKey}`;
      }

      return result.url || `https://${this.config.bucket}.${this.config.endpoint}/${objectKey}`;
    } catch (error) {
      throw new Error(`阿里云OSS上传失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  private generateObjectKey(fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);

    return `images/${year}/${month}/${day}/${name}${ext}`;
  }
}