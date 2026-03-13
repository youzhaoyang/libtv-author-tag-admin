export const PRESET_COLORS = [
  '#E53E3E',
  '#DD6B20',
  '#D69E2E',
  '#38A169',
  '#319795',
  '#3182CE',
  '#5A67D8',
  '#805AD5',
  '#D53F8C',
  '#1A202C',
];

export const ICON_EMOJIS = ['🏆', '✓', '🔥', '⭐', '💎', '🎬', '🎨', '👑', '🌟', '🤝'];

export const initialTags = [
  {
    id: 1,
    name: '精选',
    iconUrl: '🏆',
    color: '#E53E3E',
    description: '编辑精选优质作者',
    status: 1,
    sortOrder: 0,
    createdBy: '运营A',
    createdAt: '2026-03-01 10:00',
    authorCount: 42,
  },
  {
    id: 2,
    name: '官方认证',
    iconUrl: '✓',
    color: '#3182CE',
    description: '平台官方认证创作者',
    status: 1,
    sortOrder: 1,
    createdBy: '运营A',
    createdAt: '2026-03-02 14:30',
    authorCount: 18,
  },
  {
    id: 3,
    name: '新锐创作者',
    iconUrl: '🔥',
    color: '#38A169',
    description: '新晋优质创作者',
    status: 1,
    sortOrder: 2,
    createdBy: '运营B',
    createdAt: '2026-03-05 09:15',
    authorCount: 67,
  },
  {
    id: 4,
    name: '商业合作',
    iconUrl: '🤝',
    color: '#D69E2E',
    description: '可接商业合作的创作者',
    status: 0,
    sortOrder: 3,
    createdBy: '运营A',
    createdAt: '2026-03-08 16:00',
    authorCount: 5,
  },
];

export const mockAuthors = [
  { authorId: 'a1b2c3d4-5678-90ab-cdef-111111111111', nickname: '小飞侠赛事', avatar: '#E53E3E', workCount: 12, tagIds: [1, 2] },
  { authorId: 'e5f6g7h8-1234-56cd-ef90-222222222222', nickname: 'JOY堂多', avatar: '#3182CE', workCount: 8, tagIds: [] },
  { authorId: 'i9j0k1l2-abcd-ef12-3456-333333333333', nickname: '林致远2087', avatar: '#805AD5', workCount: 5, tagIds: [3] },
  { authorId: 'm3n4o5p6-7890-abcd-ef12-444444444444', nickname: '近代AIGC世界', avatar: '#38A169', workCount: 22, tagIds: [1, 3] },
  { authorId: 'q7r8s9t0-1234-5678-90ab-555555555555', nickname: '三千间Atelier', avatar: '#D69E2E', workCount: 15, tagIds: [2] },
  { authorId: 'u1v2w3x4-abcd-ef12-3456-666666666666', nickname: '墨冰', avatar: '#D53F8C', workCount: 9, tagIds: [1, 2, 3] },
  { authorId: 'y5z6a7b8-7890-abcd-ef12-777777777777', nickname: '裕梦', avatar: '#319795', workCount: 18, tagIds: [] },
  { authorId: 'c9d0e1f2-1234-5678-90ab-888888888888', nickname: '风过草原奶自天然', avatar: '#DD6B20', workCount: 3, tagIds: [4] },
];

/** 用户列表 Mock 数据（全量用户） */
export const mockUsers = [
  { id: 8462755, uuid: '77fe45056d4747028f34662ddf3b025', nickname: '微信用户66e65e', mobile: '15695268580', avatar: null, status: 1, tags: [], createTime: '2025-01-15 10:00' },
  { id: 8462754, uuid: '0e5b851d0c8443ee937ea10c002851', nickname: '156****8580', mobile: '15695268580', avatar: '#38A169', status: 1, tags: [], createTime: '2025-01-14 09:30' },
  { id: 8462752, uuid: 'a1b2c3d4-5678-90ab-cdef-111111111111', nickname: '微信用户964163', mobile: '', avatar: null, status: 1, tags: ['liblib_official'], createTime: '2025-01-13 14:20' },
  { id: 8462753, uuid: 'e5f6g7h8-1234-56cd-ef90-222222222222', nickname: '微信用户71970e', mobile: '', avatar: null, status: 1, tags: [], createTime: '2025-01-12 16:45' },
  { id: 8462751, uuid: 'i9j0k1l2-abcd-ef12-3456-333333333333', nickname: '小飞侠赛事', mobile: '13800138000', avatar: '#E53E3E', status: 1, tags: ['liblib_teacher'], createTime: '2025-01-11 11:00' },
  { id: 8462750, uuid: 'm3n4o5p6-7890-abcd-ef12-444444444444', nickname: 'JOY堂多', mobile: '', avatar: '#3182CE', status: 2, tags: [], createTime: '2025-01-10 08:15' },
];

