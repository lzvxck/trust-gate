import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Maps to airtable-DESIGN.md's card family, translated from marketing signature-cards
 * into dashboard status surfaces: `coral` for a failing/regressed verdict (the "brand
 * voltage" card, used sparingly per the doc's own guidance -- reserved for the one
 * thing on a page that most needs attention), `forest`/`mint` for a passing verdict,
 * `soft`/`cream` for neutral content and callouts, `flat` (bordered canvas) for the
 * default content card.
 */
const cardVariants = cva('rounded-lg p-6', {
  variants: {
    variant: {
      flat: 'bg-canvas border border-hairline',
      soft: 'bg-surface-soft',
      cream: 'bg-signature-cream text-ink',
      coral: 'bg-signature-coral text-on-primary',
      forest: 'bg-signature-forest text-on-primary',
      dark: 'bg-surface-dark text-on-dark',
    },
  },
  defaultVariants: { variant: 'flat' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}
