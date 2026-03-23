//#region src/agents/model-id-normalization.ts
function normalizeGoogleModelId(id) {
	if (id === "gemini-3-pro") return "gemini-3-pro-preview";
	if (id === "gemini-3-flash") return "gemini-3-flash-preview";
	if (id === "gemini-3.1-pro") return "gemini-3.1-pro-preview";
	if (id === "gemini-3.1-flash-lite") return "gemini-3.1-flash-lite-preview";
	if (id === "gemini-3.1-flash" || id === "gemini-3.1-flash-preview") return "gemini-3-flash-preview";
	return id;
}
function normalizeXaiModelId(id) {
	if (id === "grok-4.20-experimental-beta-0304-reasoning") return "grok-4.20-reasoning";
	if (id === "grok-4.20-experimental-beta-0304-non-reasoning") return "grok-4.20-non-reasoning";
	return id;
}
//#endregion
export { normalizeXaiModelId as n, normalizeGoogleModelId as t };
