/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../pages/Admin.js";

const { mockGetIdToken } = vi.hoisted(() => ({
	mockGetIdToken: vi
		.fn<() => Promise<string | null>>()
		.mockResolvedValue("mock-token"),
}));

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: mockGetIdToken },
	},
}));

vi.mock("firebase/auth", () => ({
	signOut: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const rate = {
	id: "r1",
	game_name: "PS4",
	price_per_unit: 5,
	unit_type: "Hour" as const,
	isActive: true,
};

const rate2 = {
	id: "r2",
	game_name: "Pool",
	price_per_unit: 2,
	unit_type: "Game" as const,
	isActive: false,
};

const rates = [rate, rate2];

describe("Admin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.scrollTo = vi.fn();
	});

	afterEach(() => {
		cleanup();
	});

	it("loads and displays rates", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				String(url).includes("expense-categories")
					? jsonResponse([])
					: jsonResponse(rates),
			),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});
		expect(screen.getByText("Pool")).toBeDefined();
		expect(screen.getByText("$5.00 / Hour")).toBeDefined();
		expect(screen.getByText("$2.00 / Game")).toBeDefined();
	});

	it("shows empty state when no rates exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				String(url).includes("expense-categories")
					? jsonResponse([])
					: jsonResponse([]),
			),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("No rates defined yet.")).toBeDefined();
		});
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse(null, false, 500)),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load rates");
		});
	});

	it("adds a new rate via POST", async () => {
		const newRate = {
			id: "r3",
			game_name: "Darts",
			price_per_unit: 3,
			unit_type: "Game" as const,
			isActive: true,
		};

		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(newRate);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Game Name"), {
			target: { value: "Darts" },
		});
		fireEvent.change(screen.getByLabelText("Price ($)"), {
			target: { value: "3" },
		});
		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates"),
				expect.objectContaining({ method: "POST" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Game rate added successfully!");
	});

	it("does not POST when game name or price is empty", async () => {
		const fetchMock = vi.fn((url: string, _init?: RequestInit) =>
			String(url).includes("expense-categories")
				? jsonResponse([])
				: jsonResponse(rates),
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(
				fetchMock.mock.calls.filter(
					([, init]) => (init as RequestInit)?.method === "POST",
				),
			).toHaveLength(0);
		});
	});

	it("starts inline edit on Edit button click", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				String(url).includes("expense-categories")
					? jsonResponse([])
					: jsonResponse(rates),
			),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		expect(screen.getByDisplayValue("PS4")).toBeDefined();
		expect(screen.getByDisplayValue("5")).toBeDefined();
		expect(screen.getByText("Save Changes")).toBeDefined();
	});

	it("edits a rate via PUT with reason", async () => {
		const updatedRate = { ...rate, game_name: "PS5", price_per_unit: 8 };

		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(updatedRate);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const nameInput = screen.getByDisplayValue("PS4");
		fireEvent.change(nameInput, { target: { value: "PS5" } });

		const priceInput = screen.getByDisplayValue("5");
		fireEvent.change(priceInput, { target: { value: "8" } });

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, { target: { value: "Updated pricing" } });

		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates/r1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Rate updated successfully!");
	});

	it("disables Save Changes when edit reason is empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				String(url).includes("expense-categories")
					? jsonResponse([])
					: jsonResponse(rates),
			),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const saveBtn = screen.getByText("Save Changes");
		expect(saveBtn.closest("button")).toHaveProperty("disabled", true);

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, { target: { value: "Valid reason" } });
		expect(
			screen.getByText("Save Changes").closest("button"),
		).not.toHaveProperty("disabled", true);
	});

	it("toggles rate active status via PUT", async () => {
		const deactivatedRate = { ...rate, isActive: false };

		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(deactivatedRate);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Deactivate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates/r1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Rate deactivated");
	});

	it("cancels edit without saving", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				String(url).includes("expense-categories")
					? jsonResponse([])
					: jsonResponse(rates),
			),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);
		expect(screen.getByDisplayValue("PS4")).toBeDefined();

		fireEvent.click(screen.getByText("Cancel"));

		await waitFor(() => {
			expect(screen.queryByDisplayValue("PS4")).toBeNull();
		});
	});

	it("shows error toast when add rate POST fails", async () => {
		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(null, false, 500);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Game Name"), {
			target: { value: "Darts" },
		});
		fireEvent.change(screen.getByLabelText("Price ($)"), {
			target: { value: "3" },
		});
		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to add game rate");
		});
	});

	it("shows error toast when save edit PUT fails", async () => {
		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(null, false, 500);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, { target: { value: "Updated pricing" } });

		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to update rate");
		});
	});

	it("shows error toast when toggle status PUT fails", async () => {
		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(null, false, 500);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Deactivate"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to update rate status");
		});
	});

	it("sends unit_type Game when add form unit select is changed", async () => {
		const newRate = {
			id: "r3",
			game_name: "Darts",
			price_per_unit: 3,
			unit_type: "Game" as const,
			isActive: true,
		};

		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(newRate);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Unit"), {
			target: { value: "Game" },
		});
		fireEvent.change(screen.getByLabelText("Game Name"), {
			target: { value: "Darts" },
		});
		fireEvent.change(screen.getByLabelText("Price ($)"), {
			target: { value: "3" },
		});
		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		const postInit = fetchMock.mock.calls.find(
			([, init]) => (init as RequestInit)?.method === "POST",
		)?.[1] as RequestInit | undefined;
		const body = JSON.parse(String(postInit?.body));
		expect(body).toMatchObject({ unit_type: "Game" });
	});

	it("sends unit_type Game when edit form unit select is changed", async () => {
		const updatedRate = { ...rate, unit_type: "Game" as const };

		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([]);
			}
			if (init?.method === "POST" || init?.method === "PUT") {
				return jsonResponse(updatedRate);
			}
			return jsonResponse(rates);
		});

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const editUnitSelect = document.getElementById(
			"edit-unit-r1",
		) as HTMLSelectElement;
		fireEvent.change(editUnitSelect, { target: { value: "Game" } });

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, {
			target: { value: "Switching to per-game pricing" },
		});

		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		const putInit = fetchMock.mock.calls.find(
			([, init]) => (init as RequestInit)?.method === "PUT",
		)?.[1] as RequestInit | undefined;
		const body = JSON.parse(String(putInit?.body));
		expect(body).toMatchObject({ unit_type: "Game" });
	});

	// biome-ignore format: migrated block
	describe("expense categories (M-73, moved from Expenses)", () => {
		const catsActive = [
			{ id: "c1", name: "Supplies", isActive: true },
			{ id: "c2", name: "Wages", isActive: true },
		];
		const stubAdmin = (
			fetchMock: ReturnType<typeof vi.fn>,
			catsPayload: unknown,
			mutate?: (url: string, init?: RequestInit) => Response | Promise<Response> | undefined,
		) => {
			fetchMock.mockImplementation((url: string, init?: RequestInit) => {
				if (mutate) {
					const handled = mutate(url, init);
					if (handled) return handled;
				}
				if (String(url).includes("expense-categories")) {
					return jsonResponse(catsPayload as unknown[]);
				}
				return jsonResponse(rates);
			});
		};

		it("renders the Manage Categories section", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, [{ id: "c1", name: "Supplies", isActive: true }]);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");
			expect(screen.getByText("Manage Categories")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("New category name"),
			).toBeInTheDocument();
		});

		it("creates a new category via POST", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, [{ id: "c1", name: "Supplies", isActive: true }], (url, init) => {
				if (init?.method === "POST" && url.includes("expense-categories")) {
					return jsonResponse({
						id: "c-new",
						name: "Transport",
						isActive: true,
						created_at: new Date().toISOString(),
					});
				}
				return undefined;
			});
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("New category name"), {
				target: { value: "Transport" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith("Category created!"),
			);
			const transportItems = screen.getAllByText("Transport");
			expect(transportItems.length).toBeGreaterThanOrEqual(1);
		});

		it("TD-050: category deactivate button exposes an accessible name", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, [{ id: "c1", name: "Supplies", isActive: true }]);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			expect(
				screen.getByRole("button", { name: "Deactivate category" }),
			).toBeInTheDocument();
		});

		it("shows error toast when creating a duplicate category fails", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, [{ id: "c1", name: "Supplies", isActive: true }], (url, init) => {
				if (init?.method === "POST" && url.includes("expense-categories")) {
					return jsonResponse(
						{ error: "A category with this name already exists" },
						false,
						409,
					);
				}
				return undefined;
			});
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("New category name"), {
				target: { value: "Supplies" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() =>
				expect(toast.error).toHaveBeenCalledWith(
					"A category with this name already exists",
				),
			);
		});

		it("deactivates a category via PUT", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, catsActive, (url, init) => {
				if (init?.method === "PUT" && url.includes("expense-categories")) {
					const body = JSON.parse(String(init.body)) as { isActive?: boolean };
					if (body.isActive === false) {
						return jsonResponse({ id: "c2", name: "Wages", isActive: false });
					}
					return jsonResponse({ ok: true });
				}
				return undefined;
			});
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			const deactivateButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.querySelector("svg") && !btn.textContent);
			const deactivateBtn = deactivateButtons[deactivateButtons.length - 1];

			fireEvent.click(deactivateBtn);

			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith("Category deactivated!"),
			);
		});

		it("updates a category name with an edit reason via PUT", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, catsActive, (url, init) => {
				if (init?.method === "PUT" && url.includes("expense-categories")) {
					return jsonResponse({ id: "c1", name: "Supplies Pro", isActive: true });
				}
				return undefined;
			});
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			const suppliesRow = screen
				.getAllByText("Supplies")
				.find((el) => el.tagName === "SPAN")?.closest(".rounded-md") as HTMLElement;
			const editBtn = within(suppliesRow)
				.getAllByRole("button")
				.filter((btn) => btn.querySelector("svg"))[0];
			fireEvent.click(editBtn);

			const nameInput = await screen.findByPlaceholderText("Category name");
			expect(nameInput).toHaveValue("Supplies");
			fireEvent.change(screen.getByPlaceholderText("Reason for change"), {
				target: { value: "Renamed for clarity" },
			});

			fireEvent.click(screen.getByText("Save"));

			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith("Category updated!"),
			);
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("expense-categories/c1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});

		it("clears the inline category editor when Cancel is clicked", async () => {
			const fetchMock = vi.fn();
			stubAdmin(fetchMock, [{ id: "c1", name: "Supplies", isActive: true }]);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			const suppliesRow = screen
				.getAllByText("Supplies")
				.find((el) => el.tagName === "SPAN")?.closest(".rounded-md") as HTMLElement;
			const editBtn = within(suppliesRow)
				.getAllByRole("button")
				.filter((btn) => btn.querySelector("svg"))[0];
			fireEvent.click(editBtn);

			const nameInput = await screen.findByPlaceholderText("Category name");
			fireEvent.change(nameInput, { target: { value: "Changed" } });

			fireEvent.click(screen.getByText("Cancel"));

			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("Category name"),
				).not.toBeInTheDocument();
			});
			expect(
				fetchMock.mock.calls.filter(
					([, init]) => (init as RequestInit)?.method === "PUT",
				),
			).toHaveLength(0);
		});

		it("reactivates an inactive category via PUT", async () => {
			const fetchMock = vi.fn();
			stubAdmin(
				fetchMock,
				[
					{ id: "c1", name: "Supplies", isActive: true },
					{ id: "c2", name: "Wages", isActive: false },
				],
				(url, init) => {
					if (init?.method === "PUT" && url.includes("expense-categories")) {
						return jsonResponse({ id: "c2", name: "Wages", isActive: true });
					}
					return undefined;
				},
			);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			const wagesRow = screen
				.getByText("Wages")
				.closest(".rounded-md") as HTMLElement;
			const reactivateBtn = within(wagesRow)
				.getAllByRole("button")
				.filter((btn) => btn.querySelector("svg"))[0];

			fireEvent.click(reactivateBtn);

			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith("Category activated!"),
			);
		});
	});

	// biome-ignore format: migrated block
	describe("employee hiring (M-74, moved from EmployeeRoster)", () => {
		const stubHiring = (
			fetchMock: ReturnType<typeof vi.fn>,
			opts: { post?: unknown; fail?: boolean } = {},
		) => {
			fetchMock.mockImplementation((url: string, init?: RequestInit) => {
				if (String(url).includes("/api/employees")) {
					if (init?.method === "POST") {
						return opts.fail
							? jsonResponse({ error: "boom" }, false, 500)
							: jsonResponse(opts.post);
					}
					return jsonResponse([]);
				}
				if (String(url).includes("expense-categories")) {
					return jsonResponse([]);
				}
				return jsonResponse(rates);
			});
		};

		it("renders the Add Store Employee form", async () => {
			const fetchMock = vi.fn();
			stubHiring(fetchMock);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");
			expect(screen.getByText("Add Store Employee")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("e.g. John Doe"),
			).toBeInTheDocument();
		});

		it("adds a new employee via POST", async () => {
			const newEmp = {
				id: "e3",
				name: "Charlie",
				position: "Floor",
				base_salary: 400,
				hired_date: "2026-01-01",
				break_day: null,
				isActive: true,
				created_at: "2026-01-01T00:00:00.000Z",
			};
			const fetchMock = vi.fn();
			stubHiring(fetchMock, { post: newEmp });
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
				target: { value: "Charlie" },
			});
			fireEvent.change(
				screen.getByPlaceholderText("e.g. Cashier, Floor Attendant"),
				{ target: { value: "Floor" } },
			);
			fireEvent.change(screen.getByPlaceholderText("e.g. 500.00"), {
				target: { value: "400" },
			});
			fireEvent.click(screen.getByText("Add Employee"));

			await waitFor(() => {
				expect(fetchMock).toHaveBeenCalledWith(
					expect.stringContaining("/api/employees"),
					expect.objectContaining({ method: "POST" }),
				);
			});
			expect(toast.success).toHaveBeenCalledWith(
				"Employee Charlie added to roster!",
			);
		});

		it("skips the POST when salary is missing", async () => {
			const fetchMock = vi.fn();
			stubHiring(fetchMock);
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
				target: { value: "Charlie" },
			});
			fireEvent.change(
				screen.getByPlaceholderText("e.g. Cashier, Floor Attendant"),
				{ target: { value: "Floor" } },
			);
			fireEvent.click(screen.getByText("Add Employee"));

			expect(
				fetchMock.mock.calls.filter(
					([, init]) => (init as RequestInit)?.method === "POST",
				),
			).toHaveLength(0);
		});

		it("toasts add error when the POST fails", async () => {
			const fetchMock = vi.fn();
			stubHiring(fetchMock, { fail: true });
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
				target: { value: "Charlie" },
			});
			fireEvent.change(
				screen.getByPlaceholderText("e.g. Cashier, Floor Attendant"),
				{ target: { value: "Floor" } },
			);
			fireEvent.change(screen.getByPlaceholderText("e.g. 500.00"), {
				target: { value: "400" },
			});
			fireEvent.click(screen.getByText("Add Employee"));

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("boom");
			});
		});

		it("adds an employee with a custom hire date and break day", async () => {
			const newEmp = {
				id: "e9",
				name: "Dana",
				position: "Cashier",
				base_salary: 300,
				hired_date: "2023-05-05",
				break_day: "Wednesday",
				isActive: true,
				created_at: "2023-05-05T00:00:00.000Z",
			};
			const fetchMock = vi.fn();
			stubHiring(fetchMock, { post: newEmp });
			vi.stubGlobal("fetch", fetchMock);

			render(<Admin />);
			await screen.findByText("PS4");

			fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
				target: { value: "Dana" },
			});
			fireEvent.change(
				screen.getByPlaceholderText("e.g. Cashier, Floor Attendant"),
				{ target: { value: "Cashier" } },
			);
			fireEvent.change(screen.getByPlaceholderText("e.g. 500.00"), {
				target: { value: "300" },
			});
			fireEvent.change(screen.getByLabelText("Date of Hiring"), {
				target: { value: "2023-05-05" },
			});
			fireEvent.change(screen.getByLabelText("Break Day (Rest Day)"), {
				target: { value: "Wednesday" },
			});
			fireEvent.click(screen.getByText("Add Employee"));

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith(
					"Employee Dana added to roster!",
				);
			});
		});

		it("toasts add error when no token is available", async () => {
			mockGetIdToken.mockResolvedValue(null);
			const fetchMock = vi.fn();
			stubHiring(fetchMock);
			vi.stubGlobal("fetch", fetchMock);

			try {
				await runNoTokenScenario();
			} finally {
				mockGetIdToken.mockResolvedValue("mock-token");
			}

			async function runNoTokenScenario() {
				render(<Admin />);
				await screen.findByText("Add Store Employee");

			fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
				target: { value: "Charlie" },
			});
			fireEvent.change(
				screen.getByPlaceholderText("e.g. Cashier, Floor Attendant"),
				{ target: { value: "Floor" } },
			);
			fireEvent.change(screen.getByPlaceholderText("e.g. 500.00"), {
				target: { value: "400" },
			});
			fireEvent.click(screen.getByText("Add Employee"));

				await waitFor(() => {
					expect(toast.error).toHaveBeenCalledWith("Not authenticated");
				});
			}
		});
	});
});
