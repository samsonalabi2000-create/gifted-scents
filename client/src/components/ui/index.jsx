import { forwardRef, useId } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/utils/cn.js';

const VARIANTS = {
  primary: 'bg-cta text-cta-fg hover:brightness-110 shadow-[0_8px_30px_-12px_var(--color-rose-500)]',
  gold: 'bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950 hover:brightness-105',
  outline: 'border border-line bg-transparent text-fg hover:border-accent hover:text-accent',
  ghost: 'bg-transparent text-fg hover:bg-surface-2',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110',
};
const SIZES = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-7 text-base', icon: 'h-11 w-11' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, as: As = 'button', ...p }, ref) {
  return (
    <As ref={ref} disabled={disabled || loading} className={cn('inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition duration-200 disabled:opacity-50 disabled:pointer-events-none select-none', VARIANTS[variant], SIZES[size], className)} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}
    </As>
  );
});

export const Field = ({ label, error, hint, children, className }) => {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label htmlFor={id} className="text-sm font-medium">{label}</label>}
      {children(id, error ? `${id}-err` : undefined)}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
};

const inputCls = 'w-full rounded-xl border border-line bg-surface px-4 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:ring-2 ring-[var(--ring)] aria-[invalid=true]:border-[var(--danger)]';
export const Input = forwardRef(function Input({ className, error, ...p }, ref) {
  return <input ref={ref} aria-invalid={Boolean(error)} className={cn(inputCls, 'h-12', className)} {...p} />;
});
export const Textarea = forwardRef(function Textarea({ className, error, ...p }, ref) {
  return <textarea ref={ref} aria-invalid={Boolean(error)} className={cn(inputCls, 'min-h-28 py-3', className)} {...p} />;
});
export const Select = forwardRef(function Select({ className, error, children, ...p }, ref) {
  return <select ref={ref} aria-invalid={Boolean(error)} className={cn(inputCls, 'h-12 appearance-none bg-[length:1rem] pr-9', className)} {...p}>{children}</select>;
});

export const Badge = ({ tone = 'neutral', className, ...p }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider',
    { neutral: 'bg-surface-2 text-muted', gold: 'bg-gold-300/20 text-accent border border-gold-400/40', rose: 'bg-cta text-cta-fg', dark: 'bg-ink-950 text-gold-300', danger: 'bg-[var(--danger)]/15 text-[var(--danger)]', success: 'bg-[var(--success)]/15 text-[var(--success)]', warn: 'bg-[var(--warning)]/15 text-[var(--warning)]' }[tone], className)} {...p} />
);

export const Skeleton = ({ className }) => <div aria-hidden className={cn('skeleton', className)} />;

/** Accessible side/bottom sheet built on Radix Dialog (focus trap, ESC, aria). */
export const Sheet = ({ open, onOpenChange, title, description, side = 'right', children, className }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[var(--z-drawer)] bg-[var(--scrim)] backdrop-blur-[2px]" />
      <Dialog.Content className={cn('fixed z-[var(--z-drawer)] flex flex-col bg-bg text-fg shadow-2xl border-line focus:outline-none',
        side === 'right' && 'inset-y-0 right-0 w-full max-w-md border-l', side === 'left' && 'inset-y-0 left-0 w-full max-w-sm border-r',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t', className)}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div><Dialog.Title className="font-[var(--font-display)] text-2xl">{title}</Dialog.Title>
            {description ? <Dialog.Description className="text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}</div>
          <Dialog.Close className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Close"><X className="size-5" /></Dialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const Modal = ({ open, onOpenChange, title, description, children, className }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-[var(--scrim)]" />
      <Dialog.Content className={cn('fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-bg p-6 shadow-2xl', className)}>
        <Dialog.Title className="font-[var(--font-display)] text-2xl">{title}</Dialog.Title>
        {description ? <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
        <div className="mt-4">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmLabel = 'Confirm', danger, loading, onConfirm }) => (
  <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
    <div className="mt-2 flex justify-end gap-3">
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
);

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="grid place-items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
    {Icon && <Icon className="size-9 text-accent" aria-hidden />}
    <h3 className="text-2xl">{title}</h3>{text && <p className="max-w-md text-muted">{text}</p>}{action}
  </div>
);

export const ErrorState = ({ error, onRetry, title = 'We hit a snag' }) => (
  <div role="alert" className="grid place-items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-12 text-center">
    <h3 className="text-2xl">{title}</h3><p className="max-w-md text-muted">{error?.message || 'Something went wrong. Please try again.'}</p>
    {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
  </div>
);

export const Spinner = ({ className }) => <Loader2 className={cn('size-5 animate-spin', className)} aria-label="Loading" />;
