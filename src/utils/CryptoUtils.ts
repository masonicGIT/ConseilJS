import * as blakejs from 'blakejs';
import zxcvbn from 'zxcvbn';
const wrapper = require('./WrapperWrapper');

/**
 * Tezos cryptography helpers for the ed25519 curve.
 */
export namespace CryptoUtils {
    /**
     * Generates a salt for key derivation.
     * 
     * @returns {Promise<Buffer>} Salt
     */
    export async function generateSaltForPwHash() : Promise<Buffer> {
        const s = await wrapper.salt();
        return s;
    }

    /**
     * Encrypts a given message using a passphrase
     * 
     * @param {string} message Message to encrypt
     * @param {string} passphrase User-supplied passphrase
     * @param {Buffer} salt Salt for key derivation
     * @returns {Buffer} Concatenated bytes of nonce and cipher text
     */
    export async function encryptMessage(message: string, passphrase: string, salt: Buffer) : Promise<Buffer> {
        const passwordStrength = getPasswordStrength(passphrase);
        if (passwordStrength < 3) { throw new Error('The password strength should not be less than 3.'); }

        const messageBytes = Buffer.from(message);
        const keyBytes = await wrapper.pwhash(passphrase, salt)
        const n = await wrapper.nonce();
        const nonce = Buffer.from(n);
        const s = await wrapper.close(messageBytes, nonce, keyBytes);
        const cipherText = Buffer.from(s);

        return Buffer.concat([nonce, cipherText]);
    }

    /**
     * Decrypts a given message using a passphrase
     * 
     * @param {Buffer} nonce_and_ciphertext Concatenated bytes of nonce and cipher text
     * @param {string} passphrase User-supplied passphrase
     * @param {Buffer} salt Salt for key derivation
     * @returns {string} Decrypted message
     */
    export async function decryptMessage(nonce_and_ciphertext: Buffer, passphrase: string, salt: Buffer) : Promise<string> {
        const keyBytes = await wrapper.pwhash(passphrase, salt)
        const m = await wrapper.open(nonce_and_ciphertext, keyBytes);
        return Buffer.from(m).toString();
    }

    /**
     * Computes a BLAKE2b message hash of the requested length.
     */
    export function simpleHash(payload: Buffer, length: number) : Buffer {
        return Buffer.from(blakejs.blake2b(payload, null, length)); // Same as libsodium.crypto_generichash
    }

    /**
     * Checking the password strength using zxcvbn
     * 
     * @returns {number} Password score
     */
    export function getPasswordStrength(password: string) : number {
        const results = zxcvbn(password);
        return results.score;
    }

    /**
     * Generate key pair from seed.
     * 
     * @param seed 
     */
    export async function generateKeys(seed: Buffer) {
        if (seed.toString('hex').length !== 32) {
          throw new Error('Please ensure your seed is 32 bytes')
        }
        const k = await wrapper.keys(seed);

        let privateKey = new Buffer(k.privateKey).toString('hex')
        let publicKey = new Buffer(k.publicKey).toString('hex')

        return { privateKey: privateKey, publicKey: publicKey };
    }

    /**
     * Generate key pair from secret key by recovering the seed.
     * 
     * @param secretKey 
     */
    export async function recoverPublicKey(secretKey: Buffer) {
        const k = await wrapper.publickey(secretKey);

        return { privateKey: k.privateKey, publicKey: k.publicKey };
    }

    /**
     * Sign arbitrary bytes with a secret key.
     * 
     * @param payload 
     * @param secretKey 
     */
    export async function signDetached(payload: Buffer, secretKey: Buffer) : Promise<Buffer> {
        const b = await wrapper.sign(payload, secretKey)
        return Buffer.from(b);
    }
}