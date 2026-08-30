import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  disabled,
  loading = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[13px] gap-1.5",
    md: "px-4 py-2 text-[14px] gap-2",
    lg: "px-5 py-2.5 text-[15px] gap-2"
  }[size];

  const variantClasses = {
    primary: "bg-[#111] text-white hover:bg-black",
    secondary: "bg-white text-[#111] border border-[#111] hover:bg-[#111] hover:text-white",
    danger: "bg-white text-[#111] border border-[#111]",
    outline: "bg-transparent text-[#111] border border-[#d4d4d4] hover:border-[#111]",
    ghost: "bg-transparent text-[#111] underline underline-offset-4 decoration-[#ccc] hover:decoration-[#111]"
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
