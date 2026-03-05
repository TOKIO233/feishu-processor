import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Config } from '../types';
import { Logger } from './logger';

let envLoaded = false;

function loadEnvFiles(): void {
  if (envLoaded) {
    return;
  }

  const root = process.cwd();
  const envPaths = [
    path.join(root, '.env.local'),
    path.join(root, '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  envLoaded = true;
}

function parseBool(value?: string): boolean | undefined {
  if (value === undefined || value === null || value.trim() === '') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseNum(value?: string): number | undefined {
  if (value === undefined || value === null || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function applyEnvOverrides(config: Config): Config {
  const merged: Config = JSON.parse(JSON.stringify(config));

  const wechatEnabled = parseBool(process.env.WECHAT_ENABLED);
  if (wechatEnabled !== undefined) merged.imageHosts.wechat.enabled = wechatEnabled;
  if (process.env.WECHAT_APP_ID) merged.imageHosts.wechat.appId = process.env.WECHAT_APP_ID;
  if (process.env.WECHAT_APP_SECRET) merged.imageHosts.wechat.appSecret = process.env.WECHAT_APP_SECRET;
  if (process.env.WECHAT_API_BASE_URL) merged.imageHosts.wechat.apiBaseUrl = process.env.WECHAT_API_BASE_URL;

  const aliyunEnabled = parseBool(process.env.ALIYUN_ENABLED);
  if (aliyunEnabled !== undefined) merged.imageHosts.aliyun.enabled = aliyunEnabled;
  if (process.env.ALIYUN_REGION) merged.imageHosts.aliyun.region = process.env.ALIYUN_REGION;
  if (process.env.ALIYUN_ACCESS_KEY_ID) merged.imageHosts.aliyun.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  if (process.env.ALIYUN_ACCESS_KEY_SECRET) merged.imageHosts.aliyun.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  if (process.env.ALIYUN_BUCKET) merged.imageHosts.aliyun.bucket = process.env.ALIYUN_BUCKET;
  if (process.env.ALIYUN_ENDPOINT) merged.imageHosts.aliyun.endpoint = process.env.ALIYUN_ENDPOINT;
  if (process.env.ALIYUN_CDN_DOMAIN) merged.imageHosts.aliyun.cdnDomain = process.env.ALIYUN_CDN_DOMAIN;

  const uploadMaxConcurrency = parseNum(process.env.UPLOAD_MAX_CONCURRENCY);
  if (uploadMaxConcurrency !== undefined) merged.upload.maxConcurrency = uploadMaxConcurrency;
  const uploadRetryCount = parseNum(process.env.UPLOAD_RETRY_COUNT);
  if (uploadRetryCount !== undefined) merged.upload.retryCount = uploadRetryCount;
  const uploadTimeout = parseNum(process.env.UPLOAD_TIMEOUT);
  if (uploadTimeout !== undefined) merged.upload.timeout = uploadTimeout;

  const outputBackup = parseBool(process.env.OUTPUT_BACKUP_ORIGINAL);
  if (outputBackup !== undefined) merged.output.backupOriginal = outputBackup;
  if (process.env.OUTPUT_REPLACE_STRATEGY === 'replace' || process.env.OUTPUT_REPLACE_STRATEGY === 'backup') {
    merged.output.replaceStrategy = process.env.OUTPUT_REPLACE_STRATEGY;
  }

  return merged;
}

function hasNonPlaceholder(value?: string): boolean {
  if (!value) {
    return false;
  }
  return !/^your_.+_here$/i.test(value.trim());
}

function getConfigPath(configPath?: string): string {
  if (configPath) {
    return configPath;
  }

  // 默认配置文件路径
  const defaultPaths = [
    path.join(process.cwd(), 'config', 'default.json'),
    path.join(process.cwd(), 'config.json'),
    path.join(__dirname, '../../config', 'default.json')
  ];

  for (const configPath of defaultPaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  throw new Error('找不到配置文件，请检查 config/default.json 是否存在');
}

export function loadConfig(configPath?: string): Config {
  try {
    loadEnvFiles();
    const configFilePath = getConfigPath(configPath);
    const configData = fs.readFileSync(configFilePath, 'utf-8');
    const fileConfig = JSON.parse(configData) as Config;
    const config = applyEnvOverrides(fileConfig);

    Logger.info(`配置文件加载成功: ${configFilePath}`);
    return config;
  } catch (error) {
    if (error instanceof Error && error.message.includes('找不到配置文件')) {
      throw error;
    }
    throw new Error(`配置文件加载失败: ${error instanceof Error ? error.message : error}`);
  }
}

export function validateConfig(config: Config): boolean {
  try {
    // 检查基本结构
    if (!config.imageHosts || !config.upload) {
      Logger.error('配置文件缺少必要的字段');
      return false;
    }

    // 检查是否至少有一个图床服务启用
    const wechatEnabled = config.imageHosts.wechat?.enabled;
    const aliyunEnabled = config.imageHosts.aliyun?.enabled;

    if (!wechatEnabled && !aliyunEnabled) {
      Logger.warning('未启用图床服务，将仅复制文档内容不上传图片');
      return true; // 允许无图床配置继续工作
    }

    // 验证微信配置
    if (wechatEnabled) {
      const wechat = config.imageHosts.wechat;
      if (!hasNonPlaceholder(wechat.appId) || !hasNonPlaceholder(wechat.appSecret) || !hasNonPlaceholder(wechat.apiBaseUrl)) {
        Logger.error('微信公众号配置不完整，请检查 appId、appSecret 和 apiBaseUrl');
        return false;
      }
    }

    // 验证阿里云配置
    if (aliyunEnabled) {
      const aliyun = config.imageHosts.aliyun;
      if (
        !hasNonPlaceholder(aliyun.accessKeyId) ||
        !hasNonPlaceholder(aliyun.accessKeySecret) ||
        !hasNonPlaceholder(aliyun.bucket) ||
        !hasNonPlaceholder(aliyun.endpoint)
      ) {
        Logger.error('阿里云OSS配置不完整，请检查 accessKeyId、accessKeySecret、bucket 和 endpoint');
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error(`配置验证失败: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}
