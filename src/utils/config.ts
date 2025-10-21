import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../types';
import { Logger } from './logger';

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
    const configFilePath = getConfigPath(configPath);
    const configData = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(configData) as Config;

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
      if (!wechat.appId || !wechat.appSecret || !wechat.apiBaseUrl) {
        Logger.error('微信公众号配置不完整，请检查 appId、appSecret 和 apiBaseUrl');
        return false;
      }
    }

    // 验证阿里云配置
    if (aliyunEnabled) {
      const aliyun = config.imageHosts.aliyun;
      if (!aliyun.accessKeyId || !aliyun.accessKeySecret || !aliyun.bucket || !aliyun.endpoint) {
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