import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  subtitle,
  action,
  noPadding = false
}) => {
  return (
    <section className={`bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-4 pb-3 mb-4 border-b border-[#e5e5e5]">
          <div>
            {typeof title === "string" ? (
              <h3 className="ops-display text-[22px] leading-tight text-[#111]">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-[13px] text-[#666] mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 text-[13px]">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "py-4"}>{children}</div>
    </section>
  );
};