export const mockAuthorDetails = {
  'a1b2c3d4-5678-90ab-cdef-111111111111': {
    homepageLink: 'https://libtv.example.com/user/a1b2c3d4',
    createDate: '2024-06-15',
    fanCount: 12580,
    accumulatedVv: 89200,
    accumulatedLikes: 15600,
    publishedVideoCount: 12,
    worksOver30sCount: 8,
    worksLast30DaysCount: 3,
    qualityWorksCount: 5,
    publicCanvasCount: 2,
  },
  'e5f6g7h8-1234-56cd-ef90-222222222222': {
    homepageLink: 'https://libtv.example.com/user/e5f6g7h8',
    createDate: '2024-08-20',
    fanCount: 3200,
    accumulatedVv: 18500,
    accumulatedLikes: 4200,
    publishedVideoCount: 8,
    worksOver30sCount: 5,
    worksLast30DaysCount: 2,
    qualityWorksCount: 2,
    publicCanvasCount: 1,
  },
  'i9j0k1l2-abcd-ef12-3456-333333333333': {
    homepageLink: 'https://libtv.example.com/user/i9j0k1l2',
    createDate: '2024-09-01',
    fanCount: 890,
    accumulatedVv: 5200,
    accumulatedLikes: 1200,
    publishedVideoCount: 5,
    worksOver30sCount: 3,
    worksLast30DaysCount: 1,
    qualityWorksCount: 1,
    publicCanvasCount: 0,
  },
  'm3n4o5p6-7890-abcd-ef12-444444444444': {
    homepageLink: 'https://libtv.example.com/user/m3n4o5p6',
    createDate: '2024-05-10',
    fanCount: 25600,
    accumulatedVv: 185000,
    accumulatedLikes: 42000,
    publishedVideoCount: 22,
    worksOver30sCount: 18,
    worksLast30DaysCount: 6,
    qualityWorksCount: 12,
    publicCanvasCount: 5,
  },
};

/** 认证类型从标签数据同步，此处仅保留「取消认证」等特殊选项 */

export const DISPLAY_SCOPES = [
  { value: '', label: '请选择' },
  { value: 'lib', label: 'Lib' },
  { value: 'libtv', label: 'LibTV' },
];

export const CERT_PERIODS = [
  { value: '', label: '请选择' },
  { value: '30', label: '30天' },
  { value: '60', label: '60天' },
  { value: '90', label: '90天' },
  { value: '180', label: '180天' },
  { value: '365', label: '1年' },
  { value: 'permanent', label: '永久' },
];

export const MAX_TAGS = 20;
export const MAX_TAGS_PER_AUTHOR = 5;
export const ICON_MAX_SIZE = 50 * 1024;
/** 删除颜色自定义后，所有标签使用统一默认色 */
export const DEFAULT_TAG_COLOR = '#3182CE';

/** 认证申请通过/不通过的站内信模板 */
export const MESSAGE_TEMPLATES = {
  pass: `亲爱的创作者你好，感谢你对 LibTV 的信任和支持。

当前已为你开通「认证作者身份」✨🏅

快来尝试发布更多优质作品吧！`,
  reject: `亲爱的创作者你好，感谢你的认证申请。

经审核，当前暂未通过认证。建议继续创作优质内容，积累更多作品后再次申请。

如有疑问可联系客服。`,
};
