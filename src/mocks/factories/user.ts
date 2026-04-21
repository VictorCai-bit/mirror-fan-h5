import type { Work } from '@/types/api';

export const MOCK_WORKS: Work[] = [
  { id: 9001, title: '新作品 Alpha', work_type: 'Fiction', creator_uid: 'U-001' },
  { id: 9002, title: '新作品 Beta', work_type: 'Music', creator_uid: 'U-001' },
  { id: 8001, title: '绑定草稿作品', work_type: 'Fiction', creator_uid: 'U-001' },
  { id: 9201, title: '创作者作品 A', work_type: 'Fiction', creator_uid: 'U-002' },
  { id: 9202, title: '创作者作品 B', work_type: 'Music', creator_uid: 'U-002' },
  { id: 9101, title: '新号作品 A', work_type: 'Fiction', creator_uid: 'U-003' },
  { id: 9102, title: '新号作品 B', work_type: 'Music', creator_uid: 'U-003' },
];
