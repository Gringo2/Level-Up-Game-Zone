import { Button } from "./button";
import { Input } from "./input";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	reasonValue?: string;
	onReasonChange?: (value: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
	loading?: boolean;
	minReasonLength?: number;
	confirmLabel?: string;
	confirmVariant?: "destructive" | "default";
	loadingLabel?: string;
	requireReason?: boolean;
	reasonPlaceholder?: string;
}

export function ConfirmDialog({
	open,
	title,
	message,
	reasonValue = "",
	onReasonChange,
	onConfirm,
	onCancel,
	loading = false,
	minReasonLength = 3,
	confirmLabel = "Confirm",
	confirmVariant = "destructive",
	loadingLabel,
	requireReason = false,
	reasonPlaceholder = "Reason for deletion...",
}: ConfirmDialogProps) {
	if (!open) return null;

	const reasonValid =
		!requireReason || reasonValue.trim().length >= minReasonLength;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="fixed inset-0 bg-black/50"
				tabIndex={-1}
				onClick={onCancel}
				aria-label="Close dialog"
			/>
			<div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
				<h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
				<p className="text-sm text-zinc-600">{message}</p>
				{requireReason && (
					<Input
						type="text"
						placeholder={reasonPlaceholder}
						value={reasonValue}
						onChange={(e) => onReasonChange?.(e.target.value)}
					/>
				)}
				<div className="flex justify-end gap-2">
					<Button
						size="sm"
						variant="ghost"
						onClick={onCancel}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						variant={confirmVariant}
						onClick={onConfirm}
						disabled={loading || !reasonValid}
					>
						{loading ? (loadingLabel ?? "Loading...") : confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
