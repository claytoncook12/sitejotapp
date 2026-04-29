type BetaBadgeProps = {
  className?: string;
};

/**
 * Small "BETA" badge displayed next to the SiteJot wordmark across the app.
 * Rendered as a <sup> so it sits as a superscript next to the logo text.
 */
export function BetaBadge({ className = "" }: BetaBadgeProps) {
  return (
    <sup
      className={
        "ml-1 inline-flex items-center rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white align-super leading-none print:hidden " +
        className
      }
    >
      Beta
    </sup>
  );
}
