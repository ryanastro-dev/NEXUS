use serde::Serialize;
use std::fmt;
use std::str::FromStr;

/// Device type enumeration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeviceType {
    Router,
    Switch,
    AccessPoint,
    Firewall,
    Server,
    Nas,
    Pc,
    Laptop,
    Mobile,
    Tablet,
    SmartTv,
    IotDevice,
    Printer,
    Camera,
    GameConsole,
    Unknown,
}

impl DeviceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceType::Router => "ROUTER",
            DeviceType::Switch => "SWITCH",
            DeviceType::AccessPoint => "ACCESS_POINT",
            DeviceType::Firewall => "FIREWALL",
            DeviceType::Server => "SERVER",
            DeviceType::Nas => "NAS",
            DeviceType::Pc => "PC",
            DeviceType::Laptop => "LAPTOP",
            DeviceType::Mobile => "MOBILE",
            DeviceType::Tablet => "TABLET",
            DeviceType::SmartTv => "SMART_TV",
            DeviceType::IotDevice => "IOT_DEVICE",
            DeviceType::Printer => "PRINTER",
            DeviceType::Camera => "CAMERA",
            DeviceType::GameConsole => "GAME_CONSOLE",
            DeviceType::Unknown => "UNKNOWN",
        }
    }
}

impl fmt::Display for DeviceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for DeviceType {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let normalized = value.trim().to_ascii_uppercase().replace(['-', ' '], "_");

        let parsed = match normalized.as_str() {
            "ROUTER" => DeviceType::Router,
            "SWITCH" => DeviceType::Switch,
            "ACCESS_POINT" | "ACCESSPOINT" => DeviceType::AccessPoint,
            "FIREWALL" => DeviceType::Firewall,
            "SERVER" => DeviceType::Server,
            "NAS" => DeviceType::Nas,
            "PC" => DeviceType::Pc,
            "LAPTOP" => DeviceType::Laptop,
            "MOBILE" => DeviceType::Mobile,
            "TABLET" => DeviceType::Tablet,
            "SMART_TV" | "SMARTTV" => DeviceType::SmartTv,
            "IOT_DEVICE" | "IOT" => DeviceType::IotDevice,
            "PRINTER" => DeviceType::Printer,
            "CAMERA" => DeviceType::Camera,
            "GAME_CONSOLE" | "GAMECONSOLE" => DeviceType::GameConsole,
            "UNKNOWN" => DeviceType::Unknown,
            _ => return Err(()),
        };

        Ok(parsed)
    }
}
