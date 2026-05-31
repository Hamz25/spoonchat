import _sodium from 'libsodium-wrappers'


async function getSodium() {
    await _sodium.ready
    return _sodium
}

// Key generation
export async function generateKeyPair() {
    const sodium = await getSodium()

    const keyPair = sodium.crypto_box_keypair()
    return {
        publicKey: sodium.to_base64(keyPair.publicKey),
        privateKey: sodium.to_base64(keyPair.privateKey)
    }
}

// Key storage 

export function saveKeyPair(publicKey, privateKey) {
    localStorage.setItem('spoonchat_public_key', publicKey)
    localStorage.setItem('spoonchat_private_key', privateKey)
}

export function loadKeyPair() {
    const publicKey = localStorage.getItem('spoonchat_public_key')
    const privateKey = localStorage.getItem('spoonchat_private_key')

    if (!publicKey || !privateKey) {
        return null
    }

    return { publicKey, privateKey }
}

export function clearKeyPair() {
    localStorage.removeItem('spoonchat_public_key')
    localStorage.removeItem('spoonchat_private_key')
}

// Encryption
export async function encryptMessage(plaintext,
    recipientPublicKey, 
    senderPrivateKey) {

    const sodium = await getSodium()
    // Convert base64 keys to Uint8Arrays for crypto functions
    const recipientPubKey = sodium.from_base64(recipientPublicKey)
    const senderPrivKey = sodium.from_base64(senderPrivateKey)
    // generate a random nonce for this message
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
    const messageBytes = sodium.from_string(plaintext)
    const ciphertext = sodium.crypto_box_easy(messageBytes, //what to encrypt
        nonce, // random value ensure uniqueness
        recipientPubKey,  // reciver public key
        senderPrivKey // sender private key
    )

    return {
        ciphertext: sodium.to_base64(ciphertext),
        nonce: sodium.to_base64(nonce)
    }
}


// Decryption

export async function decryptMessage(ciphertext, 
    nonce, 
    senderPublicKey, 
    recipientPrivateKey) {
        const sodium = await getSodium()
        try {
            const decrypted = sodium.crypto_box_open_easy(
                sodium.from_base64(ciphertext),
                sodium.from_base64(nonce),
                sodium.from_base64(senderPublicKey),
                sodium.from_base64(recipientPrivateKey)
            )
            return sodium.to_string(decrypted)
        } catch (e) {
            console.error('Decryption failed:', e)
            return null
        }
    }

// initialization 

export async function initializeKeyPair(uploadPublicKeyFn){
    let keyPair = loadKeyPair()
    if (!keyPair) {
        keyPair = await generateKeyPair()
        saveKeyPair(keyPair.publicKey, keyPair.privateKey)
        await uploadPublicKeyFn(keyPair.publicKey)
        console.log('SpoonChat: new Keypair generated and uploaded')
    }
    // upload public key to server so other users can encrypt messages to us

    return keyPair
}

