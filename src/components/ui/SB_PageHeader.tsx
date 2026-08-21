import SB_Button from "./SB_Button";

interface SB_PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SB_PageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: SB_PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-5 mb-5">
      <div>
        <h1 className="m-0 text-2xl sm:text-[28px] font-extrabold">{title}</h1>
        <p className="mt-1.5 mb-0 text-muted text-sm sm:text-base">{description}</p>
      </div>
      {actionLabel && onAction && (
        <SB_Button variant="primary" onClick={onAction}>
          {actionLabel}
        </SB_Button>
      )}
    </div>
  );
}
