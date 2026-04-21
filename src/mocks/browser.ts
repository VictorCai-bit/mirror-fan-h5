import { setupWorker } from 'msw/browser';
import { adminHandlers } from './handlers/admin';
import { creatorHandlers } from './handlers/creator';
import { investorHandlers } from './handlers/investor';
import { publicHandlers } from './handlers/public';
import { uploadHandlers } from './handlers/upload';

export const worker = setupWorker(
  ...publicHandlers,
  ...investorHandlers,
  ...creatorHandlers,
  ...adminHandlers,
  ...uploadHandlers,
);
