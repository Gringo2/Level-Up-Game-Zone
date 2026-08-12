import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { auth, googleProvider } from "../firebase";

export function Login() {
	const [error, setError] = useState("");

	const handleLogin = async () => {
		try {
			await signInWithPopup(auth, googleProvider);
		} catch (err: unknown) {
			const error = err as { code?: string; message?: string };
			if (error?.code === "auth/popup-blocked") {
				try {
					await signInWithRedirect(auth, googleProvider);
				} catch (redirectError: unknown) {
					const redirErr = redirectError as { message?: string };
					setError(redirErr.message || "Failed to redirect");
				}
				return;
			}
			setError(error.message || "Login failed");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">
						Game Zone Manager
					</CardTitle>
					<CardDescription>Sign in to access the dashboard</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
							{error}
						</div>
					)}
					<Button className="w-full" onClick={handleLogin}>
						Sign in with Google
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
