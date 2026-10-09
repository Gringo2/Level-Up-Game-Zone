// Preloaded into the real server process (node --require). Makes `new Date()` and
// `Date.now()` start at INTEGRATION_NOW and keep running from there, so shop-day
// logic is deterministic. Test support only; never loaded by the application.
const RealDate = Date;
const start = RealDate.parse(process.env.INTEGRATION_NOW);
if (Number.isNaN(start)) throw new Error("INTEGRATION_NOW is required");
const offset = start - RealDate.now();
class PinnedDate extends RealDate {
	constructor(...args) {
		if (args.length === 0) super(RealDate.now() + offset);
		else super(...args);
	}
	static now() {
		return RealDate.now() + offset;
	}
}
globalThis.Date = PinnedDate;
