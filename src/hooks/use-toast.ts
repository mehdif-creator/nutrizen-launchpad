/**
 * Sonner-backed useToast shim
 * Provides the same { toast } = useToast() API that all existing components expect,
 * but delegates to Sonner under the hood.
 * This eliminates the duplicate ShadcnToaster while keeping all call-sites untouched.
 */
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  [key: string]: unknown;
}

function toast(opts: ToastOptions) {
  const { title, description, variant } = opts;

  if (variant === 'destructive') {
    sonnerToast.error(title ?? 'Erreur', { description });
  } else {
    sonnerToast(title ?? '', { description });
  }
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] as never[],
  };
}

export { useToast, toast };
