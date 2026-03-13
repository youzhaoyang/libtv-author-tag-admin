# LibTV 作者标签体系 —— 技术方案

> 版本：v1.0  
> 日期：2026-03-11  
> 关联需求：[LibTV作者标签体系需求规划.md](./LibTV作者标签体系需求规划.md)

---

## 一、方案概述

### 1.1 核心思路

作者标签体系的本质是：**运营在后台维护标签池 → 搜索作者并绑定标签 → 前台社区页面读取并展示标签**。

关键设计决策：

| 决策点 | 方案 | 理由 |
|--------|------|------|
| 标签存储 | 独立标签表 + 关联表 | 标签可复用、可独立管理，未来可扩展至作品/活动标签 |
| 标签颜色 | HEX 色值存储 | 前端直接渲染，不需要维护色值映射表 |
| 前台数据获取 | 随列表/详情接口一并返回 | 避免 N+1 请求，标签数据量小适合内联返回 |
| 缓存策略 | Redis 缓存作者标签 + 标签池 | 读多写少场景，缓存命中率高 |
| 后台技术栈 | 复用 admin-front 现有架构（Umi + Ant Design） | 与现有标签管理模块风格一致 |
| 前台技术栈 | 复用 liblibtv 现有架构（Next.js + Tailwind） | 在 CommunityCard 和 ProjectHeader 上扩展 |

### 1.2 改动范围

```
后台 admin-front                 后端服务                        前台 liblibtv
├── 标签管理页（新增）              ├── 标签 CRUD 接口（新增）         ├── CommunityCard（改造）
│   ├── pages/authorTag/          │   ├── POST /author-tag/save     │   └── 新增标签展示区
│   │   ├── tagList.tsx           │   ├── GET  /author-tag/paging   ├── ProjectHeader（改造）
│   │   └── authorList.tsx        │   ├── PUT  /author-tag/update   │   └── 新增标签展示区
│   ├── components/               │   └── DEL  /author-tag/delete   ├── AuthorTagBadge（新增）
│   │   ├── TagFormModal.tsx      ├── 作者搜索接口（新增）            │   └── 通用标签胶囊组件
│   │   └── AuthorTagModal.tsx    │   └── GET  /author/search       ├── services/community.ts（改造）
│   └── services/authorTag.ts     ├── 标签绑定接口（新增）            │   └── 类型扩展 creatorTags
├── 路由配置（改造）                │   └── PUT  /author/tags         └── API 层（改造）
│   └── config/routes.js          ├── 前台标签接口（改造）                └── 列表/详情接口扩展
└── 权限配置（改造）                │   └── 列表/详情接口内联返回
                                  └── 数据库（新增）
                                      ├── author_tag（标签表）
                                      └── author_tag_rel（关联表）
```

---

## 二、数据库设计

### 2.1 数量上限约束

| 维度 | 上限 | 校验方 | 说明 |
|------|------|--------|------|
| 系统标签总数 | **20** | 后端 Service 层 | 创建标签前 `SELECT COUNT(*) FROM author_tag WHERE is_deleted = 0` |
| 单作者绑定标签数 | **5** | 后端 Service 层 | 绑定标签前校验 `tagIds.length <= 5` |

> 上限值建议存入系统配置表，方便运营调整。

### 2.2 新增：作者标签表 `author_tag`

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | BIGINT PK AUTO_INCREMENT | — | 主键 |
| `name` | VARCHAR(32) | — | 标签名称，唯一索引 |
| `icon_url` | VARCHAR(1024) | '' | 标签图标 URL（选填，PNG/SVG，≤ 50KB） |
| `color` | VARCHAR(7) | — | HEX 色值，如 `#E53E3E` |
| `description` | VARCHAR(255) | '' | 内部备注 |
| `status` | TINYINT(1) | 1 | 1=启用 0=停用 |
| `sort_order` | INT | 0 | 全局排序权重，越小越靠前 |
| `created_by` | BIGINT | — | 创建人 ID |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |
| `is_deleted` | TINYINT(1) | 0 | 软删除标记 |

```sql
CREATE TABLE `author_tag` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL COMMENT '标签名称',
  `icon_url` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '标签图标URL',
  `color` VARCHAR(7) NOT NULL COMMENT 'HEX色值',
  `description` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '内部备注',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `created_by` BIGINT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作者标签';
```

### 2.2 新增：作者标签关联表 `author_tag_rel`

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | BIGINT PK AUTO_INCREMENT | — | 主键 |
| `author_id` | VARCHAR(64) | — | 作者 UUID |
| `tag_id` | BIGINT | — | 标签 ID |
| `sort_order` | INT | 0 | 该作者下的标签排序 |
| `created_by` | BIGINT | — | 操作人 ID |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | 创建时间 |

