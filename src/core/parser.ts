import MarkdownIt from 'markdown-it';
import { ImageInfo } from '../types';
import { isLocalImage } from './file-utils';
import { Logger } from '../utils/logger';

const md = new MarkdownIt();

export function extractImages(content: string, basePath: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  const tokens = md.parse(content, {});

  function extractFromTokens(tokens: any[], position: number = 0) {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'image') {
        const src = token.attrGet('src');
        const alt = token.content || '';
        const title = token.attrGet('title') || undefined;

        if (src) {
          const imageInfo: ImageInfo = {
            src,
            alt,
            title,
            originalPath: src, // 保持原始相对路径，用于后续替换
            isLocal: isLocalImage(src),
            position: position + token.markup.length + 1
          };

          images.push(imageInfo);
        }
      }

      if (token.children && token.children.length > 0) {
        extractFromTokens(token.children, position + (token.markup?.length || 0));
      }

      position += token.content?.length || 0;
    }
  }

  extractFromTokens(tokens);

  return images;
}

export function replaceImageLinks(content: string, uploadResults: Array<{originalPath: string, newUrl: string}>): string {
  let newContent = content;

  for (const result of uploadResults) {
    if (result.newUrl) {
      const relativePath = result.originalPath;

      if (relativePath && newContent.includes(relativePath)) {
        const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`!\\[[^\\]]*\\]\\(${escapedPath}(?:\\s+"[^"]*")?\\)`, 'g');

        const matches = newContent.match(regex);
        if (matches) {
          Logger.info(`替换图片链接: ${relativePath}`);

          newContent = newContent.replace(regex, (match) => {
            const titleMatch = match.match(/"([^"]+)"\)$/);
            const title = titleMatch ? ` "${titleMatch[1]}"` : '';
            const altMatch = match.match(/!\[([^\]]*)\]/);
            const alt = altMatch ? altMatch[1] : '';

            return `![${alt}](${result.newUrl}${title})`;
          });
        }
      }
    }
  }

  return newContent;
}