import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORIES = ['DeFi', 'NFT', '保管用', 'その他'] as const;
export type Category = (typeof CATEGORIES)[number];

export function Card({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn(
      "glass-panel rounded-[2rem] overflow-hidden transition-all duration-500",
      hover && "hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
      className
    )}>
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
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:shadow-none border border-blue-400/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50",
    danger: "bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20",
    ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white",
    glass: "glass-panel hover:bg-white/10 text-white border-white/5"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base"
  };

  return (
    <button 
      className={cn(
        "rounded-2xl font-display font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2", 
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
    <div className="space-y-2.5">
      {label && <label className="text-sm font-semibold text-zinc-400 ml-1 font-display">{label}</label>}
      <Component 
        {...(props as any)}
        className={cn(
          "w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300",
          error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
          props.className
        )}
      />
      {error && <p className="text-xs text-red-400 font-medium ml-1">{error}</p>}
    </div>
  );
}

export function Badge({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={cn(
      "px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-300",
      active 
        ? "bg-blue-600 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.6)]" 
        : "bg-white/5 text-zinc-500 border border-white/5"
    )}>
      {children}
    </span>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10">
      <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-3 font-display">
        {title}
      </h2>
      {subtitle && <p className="text-zinc-400 font-medium">{subtitle}</p>}
    </div>
  );
}
