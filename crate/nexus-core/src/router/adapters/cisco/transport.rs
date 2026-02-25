use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::process::{Command, Stdio};
use std::time::Duration;

pub(super) fn probe_tcp_endpoint(address: &str, port: u16, timeout_ms: u64) -> bool {
    let Ok(addresses) = format!("{address}:{port}").to_socket_addrs() else {
        return false;
    };
    addresses.into_iter().any(|socket| {
        TcpStream::connect_timeout(&socket, Duration::from_millis(timeout_ms)).is_ok()
    })
}

fn ensure_ssh_available() -> Result<(), String> {
    Command::new("ssh")
        .arg("-V")
        .output()
        .map(|_| ())
        .map_err(|error| format!("OpenSSH client not found in PATH: {}", error))
}

pub(super) fn run_ssh_script(
    target: &str,
    port: u16,
    commands: &[String],
    connect_timeout_secs: u64,
) -> Result<String, String> {
    ensure_ssh_available()?;

    let mut child = Command::new("ssh")
        .arg("-T")
        .arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg("StrictHostKeyChecking=no")
        .arg("-o")
        .arg(format!("ConnectTimeout={}", connect_timeout_secs))
        .arg("-o")
        .arg("ServerAliveInterval=5")
        .arg("-o")
        .arg("ServerAliveCountMax=1")
        .arg("-p")
        .arg(port.to_string())
        .arg(target)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to launch ssh process: {}", error))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "Failed to acquire ssh stdin".to_string())?;
        let mut script = String::new();
        for command in commands {
            script.push_str(command.trim());
            script.push('\n');
        }
        script.push_str("exit\n");
        stdin
            .write_all(script.as_bytes())
            .map_err(|error| format!("Failed to write ssh command script: {}", error))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("ssh process failed to complete: {}", error))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        return Ok(stdout);
    }

    let reason = if !stderr.trim().is_empty() {
        stderr
    } else {
        stdout
    };
    Err(format!("SSH command execution failed: {}", reason.trim()))
}

pub(super) fn run_netconf_rpc(
    target: &str,
    port: u16,
    rpc_xml: &str,
    connect_timeout_secs: u64,
) -> Result<String, String> {
    ensure_ssh_available()?;

    let mut child = Command::new("ssh")
        .arg("-T")
        .arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg("StrictHostKeyChecking=no")
        .arg("-o")
        .arg(format!("ConnectTimeout={}", connect_timeout_secs))
        .arg("-p")
        .arg(port.to_string())
        .arg(target)
        .arg("-s")
        .arg("netconf")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to launch netconf ssh subsystem: {}", error))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "Failed to acquire netconf stdin".to_string())?;
        let hello = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><hello xmlns=\"urn:ietf:params:xml:ns:netconf:base:1.0\"><capabilities><capability>urn:ietf:params:netconf:base:1.0</capability></capabilities></hello>]]>]]>";
        let payload = format!("{}{}]]>]]>", hello, rpc_xml.trim());
        stdin
            .write_all(payload.as_bytes())
            .map_err(|error| format!("Failed to write netconf payload: {}", error))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("netconf ssh process failed to complete: {}", error))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        return Ok(stdout);
    }

    let reason = if !stderr.trim().is_empty() {
        stderr
    } else {
        stdout
    };
    Err(format!("NETCONF RPC execution failed: {}", reason.trim()))
}

pub(super) fn output_preview(output: &str) -> String {
    let mut lines = output.lines();
    let mut preview = String::new();
    for index in 0..4 {
        if let Some(line) = lines.next() {
            if index > 0 {
                preview.push_str(" | ");
            }
            preview.push_str(line.trim());
        } else {
            break;
        }
    }
    if preview.is_empty() {
        "(no output)".to_string()
    } else {
        preview
    }
}
