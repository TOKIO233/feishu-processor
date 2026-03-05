export interface ImageInfo {
  src: string;
  alt: string;
  title?: string;
  originalPath: string;
  isLocal: boolean;
  position: number;
}

export interface UploadResult {
  originalPath: string;
  newUrl?: string;
  success: boolean;
  error?: string;
  imageHost?: string;
}

export interface ImageHostConfig {
  enabled: boolean;
  [key: string]: any;
}

export interface WechatConfig extends ImageHostConfig {
  appId: string;
  appSecret: string;
  apiBaseUrl: string;
}

export interface AliyunConfig extends ImageHostConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  cdnDomain?: string;
}

export interface Config {
  imageHosts: {
    wechat: WechatConfig;
    aliyun: AliyunConfig;
  };
  upload: {
    maxConcurrency: number;
    retryCount: number;
    timeout: number;
  };
  output: {
    backupOriginal: boolean;
    replaceStrategy: 'replace' | 'backup';
  };
}

export interface ImageHostAdapter {
  name: string;
  upload(filePath: string, fileName: string): Promise<string>;
  isConfigured(): boolean;
  logConfiguration(): void;
}

export interface ProcessingResult {
  totalImages: number;
  successCount: number;
  failedCount: number;
  uploadResults: UploadResult[];
  newFileName: string;
  outputPath?: string; // 可选的输出完整路径
}