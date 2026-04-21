import { cn } from '@/lib/cn';
import { FileIcon, ImageIcon, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export function FileUpload({
  accept = 'image/*,video/*,application/pdf',
  maxMb = 30,
  multiple,
  onChange,
}: {
  accept?: string;
  maxMb?: number;
  multiple?: boolean;
  onChange: (files: UploadedFile[]) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setErr(null);
      const out: UploadedFile[] = [];
      for (const file of Array.from(list)) {
        if (file.size > maxMb * 1024 * 1024) {
          setErr(String(t('errors.4050')));
          return;
        }
        if (file.type.startsWith('video/')) {
          const ok = await new Promise<boolean>((resolve) => {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.onloadedmetadata = () => {
              resolve((v.duration ?? 0) <= 60);
            };
            v.onerror = () => resolve(false);
            v.src = URL.createObjectURL(file);
          });
          if (!ok) {
            setErr(String(t('errors.4050')));
            return;
          }
        }
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) previewUrl = URL.createObjectURL(file);
        setBusy(true);
        let attempt = 0;
        let url = '';
        while (attempt < 3) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/arts/file/upload', { method: 'POST', body: fd });
            const json = (await res.json()) as { code: number; data?: { url: string; size: number; mime: string } };
            if (json.code === 0 && json.data) {
              url = json.data.url;
              break;
            }
          } catch {
            /* retry */
          }
          attempt += 1;
          await new Promise((r) => setTimeout(r, 200));
        }
        setBusy(false);
        if (!url) {
          setErr(String(t('common.uploadFail')));
          return;
        }
        out.push({
          url,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          previewUrl,
        });
        await new Promise((r) => setTimeout(r, 200));
      }
      onChange(out);
    },
    [maxMb, onChange, t],
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-6 text-sm text-text-secondary',
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" />}
        {busy ? t('common.loading') : t('common.upload')}
      </button>
      {err ? <p className="mt-2 text-xs text-danger-500">{err}</p> : null}
    </div>
  );
}

export function FileListItem({ f }: { f: UploadedFile }) {
  if (f.type.startsWith('image/') && f.previewUrl) {
    return <img src={f.previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />;
  }
  if (f.type === 'application/pdf') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
        <FileIcon className="size-4" />
        {f.name}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
      <FileIcon className="size-4" />
      {f.name}
    </div>
  );
}
