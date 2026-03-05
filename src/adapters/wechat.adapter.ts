import * as fs from 'fs';
import axios from 'axios';
import { ImageHostAdapter } from '../types';
import { Logger } from '../utils/logger';

interface WechatTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatMediaResponse {
  media_id: string;
  url?: string;
  created_at?: number;
  errcode?: number;
  errmsg?: string;
}

export class WechatAdapter implements ImageHostAdapter {
  name = '微信公众号';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: any) {}

  isConfigured(): boolean {
    return this.config.enabled &&
           !!this.config.appId &&
           !!this.config.appSecret;
  }

  logConfiguration(): void {
    if (this.isConfigured()) {
      Logger.info(`微信公众号图床已启用`);
    } else {
      Logger.warning(`微信公众号图床配置不完整`);
    }
  }

  async upload(filePath: string, fileName: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('微信公众号配置不完整');
    }

    try {
      const token = await this.getAccessToken();
      const result = await this.uploadToWechat(token, filePath);

      if (!result.url) {
        throw new Error('微信公众号上传成功但未返回URL');
      }

      return result.url;
    } catch (error) {
      throw new Error(`微信公众号上传失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const url = `${this.config.apiBaseUrl}/token`;
    const params = {
      grant_type: 'client_credential',
      appid: this.config.appId,
      secret: this.config.appSecret
    };

    try {
      const response = await axios.get<WechatTokenResponse>(url, { params });

      if (response.data.errcode) {
        const errorMsg = `微信API错误 [${response.data.errcode}]: ${response.data.errmsg}`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
        return this.accessToken;
      } else {
        throw new Error('获取 access_token 失败');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error;
        throw new Error(`获取微信公众号 access_token 失败: ${axiosError.message} (状态: ${axiosError.response?.status})`);
      }
      throw new Error(`获取微信公众号 access_token 失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async uploadToWechat(token: string, filePath: string): Promise<WechatMediaResponse> {
    const addMaterialUrl = `${this.config.apiBaseUrl}/material/add_material?access_token=${token}&type=image`;

    if (!fs.existsSync(filePath)) {
      throw new Error(`图片文件不存在: ${filePath}`);
    }

    try {
      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('media', fs.createReadStream(filePath), {
        filename: filePath.split('\\').pop() || filePath.split('/').pop() || 'image.jpg',
        contentType: this.getContentType(filePath)
      });

      const response = await axios.post<any>(addMaterialUrl, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      if (response.data.errcode) {
        const errorMsg = `微信永久素材上传错误 [${response.data.errcode}]: ${response.data.errmsg}`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (response.data.media_id && response.data.url) {
        return {
          media_id: response.data.media_id,
          url: response.data.url,
          created_at: Date.now()
        };
      } else {
        throw new Error('永久素材上传响应格式异常');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error;
        throw new Error(`微信公众号永久素材上传失败: ${axiosError.message} (状态: ${axiosError.response?.status})`);
      }
      throw new Error(`微信公众号永久素材上传失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  private getContentType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return contentTypes[ext || 'jpg'] || 'image/jpeg';
  }
}