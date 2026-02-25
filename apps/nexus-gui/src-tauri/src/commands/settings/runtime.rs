use nexus_core::{remove_runtime_override, set_runtime_override};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct AiRuntimeSettingsInput {
    pub enabled: bool,
    pub mode: String,
    pub timeout_ms: u64,
    pub ollama_endpoint: String,
    pub ollama_model: String,
    pub gemini_endpoint: String,
    pub gemini_model: String,
    pub gemini_api_key: Option<String>,
    pub cloud_allow_sensitive: bool,
}

fn set_runtime_env_var<K, V>(key: K, value: V) -> Result<(), String>
where
    K: AsRef<str>,
    V: AsRef<str>,
{
    set_runtime_override(key.as_ref(), value.as_ref());
    Ok(())
}

fn remove_runtime_env_var<K>(key: K) -> Result<(), String>
where
    K: AsRef<str>,
{
    remove_runtime_override(key.as_ref());
    Ok(())
}

pub(crate) fn apply_runtime_settings_impl(
    snmp_enabled: bool,
    snmp_community: String,
    tcp_ports: Vec<u16>,
    monitoring_interval_seconds: Option<u64>,
) -> Result<(), String> {
    let community = snmp_community.trim();
    if community.is_empty() {
        return Err("SNMP community cannot be empty".to_string());
    }

    if tcp_ports.contains(&0) {
        return Err("TCP port list contains invalid port 0".to_string());
    }

    let mut unique_ports = std::collections::BTreeSet::new();
    for port in tcp_ports {
        unique_ports.insert(port);
    }

    let tcp_ports_csv = unique_ports
        .iter()
        .map(|port| port.to_string())
        .collect::<Vec<_>>()
        .join(",");

    set_runtime_env_var(
        "NEXUS_SNMP_ENABLED",
        if snmp_enabled { "true" } else { "false" },
    )?;
    set_runtime_env_var("NEXUS_SNMP_COMMUNITY", community)?;

    if !tcp_ports_csv.is_empty() {
        set_runtime_env_var("NEXUS_TCP_PROBE_PORTS", tcp_ports_csv)?;
    }

    if let Some(interval) = monitoring_interval_seconds {
        let clamped = interval.clamp(5, 86_400);
        set_runtime_env_var("NEXUS_DEFAULT_MONITOR_INTERVAL", clamped.to_string())?;
    }

    Ok(())
}

pub(crate) fn apply_ai_runtime_settings_impl(
    settings: AiRuntimeSettingsInput,
) -> Result<(), String> {
    let mode = settings.mode.trim().to_ascii_lowercase();
    if !matches!(
        mode.as_str(),
        "disabled" | "local" | "cloud" | "hybrid_auto"
    ) {
        return Err("Invalid AI mode. Use disabled/local/cloud/hybrid_auto".to_string());
    }

    let timeout_ms = settings.timeout_ms.clamp(500, 60_000);
    let ollama_endpoint = settings.ollama_endpoint.trim();
    let ollama_model = settings.ollama_model.trim();
    let gemini_endpoint = settings.gemini_endpoint.trim();
    let gemini_model = settings.gemini_model.trim();
    let gemini_api_key = settings
        .gemini_api_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if matches!(mode.as_str(), "local" | "hybrid_auto")
        && (ollama_endpoint.is_empty() || ollama_model.is_empty())
    {
        return Err("Ollama endpoint and model are required for local/hybrid mode".to_string());
    }

    if matches!(mode.as_str(), "cloud" | "hybrid_auto")
        && (gemini_endpoint.is_empty() || gemini_model.is_empty())
    {
        return Err("Gemini endpoint and model are required for cloud/hybrid mode".to_string());
    }

    set_runtime_env_var(
        "NEXUS_AI_ENABLED",
        if settings.enabled { "true" } else { "false" },
    )?;
    set_runtime_env_var("NEXUS_AI_MODE", mode)?;
    set_runtime_env_var("NEXUS_AI_TIMEOUT_MS", timeout_ms.to_string())?;

    if !ollama_endpoint.is_empty() {
        set_runtime_env_var("NEXUS_AI_ENDPOINT", ollama_endpoint)?;
    }
    if !ollama_model.is_empty() {
        set_runtime_env_var("NEXUS_AI_MODEL", ollama_model)?;
    }

    if !gemini_endpoint.is_empty() {
        set_runtime_env_var("NEXUS_AI_GEMINI_ENDPOINT", gemini_endpoint)?;
    }
    if !gemini_model.is_empty() {
        set_runtime_env_var("NEXUS_AI_GEMINI_MODEL", gemini_model)?;
    }

    match gemini_api_key {
        Some(key) => set_runtime_env_var("NEXUS_AI_GEMINI_API_KEY", key)?,
        None => remove_runtime_env_var("NEXUS_AI_GEMINI_API_KEY")?,
    }

    set_runtime_env_var(
        "NEXUS_AI_CLOUD_ALLOW_SENSITIVE",
        if settings.cloud_allow_sensitive {
            "true"
        } else {
            "false"
        },
    )?;

    Ok(())
}
