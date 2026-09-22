import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";

/**
 * Shown to signed-in accounts whose role can't operate the system (staff).
 * Only managers and admins use Level-Up; the API rejects everyone else.
 */
export function NoAccess({ email }: { email?: string }) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>No access</CardTitle>
					<CardDescription>
						{email ? `${email} is` : "This account is"} not a manager or admin
						account. Ask an admin to change your role if you need access.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button className="w-full" onClick={() => signOut(auth)}>
						Sign out
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
