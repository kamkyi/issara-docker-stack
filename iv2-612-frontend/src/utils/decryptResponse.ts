/**
 * Decrypts AES-256-GCM payloads produced by the backend `encryptResponse` middleware.
 *
 * Wire format:  base64( iv[12] || authTag[16] || ciphertext )
 *
 * The same VITE_RESPONSE_SECRET must match the backend RESPONSE_ENCRYPTION_KEY.
 */

const SECRET =
	import.meta.env.VITE_RESPONSE_SECRET ??
	"dev-key-change-this-in-production-!!";

let _cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
	if (_cachedKey) return _cachedKey;
	const keyBytes = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(SECRET),
	);
	_cachedKey = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		{ name: "AES-GCM" },
		false,
		["decrypt"],
	);
	return _cachedKey;
}

/**
 * Decrypts a packed base64 string and returns the parsed JSON value.
 * Throws if the payload is invalid or tampered with (auth tag mismatch).
 */
export async function decryptPayload(encoded: string): Promise<unknown> {
	const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

	const iv = raw.slice(0, 12);
	const authTag = raw.slice(12, 28);
	const ciphertext = raw.slice(28);

	// Web Crypto AES-GCM expects: ciphertext || authTag
	const combined = new Uint8Array(ciphertext.length + authTag.length);
	combined.set(ciphertext);
	combined.set(authTag, ciphertext.length);

	const key = await getKey();
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv, tagLength: 128 },
		key,
		combined,
	);
	return JSON.parse(new TextDecoder().decode(decrypted));
}
