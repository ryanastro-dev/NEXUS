use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use native_tls::TlsConnector;

use super::{CONNECT_TIMEOUT_MS, DEFAULT_MIKROTIK_TLS_PORT, IO_TIMEOUT_MS};

trait RouterosIo: Read + Write + Send {}
impl<T> RouterosIo for T where T: Read + Write + Send {}

#[derive(Default)]
pub(super) struct ApiResponse {
    pub(super) rows: Vec<HashMap<String, String>>,
    pub(super) done: HashMap<String, String>,
}

pub(super) struct ApiClient {
    stream: Box<dyn RouterosIo>,
}

impl ApiClient {
    pub(super) fn connect(address: &str, port: u16) -> Result<Self, String> {
        let socket = format!("{address}:{port}")
            .to_socket_addrs()
            .map_err(|e| format!("Resolve failed for {}:{}: {}", address, port, e))?
            .next()
            .ok_or_else(|| format!("No address resolved for {}:{}", address, port))?;

        let stream = TcpStream::connect_timeout(&socket, Duration::from_millis(CONNECT_TIMEOUT_MS))
            .map_err(|e| format!("Connect failed to {}:{}: {}", address, port, e))?;
        stream
            .set_read_timeout(Some(Duration::from_millis(IO_TIMEOUT_MS)))
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        stream
            .set_write_timeout(Some(Duration::from_millis(IO_TIMEOUT_MS)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;

        if port == DEFAULT_MIKROTIK_TLS_PORT {
            let connector = TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
                .map_err(|e| format!("TLS connector init failed: {}", e))?;
            let tls = connector
                .connect(address, stream)
                .map_err(|e| format!("TLS handshake failed at {}:{}: {}", address, port, e))?;
            Ok(Self {
                stream: Box::new(tls),
            })
        } else {
            Ok(Self {
                stream: Box::new(stream),
            })
        }
    }

    fn encode_len(len: usize) -> Vec<u8> {
        if len < 0x80 {
            vec![len as u8]
        } else if len < 0x4000 {
            vec![((len >> 8) as u8) | 0x80, (len & 0xFF) as u8]
        } else if len < 0x20_0000 {
            vec![
                ((len >> 16) as u8) | 0xC0,
                ((len >> 8) & 0xFF) as u8,
                (len & 0xFF) as u8,
            ]
        } else if len < 0x1000_0000 {
            vec![
                ((len >> 24) as u8) | 0xE0,
                ((len >> 16) & 0xFF) as u8,
                ((len >> 8) & 0xFF) as u8,
                (len & 0xFF) as u8,
            ]
        } else {
            vec![
                0xF0,
                ((len >> 24) & 0xFF) as u8,
                ((len >> 16) & 0xFF) as u8,
                ((len >> 8) & 0xFF) as u8,
                (len & 0xFF) as u8,
            ]
        }
    }

    fn read_len(&mut self) -> Result<usize, String> {
        let mut first = [0u8; 1];
        self.stream
            .read_exact(&mut first)
            .map_err(|e| format!("Read length failed: {}", e))?;
        let first = first[0];
        if first & 0x80 == 0 {
            return Ok(first as usize);
        }
        if first & 0xC0 == 0x80 {
            let mut b = [0u8; 1];
            self.stream
                .read_exact(&mut b)
                .map_err(|e| format!("Read length tail failed: {}", e))?;
            return Ok((((first & !0xC0) as usize) << 8) | b[0] as usize);
        }
        if first & 0xE0 == 0xC0 {
            let mut b = [0u8; 2];
            self.stream
                .read_exact(&mut b)
                .map_err(|e| format!("Read length tail failed: {}", e))?;
            return Ok((((first & !0xE0) as usize) << 16) | ((b[0] as usize) << 8) | b[1] as usize);
        }
        if first & 0xF0 == 0xE0 {
            let mut b = [0u8; 3];
            self.stream
                .read_exact(&mut b)
                .map_err(|e| format!("Read length tail failed: {}", e))?;
            return Ok((((first & !0xF0) as usize) << 24)
                | ((b[0] as usize) << 16)
                | ((b[1] as usize) << 8)
                | b[2] as usize);
        }
        let mut b = [0u8; 4];
        self.stream
            .read_exact(&mut b)
            .map_err(|e| format!("Read length tail failed: {}", e))?;
        Ok(((b[0] as usize) << 24)
            | ((b[1] as usize) << 16)
            | ((b[2] as usize) << 8)
            | b[3] as usize)
    }

    fn write_sentence(&mut self, words: &[String]) -> Result<(), String> {
        for word in words {
            self.stream
                .write_all(&Self::encode_len(word.len()))
                .map_err(|e| format!("Write length failed: {}", e))?;
            self.stream
                .write_all(word.as_bytes())
                .map_err(|e| format!("Write word failed: {}", e))?;
        }
        self.stream
            .write_all(&[0u8])
            .map_err(|e| format!("Write sentence terminator failed: {}", e))?;
        self.stream
            .flush()
            .map_err(|e| format!("Flush failed: {}", e))?;
        Ok(())
    }

    fn read_sentence(&mut self) -> Result<Vec<String>, String> {
        let mut words = Vec::new();
        loop {
            let len = self.read_len()?;
            if len == 0 {
                return Ok(words);
            }
            let mut payload = vec![0u8; len];
            self.stream
                .read_exact(&mut payload)
                .map_err(|e| format!("Read word payload failed: {}", e))?;
            let word = String::from_utf8(payload)
                .map_err(|e| format!("RouterOS response contains invalid UTF-8: {}", e))?;
            words.push(word);
        }
    }

    fn parse_attributes(words: &[String]) -> HashMap<String, String> {
        let mut map = HashMap::new();
        for word in words {
            if let Some(rest) = word.strip_prefix('=')
                && let Some((k, v)) = rest.split_once('=')
            {
                map.insert(k.to_string(), v.to_string());
            }
        }
        map
    }

    fn build_challenge_response(password: &str, challenge: &str) -> Result<String, String> {
        let challenge = challenge.trim();
        let challenge = challenge
            .strip_prefix("0x")
            .or_else(|| challenge.strip_prefix("0X"))
            .unwrap_or(challenge);
        let challenge_bytes = hex::decode(challenge).map_err(|error| {
            format!(
                "RouterOS challenge token is not valid hex ('{}'): {}",
                challenge, error
            )
        })?;

        let mut payload = Vec::with_capacity(1 + password.len() + challenge_bytes.len());
        payload.push(0);
        payload.extend_from_slice(password.as_bytes());
        payload.extend_from_slice(&challenge_bytes);

        let digest = md5::compute(payload);
        Ok(format!("00{:x}", digest))
    }

    pub(super) fn command(&mut self, words: Vec<String>) -> Result<ApiResponse, String> {
        self.write_sentence(&words)?;
        let mut out = ApiResponse::default();
        loop {
            let sentence = self.read_sentence()?;
            if sentence.is_empty() {
                continue;
            }
            let attrs = Self::parse_attributes(&sentence[1..]);
            match sentence[0].as_str() {
                "!re" => out.rows.push(attrs),
                "!done" => {
                    out.done = attrs;
                    return Ok(out);
                }
                "!trap" | "!fatal" => {
                    return Err(attrs
                        .get("message")
                        .cloned()
                        .unwrap_or_else(|| "RouterOS API returned an error".to_string()));
                }
                _ => {}
            }
        }
    }

    pub(super) fn login(&mut self, username: &str, password: &str) -> Result<(), String> {
        let response = self.command(vec![
            "/login".to_string(),
            format!("=name={}", username),
            format!("=password={}", password),
        ])?;
        if let Some(challenge) = response.done.get("ret") {
            let response_token = Self::build_challenge_response(password, challenge)?;
            self.command(vec![
                "/login".to_string(),
                format!("=name={}", username),
                format!("=response={}", response_token),
            ])?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::ApiClient;

    #[test]
    fn build_challenge_response_matches_expected_md5_digest() {
        let response = ApiClient::build_challenge_response("s3cret", "0123456789abcdef")
            .expect("challenge response should be computed");
        assert_eq!(response, "001d352ae065b1043d4e899c6106656bd6");
    }

    #[test]
    fn build_challenge_response_accepts_0x_prefixed_challenge() {
        let response = ApiClient::build_challenge_response("s3cret", "0x0123456789abcdef")
            .expect("challenge response should be computed");
        assert_eq!(response, "001d352ae065b1043d4e899c6106656bd6");
    }

    #[test]
    fn build_challenge_response_rejects_invalid_hex() {
        let error = ApiClient::build_challenge_response("s3cret", "not-hex")
            .expect_err("invalid hex challenge should fail");
        assert!(error.contains("not valid hex"));
    }
}
