import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error(
			"[ErrorBoundary] Uncaught render error:",
			error.message,
			info.componentStack,
		);
	}

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
					<div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
						<div className="flex justify-center mb-4">
							<span className="text-5xl">⚠️</span>
						</div>
						<h1 className="text-xl font-semibold text-zinc-100 mb-2">
							Something went wrong
						</h1>
						<p className="text-sm text-zinc-400 mb-6">
							An unexpected error occurred. Your data is safe — please reload
							the application to continue.
						</p>
						{this.state.error && (
							<pre className="text-left text-xs text-zinc-500 bg-zinc-800 rounded-lg p-3 mb-6 overflow-auto max-h-32">
								{this.state.error.message}
							</pre>
						)}
						<button
							type="button"
							onClick={this.handleReload}
							className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-medium py-2.5 px-4 rounded-lg transition-colors"
						>
							Reload Application
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
