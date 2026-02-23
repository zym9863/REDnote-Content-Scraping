# 小红书作品信息采集浏览器插件 — 设计文档

## 概述

基于 WXT + Svelte 5 的浏览器插件，用于采集小红书（xiaohongshu.com）笔记作品信息，支持笔记详情页、用户主页、搜索结果三种场景。

## 技术栈

- **框架**: WXT 0.20.x + Svelte 5
- **包管理**: pnpm
- **语言**: TypeScript
- **存储**: chrome.storage.local

## 采集场景

| 场景 | URL 模式 | 说明 |
|------|---------|------|
| 笔记详情页 | `https://www.xiaohongshu.com/explore/*`, `https://www.xiaohongshu.com/discovery/item/*` | 单条笔记详情 |
| 用户主页 | `https://www.xiaohongshu.com/user/profile/*` | 用户发布的笔记列表 |
| 搜索结果 | `https://www.xiaohongshu.com/search_result/*` | 搜索结果列表 |

## 采集字段

### 数据模型 NoteItem

```typescript
interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: 'normal' | 'video';

  likeCount: number;
  collectCount: number;
  commentCount: number;
  shareCount: number;

  author: {
    id: string;
    nickname: string;
    avatar: string;
    homeUrl: string;
  };

  images: string[];
  video?: string;

  noteUrl: string;
  collectedAt: number;
  source: 'api' | 'dom';
}
```

## 架构方案：API 拦截为主 + DOM 解析降级

```
┌─────────────────────────────────────────────┐
│  Popup (Svelte 5)                           │
│  - 采集数据列表 & 筛选                        │
│  - 导出 JSON / CSV                           │
│  - 采集状态 & 统计                            │
└────────────────────┬────────────────────────┘
                     │ browser.runtime.sendMessage
┌────────────────────▼────────────────────────┐
│  Background (数据中枢)                       │
│  - 接收 & 存储采集数据 (chrome.storage.local) │
│  - 消息路由 (popup ↔ content)                │
└────────────────────┬────────────────────────┘
                     │ browser.tabs.sendMessage
┌────────────────────▼────────────────────────┐
│  Content Scripts (ISOLATED world)            │
│  - 接收 MAIN world 的 API 数据 (CustomEvent) │
│  - DOM 解析降级采集                           │
│  - 注入浮动操作按钮 (FAB)                     │
│  - 转发数据到 Background                     │
├─────────────────────────────────────────────┤
│  Content Script (MAIN world)                 │
│  - 拦截 fetch / XHR                          │
│  - 过滤小红书 API 响应                        │
│  - 通过 CustomEvent 传给 ISOLATED world       │
└─────────────────────────────────────────────┘
```

## 文件结构

```
src/
├── entrypoints/
│   ├── background.ts              # 数据中枢 & 消息路由
│   ├── interceptor.content.ts     # MAIN world - API 拦截
│   ├── collector.content/         # ISOLATED world - 数据收集 & 浮动UI
│   │   ├── index.ts
│   │   ├── App.svelte
│   │   └── style.css
│   └── popup/
│       ├── index.html
│       ├── main.ts
│       ├── App.svelte
│       └── app.css
├── lib/
│   ├── storage.ts                 # storage.defineItem 定义
│   ├── types.ts                   # NoteItem 等类型定义
│   ├── parser.ts                  # DOM 解析逻辑
│   ├── api-extractor.ts           # API 响应数据提取
│   ├── exporter.ts                # JSON / CSV 导出
│   └── constants.ts               # URL 模式 & API 路径常量
└── components/
    ├── NoteCard.svelte            # 单条笔记展示卡片
    ├── ExportButton.svelte        # 导出按钮组件
    └── FloatingButton.svelte      # 页面内浮动按钮
```

## 核心流程

### 自动采集（API 拦截）

1. `interceptor.content.ts` (MAIN world, runAt: document_start) 拦截 `window.fetch`
2. 匹配 `/api/sns/web/` 相关 API 响应
3. 通过 `CustomEvent('xhs-scraper-data')` 传给 ISOLATED world
4. `collector.content` 调用 `api-extractor.ts` 提取结构化数据
5. 通过 `browser.runtime.sendMessage` 发给 background
6. background 去重后存入 `chrome.storage.local`

### 手动采集（DOM 降级）

1. 用户点击页面浮动按钮或 popup 中的"采集当前页"
2. `collector.content` 调用 `parser.ts` 解析当前页面 DOM
3. 后续流程同自动采集

### 数据导出

1. Popup 中选择导出格式（JSON / CSV）
2. 从 storage 读取数据
3. `exporter.ts` 生成文件内容
4. 通过 `URL.createObjectURL` + `<a>` 标签触发下载

## 权限

```json
{
  "permissions": ["storage", "activeTab", "tabs"],
  "host_permissions": ["https://*.xiaohongshu.com/*"]
}
```

## 导出格式

- **JSON**: 完整结构化数据，数组形式
- **CSV**: 扁平化字段，图片/标签用分号分隔，UTF-8 BOM 编码（兼容 Excel）
