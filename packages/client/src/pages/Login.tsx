import { signInWithPopup } from "firebase/auth";
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
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			setError(err.message);
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
