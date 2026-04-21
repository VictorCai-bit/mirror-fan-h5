import { cn } from '@/lib/cn';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="close"
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 200 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60) onClose();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'relative z-[61] w-full max-w-[375px] rounded-t-3xl bg-elevated px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-2xl',
              className,
            )}
          >
            <div
              className="mx-auto mb-3 h-1 w-10 cursor-grab rounded-full bg-white/20"
              onPointerDown={(e) => dragControls.start(e)}
            />
            {title ? <h3 className="mb-3 text-center text-base font-semibold">{title}</h3> : null}
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
