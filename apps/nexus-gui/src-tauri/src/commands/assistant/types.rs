#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssistantMetadata {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub ai_error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceSecurityAnalysis {
    pub target: String,
    pub ip: String,
    pub mac: String,
    pub risk_score: u8,
    pub risk_level: String,
    pub executive_summary: String,
    pub key_findings: Vec<String>,
    pub recommended_actions: Vec<String>,
    pub metadata: AssistantMetadata,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NetworkReportSummary {
    pub generated_at: String,
    pub subnet: Option<String>,
    pub total_hosts: usize,
    pub online_hosts: usize,
    pub offline_hosts: usize,
    pub executive_summary: String,
    pub topology_highlights: Vec<String>,
    pub key_risks: Vec<String>,
    pub recommended_actions: Vec<String>,
    pub metadata: AssistantMetadata,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceTroubleshootAdvice {
    pub target: String,
    pub ip: String,
    pub mac: String,
    pub status: String,
    pub summary: String,
    pub likely_causes: Vec<String>,
    pub diagnostic_steps: Vec<String>,
    pub suggested_commands: Vec<String>,
    pub metadata: AssistantMetadata,
}
