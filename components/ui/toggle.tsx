'use client';

import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: ToggleSwitchProps) {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'rounded-full transition-all relative',
        checked ? 'bg-green-500' : 'bg-slate-300',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:opacity-90',
        isSm ? 'w-8 h-[18px]' : 'w-10 h-6',
        className
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 bg-white rounded-full shadow transition-all',
          isSm ? 'w-3.5 h-3.5' : 'w-4 h-4',
          checked ? (isSm ? 'left-4' : 'left-5') : (isSm ? 'left-0.5' : 'left-1')
        )}
      />
    </button>
  );
}
