/**
 * Display wording for the "Worker / caller type" options (IV2-582).
 *
 * Three of the `client_types` rows name a *migrant* worker. Partner
 * organizations using this form also support local workers, so the word reads
 * as a restriction the question does not intend. The wording is a facelift
 * concern only: the rows themselves are shared -- some 47k live cases point at
 * them and ILM-fronted lists them by name -- so nothing is renamed in the
 * database. The canonical name is kept as the value and only the label an
 * officer reads is swapped here.
 *
 * Keyed by the exact stored name. A row this map does not know is shown as it
 * comes back, so adding an option server-side needs no change here.
 */
const CLIENT_TYPE_LABELS: Record<string, string> = {
	"Not a migrant worker or victim (for example, NGO, media or police)":
		"Not a worker or victim (for example, NGO, media or police)",
	"Migrant worker, not in exploitation situation":
		"Worker, not in exploitation situation",
	"Migrant worker, currently experiencing labor issues":
		"Worker, currently experiencing labor issues",
};

export const clientTypeLabel = <T extends string | null | undefined>(
	name: T,
): T | string => (name ? (CLIENT_TYPE_LABELS[name] ?? name) : name);
