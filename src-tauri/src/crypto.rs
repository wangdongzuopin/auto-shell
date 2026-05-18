use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};

const NONCE_LEN: usize = 12;
const TAG_LEN: usize = 16;
const KEY_LEN: usize = 32;

/// Generate a new random 256-bit encryption key.
pub fn generate_key() -> [u8; KEY_LEN] {
    let rng = SystemRandom::new();
    let mut key_bytes = [0u8; KEY_LEN];
    rng.fill(&mut key_bytes).expect("CSPRNG failure");
    key_bytes
}

/// Encrypt plaintext with AES-256-GCM. Returns base64(nonce || ciphertext || tag).
pub fn encrypt(plaintext: &str, key_bytes: &[u8; KEY_LEN]) -> Result<String, String> {
    let unbound = UnboundKey::new(&AES_256_GCM, key_bytes).map_err(|e| format!("key error: {e}"))?;
    let key = LessSafeKey::new(unbound);

    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes).map_err(|e| format!("rng error: {e}"))?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut buf = plaintext.as_bytes().to_vec();
    key.seal_in_place_append_tag(nonce, Aad::empty(), &mut buf)
        .map_err(|e| format!("encrypt error: {e}"))?;

    // Layout: nonce (12) || ciphertext+tag
    let mut output = nonce_bytes.to_vec();
    output.extend_from_slice(&buf);

    Ok(base64_encode(&output))
}

/// Decrypt ciphertext produced by `encrypt`. Expects base64(nonce || ciphertext || tag).
pub fn decrypt(encoded: &str, key_bytes: &[u8; KEY_LEN]) -> Result<String, String> {
    let unbound = UnboundKey::new(&AES_256_GCM, key_bytes).map_err(|e| format!("key error: {e}"))?;
    let key = LessSafeKey::new(unbound);

    let data = base64_decode(encoded)?;
    if data.len() < NONCE_LEN + TAG_LEN {
        return Err("invalid ciphertext length".into());
    }

    let (nonce_bytes, rest) = data.split_at(NONCE_LEN);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes.try_into().unwrap());
    let mut buf = rest.to_vec();

    let plain = key
        .open_in_place(nonce, Aad::empty(), &mut buf)
        .map_err(|e| format!("decrypt error: {e}"))?;

    String::from_utf8(plain.to_vec()).map_err(|e| format!("utf8 error: {e}"))
}

pub(crate) fn base64_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(data)
}

pub(crate) fn base64_decode(s: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .map_err(|e| format!("base64 error: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let key = generate_key();
        let plain = "sk-0123456789abcdef";
        let enc = encrypt(plain, &key).unwrap();
        let dec = decrypt(&enc, &key).unwrap();
        assert_eq!(plain, dec);
    }

    #[test]
    fn different_keys_fail() {
        let k1 = generate_key();
        let k2 = generate_key();
        let enc = encrypt("secret", &k1).unwrap();
        assert!(decrypt(&enc, &k2).is_err());
    }

    #[test]
    fn tampered_data_fails() {
        let key = generate_key();
        let enc = encrypt("secret", &key).unwrap();
        let mut tampered = base64_decode(&enc).unwrap();
        tampered[0] ^= 0xff;
        let bad = base64_encode(&tampered);
        assert!(decrypt(&bad, &key).is_err());
    }

    #[test]
    fn empty_string_roundtrip() {
        let key = generate_key();
        let enc = encrypt("", &key).unwrap();
        let dec = decrypt(&enc, &key).unwrap();
        assert_eq!(dec, "");
    }

    #[test]
    fn long_text_roundtrip() {
        let key = generate_key();
        let text = "x".repeat(10_000);
        let enc = encrypt(&text, &key).unwrap();
        let dec = decrypt(&enc, &key).unwrap();
        assert_eq!(dec, text);
    }

    #[test]
    fn unicode_roundtrip() {
        let key = generate_key();
        let text = "你好世界 🌍 — émojis and CJK";
        let enc = encrypt(text, &key).unwrap();
        let dec = decrypt(&enc, &key).unwrap();
        assert_eq!(dec, text);
    }

    #[test]
    fn reject_short_ciphertext() {
        let key = generate_key();
        let short = base64_encode(&[0u8; 5]);
        assert!(decrypt(&short, &key).is_err());
    }

    #[test]
    fn reject_invalid_base64() {
        let key = generate_key();
        assert!(decrypt("!!!not-valid-base64!!!", &key).is_err());
    }

    #[test]
    fn keys_are_unique() {
        let k1 = generate_key();
        let k2 = generate_key();
        assert_ne!(k1, k2);
    }

    #[test]
    fn base64_roundtrip() {
        let data = [0u8, 1, 2, 255, 254, 128];
        let encoded = base64_encode(&data);
        let decoded = base64_decode(&encoded).unwrap();
        assert_eq!(decoded, data);
    }

    #[test]
    fn base64_decode_empty() {
        let decoded = base64_decode("").unwrap();
        assert!(decoded.is_empty());
    }
}
