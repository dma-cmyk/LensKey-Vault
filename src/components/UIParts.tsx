import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORIES = ['DeFi', 'NFT', '保管用', 'その他'] as const;
export type Category = (typeof CATEGORIES)[number];

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl", className)}>
      {children}
    </div>
  );
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button 
      className={cn(
        "rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2", 
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & { 
  label?: string; 
  error?: string;
  rows?: number;
}) {
  const Component = props.type === 'textarea' ? 'textarea' : 'input';
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-zinc-400">{label}</label>}
      <Component 
        {...(props as any)}
        className={cn(
          "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          props.className
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Badge({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-xs font-semibold transition-all",
      active ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
    )}>
      {children}
    </span>
  );
}
