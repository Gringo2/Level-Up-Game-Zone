import type { Response } from "express";

export type PaginationParams = { limit?: number; cursor?: string };

// TD-032: `limit` opts a list endpoint into the { data, nextCursor } envelope;
// absence preserves the legacy bare-array contract for existing consumers.
export function resolvePagination(
	query: Record<string, unknown>,
): PaginationParams {
	const rawLimit = query.limit;
	if (rawLimit === undefined || rawLimit === "") return {};
	return {
		limit: Number(rawLimit),
		cursor: query.cursor as string | undefined,
	};
}

type SnapshotLike = {
	docs: { id: string; data: () => unknown }[];
};

export function sendList(
	res: Response,
	snapshot: SnapshotLike,
	pagination: PaginationParams = {},
): Response {
	const rows = snapshot.docs.map((doc) => ({
		id: doc.id,
		...(doc.data() as Record<string, unknown>),
	}));
	if (pagination.limit === undefined) {
		return res.status(200).json(rows);
	}
	const nextCursor =
		snapshot.docs.length === pagination.limit
			? snapshot.docs[snapshot.docs.length - 1].id
			: null;
	return res.status(200).json({ data: rows, nextCursor });
}
