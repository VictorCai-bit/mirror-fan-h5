import { http, HttpResponse } from 'msw';
import { mockDelay, shouldInject500 } from '@/mocks/utils';

export const uploadHandlers = [
  http.post('/arts/file/upload', async ({ request }) => {
    await mockDelay();
    if (shouldInject500(request))
      return HttpResponse.json({ code: 5000, msg: 'internal error', data: null });
    const ct = request.headers.get('content-type') ?? '';
    if (!ct.includes('multipart')) {
      return HttpResponse.json({ code: 4010, msg: 'bad request', data: null });
    }
    return HttpResponse.json({
      code: 0,
      msg: 'success',
      data: { url: `https://mock.cdn/${Date.now()}.bin`, size: 1024, mime: 'image/png' },
    });
  }),
];
