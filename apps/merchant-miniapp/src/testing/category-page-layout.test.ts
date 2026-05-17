import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const pageDir = '/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/categories';

describe('category management page layout', () => {
  it('edits categories through a floating panel instead of a fixed top form', async () => {
    const [template, styles, pageSource] = await Promise.all([
      readFile(`${pageDir}/index.wxml`, 'utf8'),
      readFile(`${pageDir}/index.wxss`, 'utf8'),
      readFile(`${pageDir}/index.ts`, 'utf8')
    ]);

    expect(template).not.toContain('class="editor-card"');
    expect(template).toContain('class="category-fab"');
    expect(template).toContain('class="category-editor-mask"');
    expect(template).toContain('wx:if="{{isEditorOpen}}"');
    expect(template).toContain('bindtap="closeEditor"');
    expect(template).toContain('catchtap="handleEditorPanelTap"');

    expect(styles).toContain('.category-fab');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('bottom: calc(84rpx + env(safe-area-inset-bottom))');
    expect(styles).toContain('.category-editor-mask');
    expect(styles).toContain('align-items: flex-end');

    expect(pageSource).toContain('isEditorOpen: false');
    expect(pageSource).toContain("editorTitle: '新建品类'");
    expect(pageSource).toContain("editorTitle: '编辑品类'");
    expect(pageSource).toContain('closeEditor(this: CategoryPageInstance)');
  });
});
