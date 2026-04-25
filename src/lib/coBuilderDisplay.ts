import type { TFunction } from 'i18next';

import type { MemberLevel } from '@/types/coBuilder';

export function tTierName(level: MemberLevel, t: TFunction): string {
  if (level === 'none') return t('coBuilder.tier.visitorName');
  return t(`coBuilder.tier.${level}.name` as 'coBuilder.tier.base.name');
}

export function tTierTag(level: MemberLevel, t: TFunction): string {
  if (level === 'none') return t('coBuilder.tier.visitorTag');
  return t(`coBuilder.tier.${level}.tag` as 'coBuilder.tier.base.tag');
}

export function tInvitedWorkTitle(workId: number, t: TFunction): string {
  return t(`coBuilder.fixture.works.w${workId}.title` as 'coBuilder.fixture.works.w9001.title');
}

export function tInvitedWorkCategory(workId: number, t: TFunction): string {
  return t(`coBuilder.fixture.works.w${workId}.category` as 'coBuilder.fixture.works.w9001.category');
}
