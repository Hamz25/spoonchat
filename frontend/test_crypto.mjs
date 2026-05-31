import _sodium from 'libsodium-wrappers'

await _sodium.ready
const sodium = _sodium

// Generate two keypairs — one for spoon, one for alice
const spoonKeys = sodium.crypto_box_keypair()
const aliceKeys = sodium.crypto_box_keypair()

console.log('spoon public key:', sodium.to_base64(spoonKeys.publicKey))
console.log('alice public key:', sodium.to_base64(aliceKeys.publicKey))

// spoon encrypts a message to alice
const message = 'hey alice, this is spoon'
const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
const ciphertext = sodium.crypto_box_easy(
  sodium.from_string(message),
  nonce,
  aliceKeys.publicKey,   // encrypted FOR alice
  spoonKeys.privateKey   // signed BY spoon
)

console.log('\nOriginal message:', message)
console.log('Ciphertext (base64):', sodium.to_base64(ciphertext))

// alice decrypts it
const decrypted = sodium.crypto_box_open_easy(
  ciphertext,
  nonce,
  spoonKeys.publicKey,   // verify it came from spoon
  aliceKeys.privateKey   // alice's private key
)

console.log('Decrypted message:', sodium.to_string(decrypted))
console.log('\nE2EE works:', message === sodium.to_string(decrypted))
