import * as fs from 'fs';
import * as path from 'path';
import { extractTitleFromMarkdown } from '../core/file-utils';

export function readMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`读取文件失败: ${filePath} (${error instanceof Error ? error.message : error})`);
  }
}

export function writeMarkdownFile(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`写入文件失败: ${filePath} (${error instanceof Error ? error.message : error})`);
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function extractFirstTitle(content: string): string {
  return extractTitleFromMarkdown(content);
}

export function generateFileName(title: string): string {
  // 移除特殊字符，只保留中文、英文、数字和连字符
  return `${title.replace(/[<>:"/\\|?*]/g, '').trim()}.md`;
}

export function resolveImagePath(basePath: string, relativePath: string): string {
  return path.resolve(path.dirname(basePath), relativePath);
}