```sql
CREATE TABLE `author_tag_rel` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `author_id` VARCHAR(64) NOT NULL COMMENT '作者UUID',
  `tag_id` BIGINT NOT NULL COMMENT '标签ID',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '标签排序',
  `created_by` BIGINT NOT NULL COMMENT '操作人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_author_tag` (`author_id`, `tag_id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作者标签关联';
```

### 2.3 ER 关系

```
author_tag (1) ──── (N) author_tag_rel (N) ──── (1) user/author
   标签池                  关联表                   用户表（现有）
```

---

## 三、后端接口设计

> 后台接口统一前缀 `/api/admin`，通过 admin-front 的 `request` 封装自动拼接。

### 3.1 标签管理接口

#### 3.1.1 标签分页列表

```
GET /api/admin/author-tag/paging

Query Params:
  name?: string          // 标签名称（模糊搜索）
  status?: number        // 0=停用 1=启用，不传返回全部
  pageNo: number         // 页码，从 1 开始
  pageSize: number       // 每页条数，默认 20

Response:
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "精选",
        "iconUrl": "https://cdn.example.com/tags/star.png",
        "color": "#E53E3E",
        "description": "编辑精选优质作者",
        "status": 1,
        "sortOrder": 0,
        "createdBy": 10001,
        "createdByName": "运营A",
        "createdAt": "2026-03-11T10:00:00",
        "authorCount": 42          // 关联作者数
      }
    ],
    "total": 5,
    "pageNo": 1,
    "pageSize": 20
  }
}
```

#### 3.1.2 新增标签

```
POST /api/admin/author-tag/save

Request Body:
{
  "name": "精选",              // 必填，最大 32 字符
  "iconUrl": "https://...",    // 选填，图标 URL（通过 OSS 上传后获得）
  "color": "#E53E3E",          // 必填，HEX 格式
  "description": "描述",       // 选填
  "sortOrder": 0               // 选填，默认 0
}

Response:
{
  "code": 0,
  "data": { "id": 1 }
}

Error:
{
  "code": 40001,
  "message": "标签名称已存在"
}

Error（超出上限）:
{
  "code": 40003,
  "message": "标签数量已达上限（20/20）"
}
```

#### 3.1.3 编辑标签

```
PUT /api/admin/author-tag/update

Request Body:
{
  "id": 1,
  "name": "精选推荐",          // 选填
  "iconUrl": "https://...",    // 选填，空字符串表示移除图标
  "color": "#E53E3E",          // 选填
  "description": "描述",       // 选填
  "status": 1,                 // 选填，可用于启用/停用切换
  "sortOrder": 0               // 选填
}

Response:
{ "code": 0, "data": null }
```

#### 3.1.4 删除标签

```
DELETE /api/admin/author-tag/delete

Request Body:
{
  "id": 1
}

Response:
{ "code": 0, "data": null }

Error（标签仍有关联作者时，是否允许删除由产品决策，建议允许并级联解绑）:
{
  "code": 40002,
  "message": "该标签下仍有 42 位关联作者，确认删除？"
}
```

### 3.2 作者搜索与标签绑定接口

#### 3.2.1 搜索作者

```
GET /api/admin/author/search

Query Params:
  keyword: string        // 必填，搜索关键词
  searchType: string     // name | uuid | work_name
  pageNo: number
  pageSize: number

Response:
{
  "code": 0,
  "data": {
    "list": [
      {
        "authorId": "a1b2c3d4-...",
        "nickname": "小飞侠赛事",
        "avatar": "https://...",
        "workCount": 12,
        "tags": [
          { "id": 1, "name": "精选", "iconUrl": "https://...", "color": "#E53E3E", "sortOrder": 0 },
          { "id": 2, "name": "官方认证", "iconUrl": "", "color": "#3182CE", "sortOrder": 1 }
        ]
      }
    ],
    "total": 3,
    "pageNo": 1,
    "pageSize": 20
  }
}
```

#### 3.2.2 更新作者标签绑定（全量覆盖）

```
PUT /api/admin/author/tags

Request Body:
{
  "authorId": "a1b2c3d4-...",
  "tagIds": [1, 2, 3],         // 全量标签 ID 列表，空数组表示清空，最多 5 个
  "tagSorts": [                 // 可选，指定展示顺序
    { "tagId": 1, "sortOrder": 0 },
    { "tagId": 2, "sortOrder": 1 },
    { "tagId": 3, "sortOrder": 2 }
  ]
}

Response:
{ "code": 0, "data": null }

Error（超出单作者上限）:
{
  "code": 40004,
  "message": "单作者最多绑定 5 个标签"
}
```

### 3.3 前台接口（扩展现有接口）

#### 3.3.1 TV Show 列表接口扩展

在现有 `/api/community/project/template/feed/stream` 的返回结构中，为每个 item 扩展 `creatorTags` 字段：

```
// 现有字段
{
  "ownerId": "a1b2c3d4-...",
  "nickname": "小飞侠赛事",
  "avatar": "https://...",
  ...

  // 新增字段
  "creatorTags": [
    { "name": "精选", "iconUrl": "https://cdn.example.com/tags/star.png", "color": "#E53E3E" },
    { "name": "官方认证", "iconUrl": "", "color": "#3182CE" }
  ]
}
```

#### 3.3.2 视频详情接口扩展

在现有 `/api/community/project/template/detail` 的返回结构中同样扩展 `creatorTags` 字段，结构与列表一致。

---

## 四、后端核心逻辑

### 4.1 Service 层伪代码

#### 标签 CRUD

```
saveTag(req, operatorId):
  1. 校验标签总数上限
     → SELECT COUNT(*) FROM author_tag WHERE is_deleted = 0
     → count >= MAX_TAG_TOTAL(20) → return error("标签数量已达上限")
  2. 校验 name 唯一性（WHERE name = ? AND is_deleted = 0）
     → 重复 → return error("标签名称已存在")
  3. INSERT INTO author_tag(name, icon_url, color, description, sort_order, created_by)
  4. 清除标签池缓存
  5. return { id }

updateTag(req, operatorId):
  1. 若修改了 name → 校验新名称唯一性
  2. UPDATE author_tag SET ... WHERE id = ? AND is_deleted = 0
  3. 清除标签池缓存
  4. 若修改了 name / color / icon_url / status → 清除所有关联作者的标签缓存
     → SELECT author_id FROM author_tag_rel WHERE tag_id = ?
     → 批量 DEL Redis key: author:tags:{authorId}

deleteTag(tagId, operatorId):
  1. 软删除：UPDATE author_tag SET is_deleted = 1 WHERE id = ?
  2. 解除绑定：DELETE FROM author_tag_rel WHERE tag_id = ?
  3. 清除缓存：标签池 + 所有关联作者
```

#### 作者标签绑定（全量覆盖）

```
updateAuthorTags(authorId, tagIds, tagSorts, operatorId):

  0. 校验单作者标签上限
     → tagIds.length > MAX_TAG_PER_AUTHOR(5) → return error("单作者最多绑定 5 个标签")

  1. BEGIN TRANSACTION

  2. 删除该作者现有绑定
     DELETE FROM author_tag_rel WHERE author_id = ?

  3. 批量插入新绑定
     FOR each tagId in tagIds:
       INSERT INTO author_tag_rel(author_id, tag_id, sort_order, created_by)
       VALUES(?, tagId, tagSorts[tagId] ?? index, operatorId)

  4. COMMIT

  5. 清除该作者标签缓存
     DEL Redis key: author:tags:{authorId}
```

#### 前台标签查询（内联到列表/详情接口）

```
getCreatorTags(authorId):
  1. 查 Redis: author:tags:{authorId}
     → 命中 → return cached

  2. 查 DB:
     SELECT t.name, t.color
     FROM author_tag_rel r
     JOIN author_tag t ON r.tag_id = t.id
     WHERE r.author_id = ?
       AND t.status = 1
       AND t.is_deleted = 0
     ORDER BY r.sort_order ASC

  3. 写入 Redis（TTL 10min）
  4. return tags

批量查询优化（列表页场景）:
getCreatorTagsBatch(authorIds[]):
  1. 批量查 Redis: MGET author:tags:{id1}, author:tags:{id2}, ...
  2. 未命中的 authorId → 批量查 DB
  3. 写入 Redis
  4. return Map<authorId, tags[]>
```

### 4.2 缓存设计

| 缓存项 | Key 格式 | TTL | 写入时机 | 清除时机 |
|--------|---------|-----|---------|---------|
| 标签池（全量） | `author_tag:pool` | 30min | 首次访问 | 标签增删改 |
| 作者标签 | `author:tags:{authorId}` | 10min | 首次查询 | 绑定变更 / 关联标签属性变更 |
| 空值缓存 | `author:tags:{authorId}` = `[]` | 5min | 查询无结果时 | 绑定变更 |

### 4.3 性能考量

| 场景 | 方案 |
|------|------|
| 列表页批量查标签 | `getCreatorTagsBatch` 批量查询，避免 N+1 |
| 标签变更扩散 | 修改标签属性时，异步清除关联作者缓存（MQ 或异步线程） |
| 大量作者绑定同一标签 | 删除标签时的缓存清除通过异步队列处理，避免阻塞接口 |

---

## 五、后台前端方案（admin-front）

> 技术栈：Umi 3.5 + Ant Design 4 + umi-request + Less

### 5.1 路由配置（`config/routes.js`）

```javascript
{
  name: '作者标签管理',
  path: '/authorTag',
  authority: [PERMISSION.管理员, PERMISSION.标签管理],
  routes: [
    {
      name: '标签管理',
      path: 'tagList',
      component: './authorTag/tagList',
    },
    {
      name: '作者标签',
      path: 'authorList',
      component: './authorTag/authorList',
    },
  ],
}
```

### 5.2 文件结构

```
src/pages/authorTag/
├── tagList.tsx                    # 标签池管理页
├── authorList.tsx                 # 作者标签分配页
├── components/
│   ├── TagFormModal.tsx           # 新增/编辑标签弹窗
│   ├── AuthorTagModal.tsx         # 编辑作者标签弹窗
│   ├── ColorPicker.tsx            # 颜色选择器
│   └── IconUpload.tsx             # 图标上传组件
└── index.less                     # 样式

src/services/
└── authorTag.ts                   # API 封装
```

### 5.3 Service 层（`services/authorTag.ts`）

```typescript
import { Response } from '@/types/Response';
import request from '@/utils/request';

// ========== 标签管理 ==========

export interface TagItem {
  id: number;
  name: string;
  iconUrl: string;
  color: string;
  description: string;
  status: number;
  sortOrder: number;
  createdByName: string;
  createdAt: string;
  authorCount: number;
}

export interface TagListParams {
  name?: string;
  status?: number;
  pageNo: number;
  pageSize: number;
}

export async function queryTagList(params: TagListParams): Promise<Response<{ list: TagItem[]; total: number }>> {
  return request('/author-tag/paging', { method: 'GET', params });
}

export async function saveTag(data: { name: string; iconUrl?: string; color: string; description?: string; sortOrder?: number }) {
  return request('/author-tag/save', { method: 'POST', data });
}

export async function updateTag(data: Partial<TagItem> & { id: number }) {
  return request('/author-tag/update', { method: 'PUT', data });
}

export async function deleteTag(data: { id: number }) {
  return request('/author-tag/delete', { method: 'DELETE', data });
}

// ========== 作者标签分配 ==========

export interface AuthorItem {
  authorId: string;
  nickname: string;
  avatar: string;
  workCount: number;
  tags: { id: number; name: string; iconUrl: string; color: string; sortOrder: number }[];
}

export interface AuthorSearchParams {
  keyword: string;
  searchType: 'name' | 'uuid' | 'work_name';
  pageNo: number;
  pageSize: number;
}

export async function searchAuthors(params: AuthorSearchParams): Promise<Response<{ list: AuthorItem[]; total: number }>> {
  return request('/author/search', { method: 'GET', params });
}

export async function updateAuthorTags(data: {
  authorId: string;
  tagIds: number[];
  tagSorts?: { tagId: number; sortOrder: number }[];
}) {
  return request('/author/tags', { method: 'PUT', data });
}
```

### 5.4 标签管理页（`tagList.tsx`）

核心结构：搜索栏 + 表格 + 新增/编辑弹窗

```
┌──────────────────────────────────────────────────────────────┐
│  [标签名称: ______] [状态: 全部▾]  [搜索] [重置]               │
│                                 已创建 4/20   [+ 新增标签]    │
├──────────────────────────────────────────────────────────────┤
│  标签名称 │ 图标 │ 颜色   │ 描述     │ 关联作者数 │ 状态 │ 操作│
│──────────┼─────┼───────┼─────────┼──────────┼─────┼─────│
│  精选     │ 🏆  │ ██ 红  │ 优质作者 │    42    │ 启用 │ 编辑│
│           │     │       │         │          │     │ 停用│
│           │     │       │         │          │     │ 删除│
└──────────────────────────────────────────────────────────────┘
```

关键实现要点：

- 表格使用 `<Table>` + `columns` 配置，参考 `userGroup.tsx` 模式
- 图标列渲染图标缩略图：`<img src={record.iconUrl} />` 或空状态占位符
- 颜色列渲染色块预览：`<span style={{ background: record.color }} className="color-dot" />`
- 状态列使用 `<Switch>` 组件，切换时调用 `updateTag({ id, status })`
- 删除使用 `Modal.confirm` 二次确认
- 标签总数展示在「新增标签」按钮旁（如「已创建 4/20」），达到上限时按钮置灰

### 5.5 标签表单弹窗（`TagFormModal.tsx`）

```
┌─── 新增标签 / 编辑标签 ───────────────────┐
│                                           │
│  标签名称 *  [__________________]         │
│                                           │
│  标签图标    [📁 上传图标]  [× 移除]       │
│             (PNG/SVG，24×24，≤50KB)       │
│             🏆 预览                        │
│                                           │
│  标签颜色 *  [色板选择] / [#______]       │
│             ██ 预览                        │
│                                           │
│  排序权重    [__0__]                       │
│                                           │
│  备注描述    [__________________]         │
│             [__________________]         │
│                                           │
│              [取消]    [确定]              │
└───────────────────────────────────────────┘
```

关键实现要点：

- 使用 `<Modal>` + `<Form>` + `Form.useForm()`
- **图标上传**（`IconUpload.tsx`）：基于 Ant Design 的 `<Upload>` 组件，限制格式（PNG/SVG）和大小（≤ 50KB），上传至 OSS 后获得 URL；支持预览和移除
- 颜色选择器：使用预设色板 + HEX 输入框（可基于 Ant Design 的 `<Input>` + 自定义色板组件，或引入 `react-color`）
- 编辑模式通过 `editingTag` prop 区分，编辑时 `form.setFieldsValue` 回填
- 提交时校验：名称必填 + 颜色格式校验（`/^#[0-9A-Fa-f]{6}$/`）+ 图标选填

### 5.6 作者标签分配页（`authorList.tsx`）

```
┌──────────────────────────────────────────────────────┐
│  搜索类型: [作者名称▾] 关键词: [___________]  [搜索]   │
├──────────────────────────────────────────────────────┤
│  头像 │ 作者名称   │ UUID          │ 作品数 │ 标签  │ 操作│
│──────┼───────────┼──────────────┼──────┼──────┼─────│
│  🟤  │ 小飞侠赛事 │ a1b2c3d4... │  12  │精选   │ 编辑│
│      │           │             │      │官认   │     │
│  🟤  │ JOY堂多   │ e5f6g7h8... │   8  │      │ 编辑│
└──────────────────────────────────────────────────────┘
```

关键实现要点：

- 搜索类型使用 `<Select>` 切换（name / uuid / work_name）
- 表格标签列渲染彩色标签：`<Tag color={tag.color}>{tag.name}</Tag>`
- 点击「编辑」打开 `AuthorTagModal`

### 5.7 作者标签编辑弹窗（`AuthorTagModal.tsx`）

```
┌─── 编辑标签（小飞侠赛事）──────────────┐
│                                       │
│  选择标签：                             │
│  [✓] ██ 精选                           │
│  [✓] ██ 官方认证                        │
│  [ ] ██ 新锐创作者                      │
│  [ ] ██ 商业合作（已停用）               │
│                                       │
│              [取消]    [保存]           │
└───────────────────────────────────────┘
```

关键实现要点：

- 打开弹窗时请求标签池（全量启用标签）+ 该作者已绑定标签
- 使用 `<Checkbox.Group>` 实现多选
- 每个选项前渲染色块：`<span style={{ background: tag.color }} />`
- 保存时调用 `updateAuthorTags`，传入 `authorId` + 选中的 `tagIds`

### 5.8 用户管理 — 用户列表增强（`pages/user/index.js`）

> 在 admin-front 的「用户管理 → 用户列表」中实现 4.4 需求。

#### 5.8.1 批量查询

- `id`、`uuid` 输入框支持逗号分隔，如 `123,456`、`uuid1,uuid2`
- 后端 `/user/paging` 需支持：`id`、`uuid` 为逗号分隔字符串时解析为数组批量查询
- FormItem 增加 `extra="支持逗号分隔批量查询"` 提示

#### 5.8.2 批量选择与批量操作

- Table 配置 `rowSelection`：`selectedRowKeys` + `onChange`
- 批量操作按钮：`<Dropdown menu={{ items: [{ key: 'batchTvCert', label: '批量设置为TV认证作者', onClick }] }}>`
- 点击后 `Modal.confirm` 二次确认，确认后调用 `batchSetTvCertifiedAuthor({ userIds: selectedRowKeys })`
- 接口：`POST /author/tv/batch-certify`，Request Body：`{ userIds: string[] }`

#### 5.8.3 顶部 Tab 筛选

- 使用 `<Tabs>` 组件，`activeKey={certTab}`，`onChange` 时 `setCertTab` + `setPageNo(1)`
- Tab 项：`全部`、`已认证lib作者`、`已认证TV作者`
- 查询 payload 增加 `certType: certTab === 'all' ? undefined : certTab`
- 后端 `/user/paging` 需支持 `certType` 参数过滤

#### 5.8.4 身份类型与作者标签入口

- 身份类型 Select 增加 `lib_certified_author`、`tv_certified_author` 选项
- 编辑用户身份弹窗中同步增加上述选项
- 路由配置：用户管理下增加「作者标签」子菜单，`path: 'authorTag'`，`component: './user/authorTag'`
- `authorTag.js` 页面提供跳转链接至 LibTV 作者标签管理后台（或 iframe 嵌入）

---

## 六、原型设计（author-tag-admin-prototype）

> 独立 React + Vite 原型，用于需求评审与交互演示，可部署至 GitHub Pages / Vercel。

### 6.0 原型定位

| 维度 | 说明 |
|------|------|
| 技术栈 | React 18 + Vite 6 + CSS |
| 部署 | 单文件 HTML（vite-plugin-singlefile）→ GitHub Pages / Vercel |
| 覆盖范围 | 标签管理、作者标签分配、操作详情页（认证审核） |
| 数据 | Mock 数据，无后端依赖 |

### 6.1 原型结构

```
author-tag-admin-prototype/
├── src/
│   ├── App.jsx                 # 路由：标签管理 | 作者标签
│   ├── main.jsx                # 入口，DOMContentLoaded 后挂载
│   ├── components/
│   │   ├── TagFormModal.jsx    # 新增/编辑标签（图标必填、颜色统一、上传切图）
│   │   ├── ImageCropModal.jsx  # 图标裁剪（react-image-crop）
│   │   ├── AuthorTagModal.jsx  # 编辑作者标签
│   │   └── ...
│   ├── pages/
│   │   ├── TagManagementPage.jsx   # 标签管理
│   │   ├── AuthorTagPage.jsx      # 作者标签（按标签 Tab + 搜索）
│   │   └── AuthorDetailPage.jsx   # 操作详情（认证类型/周期/站内信）
│   ├── data/mockData.js        # 标签、作者、站内信模板
│   └── utils/tags.js           # getLabelTextColor、isDataUrl
├── vite.config.js              # base: /libtv-author-tag-admin/
├── vite.preview.config.js      # 单文件构建，base: ./
├── package.json                # deploy → docs/index.html
└── docs/index.html             # 部署产物（GitHub Pages）
```

### 6.2 原型与需求对齐

| 需求点 | 原型实现 |
|--------|---------|
| 标签图标必填 | TagFormModal 校验 `!iconUrl` 时提示「请选择预设图标或上传自定义图标」 |
| 删除颜色自定义 | 标签颜色统一为 `DEFAULT_TAG_COLOR`，表单无颜色选择 |
| 上传切图 | 上传 PNG/JPG 等非 SVG 时弹出 ImageCropModal，1:1 圆形裁剪为 24×24 |
| 标签管理 CRUD | TagManagementPage：列表、新增、编辑、停用、删除 |
| 作者标签分配 | AuthorTagPage：标签 Tab、搜索、编辑标签弹窗 |
| 操作详情页 | AuthorDetailPage：认证类型多选、生效周期、站内信、提交认证 |

### 6.3 部署方式

| 方式 | 命令 | 说明 |
|------|------|------|
| 本地预览 | `npm run preview:serve` | 单文件构建 + serve，端口 4173 |
| GitHub Pages | `npm run deploy` + push `docs/` | 构建单文件 → 替换 type=module → 推送到 main |
| Vercel | `npx vercel` 或导入仓库 | 自动识别 Vite，base 根据 VERCEL 环境切换 |

线上地址：https://youzhaoyang.github.io/libtv-author-tag-admin/

---

## 七、前台前端方案（liblibtv）

> 原「六、前台前端方案」章节，因新增「六、原型设计」后移。

> 技术栈：Next.js App Router + Zustand + Tailwind CSS v4 + Mantine 8

### 6.1 数据类型扩展

在 `services/community.ts` 中扩展现有类型：

```typescript
// 新增标签类型
export interface CreatorTag {
  name: string;
  iconUrl: string;   // 图标 URL，空字符串表示无图标
  color: string;     // HEX 色值
}

// 扩展现有 CommunityProjectItem
export interface CommunityProjectItem {
  // ...现有字段
  ownerId: string;
  nickname: string;
  avatar: string;

  // 新增
  creatorTags?: CreatorTag[];
}
```

### 6.2 新增组件：`AuthorTagBadge`

文件路径：`components/community/AuthorTagBadge.tsx`

```typescript
interface AuthorTagBadgeProps {
  tags?: CreatorTag[];
  maxDisplay?: number;  // 最多展示数量，默认 3
}
```

渲染逻辑：

- 遍历 `tags`（取前 `maxDisplay` 个）
- 每个标签渲染为胶囊样式：圆角矩形 + 自定义背景色 + 文字
- **有图标时**：`<img src={tag.iconUrl} />` + 标签名称，图标尺寸 12x12
- **无图标时**：仅展示标签名称
- Tailwind 类名参考：`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] leading-3 font-medium`
- 背景色通过 `style={{ backgroundColor: tag.color }}` 内联设置
- 文字颜色根据背景色亮度自动切换（深底白字 / 浅底深字）

### 6.3 列表页改造（`CommunityCard.tsx`）

在现有用户信息行（头像 + 昵称）之后插入标签区域：

```
现有结构（约 154-167 行）：
<div className="flex items-center gap-1.5">
  <Avatar src={item.avatar} />
  <span>{item.nickname}</span>
</div>

改造后：
<div className="flex items-center gap-1.5">
  <Avatar src={item.avatar} />
  <span>{item.nickname}</span>
  <AuthorTagBadge tags={item.creatorTags} maxDisplay={2} />
</div>
```

> 列表卡片空间有限，建议 `maxDisplay={2}`

### 6.4 详情页改造（`ProjectHeader.tsx`）

在作者昵称后方插入标签区域：

```
现有结构：
<div className="flex items-center gap-2">
  <Avatar src={detail.avatar} />
  <span>{detail.nickname}</span>
  <span>·</span>
  <span>{detail.description}</span>
</div>

改造后：
<div className="flex items-center gap-2">
  <Avatar src={detail.avatar} />
  <span>{detail.nickname}</span>
  <AuthorTagBadge tags={detail.creatorTags} maxDisplay={3} />
  <span>·</span>
  <span>{detail.description}</span>
</div>
```

### 6.5 深色背景适配

TV Show 页面为深色背景（参考截图），标签设计需保证可读性：

| 颜色方案 | 处理 |
|----------|------|
| 深色标签（如 #1A365D） | 白色文字 + 可能需要描边或提亮 |
| 浅色标签（如 #FEFCBF） | 需切换为深色文字 |

建议实现自动文字颜色判断：

```typescript
function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1A202C' : '#FFFFFF';
}
```

### 6.6 前台文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `services/community.ts` | **修改** | 新增 `CreatorTag` 类型，扩展 `CommunityProjectItem` |
| `components/community/AuthorTagBadge.tsx` | **新增** | 通用标签胶囊组件 |
| `views/community/CommunityCard.tsx` | **修改** | 用户信息行新增标签展示 |
| `views/community/ProjectHeader.tsx` | **修改** | 详情页作者信息新增标签展示 |

---

## 八、时序图

### 8.1 后台：运营给作者打标签

```
运营         admin-front        后端API          数据库         Redis
 │              │                 │                │              │
 │ 搜索作者      │                 │                │              │
 ├─────────────►│                 │                │              │
 │              │ GET /author/    │                │              │
 │              │ search          │                │              │
 │              ├────────────────►│                │              │
 │              │                 │ 查询用户表 +    │              │
 │              │                 │ 关联标签        │              │
 │              │                 ├───────────────►│              │
 │              │                 │◄───────────────┤              │
 │              │◄────────────────┤                │              │
 │◄─────────────┤ 展示搜索结果     │                │              │
 │              │                 │                │              │
 │ 点击编辑标签  │                 │                │              │
 ├─────────────►│                 │                │              │
 │              │ 弹出标签选择弹窗 │                │              │
 │◄─────────────┤                 │                │              │
 │              │                 │                │              │
 │ 勾选标签+保存 │                 │                │              │
 ├─────────────►│                 │                │              │
 │              │ PUT /author/    │                │              │
 │              │ tags            │                │              │
 │              ├────────────────►│                │              │
 │              │                 │ DELETE旧绑定   │              │
 │              │                 │ INSERT新绑定   │              │
 │              │                 ├───────────────►│              │
 │              │                 │                │              │
 │              │                 │ 清除作者缓存    │              │
 │              │                 ├───────────────────────────────►│
 │              │                 │                │              │
 │              │  200 OK         │                │              │
 │              │◄────────────────┤                │              │
 │◄─────────────┤ 刷新列表         │                │              │
```

### 8.2 前台：用户浏览看到标签

```
用户          liblibtv(Next.js)      后端API          Redis          数据库
 │               │                     │                │              │
 │ 访问TV Show   │                     │                │              │
 ├──────────────►│                     │                │              │
 │               │ GET /community/     │                │              │
 │               │ project/template/   │                │              │
 │               │ feed/stream         │                │              │
 │               ├────────────────────►│                │              │
 │               │                     │ 查询作品列表    │              │
 │               │                     ├───────────────────────────────►│
 │               │                     │◄──────────────────────────────┤
 │               │                     │                │              │
 │               │                     │ 批量查标签      │              │
 │               │                     │ MGET author:   │              │
 │               │                     │ tags:{id}      │              │
 │               │                     ├───────────────►│              │
 │               │                     │◄───────────────┤              │
 │               │                     │                │              │
 │               │                     │ 未命中→查DB     │              │
 │               │                     ├───────────────────────────────►│
 │               │                     │◄──────────────────────────────┤
 │               │                     │ 写入Redis       │              │
 │               │                     ├───────────────►│              │
 │               │                     │                │              │
 │               │  返回列表（含       │                │              │
 │               │  creatorTags）      │                │              │
 │               │◄────────────────────┤                │              │
 │               │                     │                │              │
 │               │ 渲染卡片 +          │                │              │
 │               │ AuthorTagBadge      │                │              │
 │◄──────────────┤                     │                │              │
```

---

## 九、异常处理与容错

### 9.1 后台异常场景

| 异常场景 | 影响 | 应对方案 |
|---------|------|---------|
| 标签名称重复 | 创建/编辑失败 | 数据库唯一索引兜底 + 接口返回友好错误信息 |
| 删除已绑定标签 | 前台展示异常 | 删除时级联清理关联表 + 异步清除缓存 |
| 作者 UUID 无效 | 绑定失败 | 搜索接口严格校验，编辑弹窗只展示搜索结果中的作者 |
| 并发修改同一作者标签 | 数据不一致 | 全量覆盖策略天然幂等，最后写入生效 |

### 9.2 前台异常场景

| 异常场景 | 影响 | 应对方案 |
|---------|------|---------|
| `creatorTags` 字段缺失 | 标签不展示 | `AuthorTagBadge` 组件做空值保护，`tags` 为空时不渲染 |
| 标签颜色格式异常 | 样式错乱 | 前端兜底默认颜色 `#6B7280`（灰色） |
| 缓存未及时更新 | 前台展示旧标签 | TTL 10min 自动过期；运营可手动"刷新缓存"按钮（P1） |

### 9.3 幂等性保证

- **标签绑定**：全量覆盖策略，重复提交不会产生脏数据
- **标签创建**：数据库唯一索引防止重复创建

---

## 十、测试要点

### 10.1 后端测试

| 测试项 | 覆盖场景 |
|--------|---------|
| 标签 CRUD | 创建/编辑/停用/启用/删除标签 |
| 名称唯一校验 | 创建重复名称返回错误 |
| 删除级联 | 删除标签后关联表数据清除 |
| 作者搜索 | 按名称模糊搜索/UUID精确搜索/作品名搜索 |
| 标签绑定 | 绑定/更新/清空标签，验证关联表数据正确 |
| 前台接口 | 列表/详情接口返回 creatorTags 字段正确 |
| 缓存一致性 | 修改标签后缓存清除，前台查询返回最新数据 |
| 停用标签 | 停用后前台不返回该标签 |

### 10.2 后台前端测试

| 测试项 | 覆盖场景 |
|--------|---------|
| 标签列表 | 分页加载、搜索、状态筛选 |
| 新增标签 | 表单校验、颜色选择、提交成功 |
| 编辑标签 | 数据回填、修改提交 |
| 停用/启用 | Switch 切换即时生效 |
| 删除标签 | 二次确认、删除成功刷新列表 |
| 作者搜索 | 三种搜索类型均能正确查询 |
| 编辑作者标签 | 弹窗展示所有标签、已绑定默认勾选、保存成功 |

### 10.3 前台前端测试

| 测试项 | 覆盖场景 |
|--------|---------|
| 列表页标签展示 | 有标签的作者展示标签、无标签的不展示 |
| 详情页标签展示 | 标签正确展示在作者名称旁 |
| 标签样式 | 颜色正确、深色背景可读性、文字颜色自适应 |
| 展示上限 | 超过 maxDisplay 的标签被截断 |
| 空值保护 | creatorTags 为 null/undefined 时不报错 |

---

## 十一、上线计划

### 11.1 开发排期估算

| 模块 | 工作项 | 预估人天 |
|------|--------|---------|
| 后端 | 数据库 DDL + Migration | 0.5d |
| 后端 | 标签 CRUD 接口 | 1d |
| 后端 | 作者搜索接口 | 1d |
| 后端 | 标签绑定接口 | 0.5d |
| 后端 | 前台列表/详情接口扩展 + 缓存 | 1d |
| 后台前端 | Service 层 + 类型定义 | 0.5d |
| 后台前端 | 标签管理页（列表 + 新增/编辑弹窗） | 1.5d |
| 后台前端 | 颜色选择器组件 | 0.5d |
| 后台前端 | 作者标签分配页（搜索 + 编辑弹窗） | 1.5d |
| 前台前端 | AuthorTagBadge 组件 | 0.5d |
| 前台前端 | CommunityCard + ProjectHeader 改造 | 0.5d |
| 前台前端 | 类型扩展 + 联调 | 0.5d |
| 联调测试 | 前后端联调 + 功能测试 | 2d |
| **合计** | | **约 11.5 人天** |

### 11.2 上线步骤

```
Step 1: 数据库 DDL（提前执行，不影响线上）
  → 创建 author_tag、author_tag_rel 两张表

Step 2: 后端部署
  → 标签管理接口 + 作者搜索/绑定接口
  → 前台列表/详情接口扩展（creatorTags 字段，无标签时返回空数组）

Step 3: 后台前端部署
  → 标签管理页 + 作者标签分配页
  → 运营可开始配置标签并给作者打标签

Step 4: 前台前端部署
  → AuthorTagBadge 组件 + CommunityCard/ProjectHeader 改造
  → 灰度放量：先 10% 用户可见标签

Step 5: 全量放开
  → 确认展示正常后全量

Step 6: 观察期（1 周）
  → 关注标签缓存命中率、列表接口 RT 变化、运营操作频次
```

### 11.3 回滚方案

| 场景 | 回滚方式 |
|------|---------|
| 前台标签展示异常 | 前端灰度关闭标签展示（AuthorTagBadge 不渲染） |
| 后台管理页有 bug | 路由权限收回，暂时关闭入口 |
| 列表接口 RT 劣化 | 后端关闭 creatorTags 字段填充，返回空数组 |
| 缓存雪崩 | 开启空值缓存 + 降级为直接查 DB（短期） |

---

## 十二、后续扩展预留

| 方向 | 说明 | 当前是否实现 |
|------|------|------------|
| 批量打标签 | 勾选多个作者 → 批量绑定同一标签 | 否（P1） |
| 作品标签 | 复用 author_tag 表结构，新增 work_tag_rel 关联表 | 否（P2） |
| 活动标签 | 限时活动标签，支持开始/结束时间 | 否（P2） |
| 标签统计看板 | 各标签下的作者分布、作品数量趋势 | 否（P2） |
| 前台标签筛选 | TV Show 页面支持按标签筛选作者/作品 | 否（P2） |
| 操作日志 | 记录谁在什么时间给谁打了什么标签 | 否（P1），可复用现有审计日志 |
| 标签 icon | 标签支持自定义图标 | 否（P2） |
