import type { MilestoneTemplateNode, WorkType } from '@/types/api';

const FICTION_NODES: MilestoneTemplateNode[] = [
  { node_index: 1, title: '公募完成', bps: 1500, required_attachments: ['pdf'] },
  { node_index: 2, title: '大纲', bps: 375, required_attachments: ['image', 'pdf'] },
  { node_index: 3, title: '样章', bps: 375, required_attachments: ['image', 'pdf'] },
  { node_index: 4, title: '初稿 50%', bps: 750, required_attachments: ['image', 'video'] },
  { node_index: 5, title: '初稿完稿', bps: 750, required_attachments: ['image', 'video'] },
  { node_index: 6, title: '二稿', bps: 375, required_attachments: ['pdf'] },
  { node_index: 7, title: '校对完成', bps: 375, required_attachments: ['pdf'] },
  { node_index: 8, title: '宣发上线', bps: 500, required_attachments: ['image', 'video'] },
];

export function getMilestoneTemplatesForWorkType(workType: WorkType): MilestoneTemplateNode[] {
  if (workType === 'Music') {
    return FICTION_NODES.map((n, i) => ({
      ...n,
      title: ['公募', 'Demo', '编曲', '录制 50%', '混音', '母带', '成品', '宣发'][i] ?? n.title,
    }));
  }
  return FICTION_NODES.map((n) => ({ ...n }));
}
