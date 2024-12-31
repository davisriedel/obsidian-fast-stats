import type { StatCounter } from "../pkg/obsidian_fast_stats";
import type { StatReport } from "./StatReport";

export type StatParser = {
	id: string;
	// biome-ignore  lint/suspicious/noExplicitAny: expr-eval does not provide typescript types
	expr: any;
};

// biome-ignore  lint/suspicious/noExplicitAny: expr-eval does not provide typescript types
export function calculateMetric(statCounter: StatCounter, expr: any) {
	const calculatedMetrics: Record<string, number> = {};
	expr.variables().forEach((v: string) => {
		if (!Object.hasOwn(calculatedMetrics, v))
			calculatedMetrics[v] = statCounter?.get_stat(v);
	});
	return expr.evaluate(calculatedMetrics);
}

export function getStatReport(
	parsers: StatParser[],
	statCounter: StatCounter,
): StatReport {
	if (!statCounter) return {};
	const stats: StatReport = {};
	parsers.forEach((stat) => {
		stats[stat.id] = calculateMetric(statCounter, stat.expr);
	});
	return stats;
}
