use anyhow::Result;
use rusqlite::{Connection, params};

/// Lookup vulnerabilities for a vendor from CVE cache.
pub fn lookup_vulnerabilities(
    conn: &Connection,
    vendor: &str,
) -> Result<Vec<crate::models::VulnerabilityInfo>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT cve_id, description, severity, cvss_score
        FROM cve_cache
        WHERE LOWER(vendor) = LOWER(?1) OR vendor = '*'
        ORDER BY cvss_score DESC NULLS LAST
        "#,
    )?;

    let vulns = stmt
        .query_map(params![vendor], |row| {
            Ok(crate::models::VulnerabilityInfo {
                cve_id: row.get(0)?,
                description: row.get(1)?,
                severity: row.get(2)?,
                cvss_score: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(vulns)
}

/// Lookup port warnings for given ports.
pub fn lookup_port_warnings(
    conn: &Connection,
    ports: &[u16],
) -> Result<Vec<crate::models::PortWarning>> {
    if ports.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = ports.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT port, service, warning, severity, recommendation FROM port_warnings WHERE port IN ({})",
        placeholders
    );

    let mut stmt = conn.prepare(&query)?;
    let params: Vec<&dyn rusqlite::ToSql> = ports
        .iter()
        .map(|port| port as &dyn rusqlite::ToSql)
        .collect();

    let warnings = stmt
        .query_map(params.as_slice(), |row| {
            Ok(crate::models::PortWarning {
                port: row.get::<_, i64>(0)? as u16,
                service: row.get(1)?,
                warning: row.get(2)?,
                severity: row.get(3)?,
                recommendation: row.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(warnings)
}
