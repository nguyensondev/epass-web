import { cn } from '@/lib/cn';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ className, size = 'md' }: LoadingProps) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', className, {
        'h-4 w-4': size === 'sm',
        'h-8 w-8': size === 'md',
        'h-12 w-12': size === 'lg',
      })}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
