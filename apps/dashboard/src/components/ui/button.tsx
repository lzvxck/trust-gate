import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Variants map directly to airtable-DESIGN.md's `components:` block (button-primary, button-secondary, button-icon-circular). No hover states per the design doc's documented "Default and Active/Pressed only" policy -- :active covers the pressed state. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 text-label-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-border',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary rounded-lg active:bg-primary-active',
        secondary: 'bg-canvas text-ink rounded-lg border border-hairline active:bg-surface-soft',
        pill: 'bg-canvas text-ink rounded-pill active:bg-surface-soft',
        ghost: 'bg-transparent text-ink active:bg-surface-soft rounded-md',
        icon: 'bg-canvas text-ink rounded-full border border-hairline size-10 shrink-0 p-0',
      },
      size: {
        default: 'px-6 py-4',
        sm: 'px-4 py-2 text-body-md',
      },
    },
    compoundVariants: [{ variant: 'icon', class: 'px-0 py-0' }],
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
