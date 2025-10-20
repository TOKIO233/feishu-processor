import * as path from 'path';
import * as fs from 'fs';

export function resolveImagePath(imagePath: string, basePath: string): string {
  if (isLocalImage(imagePath)) {
    // 如果是相对路径，基于base路径解析
    if (imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')) {
      return path.resolve(basePath, imagePath);
    }
  }
  return imagePath;
}

export function isLocalImage(src: string): boolean {
  // 检查是否为本地图片路径
  return !src.startsWith('http://') &&
         !src.startsWith('https://') &&
         !src.startsWith('data:') &&
         (src.endsWith('.jpg') ||
          src.endsWith('.jpeg') ||
          src.endsWith('.png') ||
          src.endsWith('.gif') ||
          src.endsWith('.bmp') ||
          src.endsWith('.webp'));
}

export function extractTitleFromMarkdown(content: string): string {
  // 匹配第一个一级标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // 如果没有一级标题，尝试使用二级标题
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }

  // 如果都没有，返回默认名称
  return '未命名文档';
}