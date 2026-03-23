"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const scryptAsync = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const SCRYPT_KEY_LENGTH = 64;
async function hashPassword(password, salt) {
    const resolvedSalt = salt ?? (0, node_crypto_1.randomBytes)(16).toString('hex');
    const derivedKey = (await scryptAsync(password, resolvedSalt, SCRYPT_KEY_LENGTH));
    return `scrypt$${resolvedSalt}$${derivedKey.toString('hex')}`;
}
async function verifyPassword(password, storedHash) {
    if (!storedHash) {
        return false;
    }
    const [algorithm, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) {
        return false;
    }
    const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH));
    const expectedHash = Buffer.from(hash, 'hex');
    if (derivedKey.length !== expectedHash.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(derivedKey, expectedHash);
}
//# sourceMappingURL=auth-password.util.js.map