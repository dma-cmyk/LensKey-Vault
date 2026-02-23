import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CATEGORIES = ['パスワード', 'ウォレット', 'メモ', 'その他'] as const;

/* ── Card ── */
export function Card({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-colors duration-200",
        onClick && "cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/80",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Button ── */
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
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
    danger: "bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-800",
    ghost: "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2",
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

/* ── Input ── */
export function Input({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  rows?: number;
}) {
  const Component = props.type === 'textarea' ? 'textarea' : 'input';
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-zinc-400">{label}</label>}
      <Component
        {...(props as any)}
        className={cn(
          "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          props.className
        )}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ── Badge ── */
export function Badge({ children, active, onClick }: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap",
        active
          ? "bg-blue-600 text-white"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}
