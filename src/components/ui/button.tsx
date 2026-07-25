import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-pill text-base font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 leading-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-on-primary hover:bg-primary-press',
        secondary:
          'bg-canvas text-primary border border-primary hover:bg-canvas-soft',
        outline:
          'bg-canvas text-primary border border-primary hover:bg-canvas-soft',
        dark:
          'bg-brand-dark-900 text-on-primary hover:bg-ink',
        ghost: 'hover:bg-canvas-soft text-primary hover:text-primary-deep',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive: 'bg-ruby text-white hover:bg-ruby/90',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-6 py-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
