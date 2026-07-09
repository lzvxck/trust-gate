import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-caption font-medium',
  {
    variants: {
      variant: {
        pass: 'bg-success-border/15 text-success',
        fail: 'bg-signature-coral/10 text-signature-coral',
        error: 'bg-signature-coral/10 text-signature-coral',
        pending: 'bg-surface-strong text-muted',
        neutral: 'bg-surface-strong text-body',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
