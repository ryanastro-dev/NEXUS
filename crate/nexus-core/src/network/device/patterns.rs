pub(super) const ROUTER_VENDOR_PATTERNS: &[&str] = &[
    "cisco",
    "juniper",
    "mikrotik",
    "ubiquiti",
    "netgear",
    "tp-link",
    "d-link",
    "asus router",
    "linksys",
];
pub(super) const AP_VENDOR_PATTERNS: &[&str] = &["aruba", "ruckus", "meraki", "unifi"];
pub(super) const FIREWALL_VENDOR_PATTERNS: &[&str] =
    &["fortinet", "palo alto", "checkpoint", "sonicwall"];
pub(super) const MOBILE_VENDOR_PATTERNS: &[&str] = &[
    "samsung",
    "xiaomi",
    "huawei",
    "oppo",
    "vivo",
    "oneplus",
    "realme",
    "google pixel",
];
pub(super) const PC_VENDOR_PATTERNS: &[&str] = &[
    "dell", "lenovo", "hp", "hewlett", "acer", "asus", "msi", "gigabyte", "intel", "amd",
];
pub(super) const SERVER_VENDOR_PATTERNS: &[&str] = &["supermicro", "ibm", "oracle", "vmware"];
pub(super) const NAS_VENDOR_PATTERNS: &[&str] = &["synology", "qnap", "western digital", "seagate"];
pub(super) const SMART_TV_VENDOR_PATTERNS: &[&str] = &[
    "lg electronics",
    "sony",
    "tcl",
    "hisense",
    "roku",
    "amazon fire",
];
pub(super) const PRINTER_VENDOR_PATTERNS: &[&str] =
    &["canon", "epson", "brother", "xerox", "ricoh", "lexmark"];
pub(super) const CAMERA_VENDOR_PATTERNS: &[&str] =
    &["hikvision", "dahua", "axis", "ring", "nest", "wyze", "arlo"];
pub(super) const GAME_CONSOLE_VENDOR_PATTERNS: &[&str] =
    &["nintendo", "microsoft xbox", "sony playstation"];
pub(super) const IOT_VENDOR_PATTERNS: &[&str] = &[
    "espressif",
    "tuya",
    "shelly",
    "sonoff",
    "philips hue",
    "ikea tradfri",
];

pub(super) const MOBILE_HOSTNAME_PATTERNS: &[&str] = &[
    "iphone", "ipad", "android", "galaxy", "pixel", "oneplus", "xiaomi", "redmi",
];
pub(super) const TABLET_HOSTNAME_PATTERNS: &[&str] = &["tablet", "ipad"];
pub(super) const PC_HOSTNAME_PATTERNS: &[&str] = &["desktop", "workstation", "pc-", "-pc"];
pub(super) const LAPTOP_HOSTNAME_PATTERNS: &[&str] =
    &["laptop", "notebook", "macbook", "thinkpad", "surface"];
pub(super) const SERVER_HOSTNAME_PATTERNS: &[&str] =
    &["server", "srv", "dc-", "db-", "web-", "app-", "mail-"];
pub(super) const NAS_HOSTNAME_PATTERNS: &[&str] = &["nas", "synology", "qnap", "diskstation"];
pub(super) const ROUTER_HOSTNAME_PATTERNS: &[&str] = &["router", "gateway", "gw-", "rt-"];
pub(super) const SWITCH_HOSTNAME_PATTERNS: &[&str] = &["switch", "sw-"];
pub(super) const AP_HOSTNAME_PATTERNS: &[&str] = &["ap-", "accesspoint", "wifi"];
pub(super) const PRINTER_HOSTNAME_PATTERNS: &[&str] = &["printer", "print", "prn-", "mfp-"];
pub(super) const CAMERA_HOSTNAME_PATTERNS: &[&str] =
    &["camera", "cam-", "ipcam", "cctv", "nvr", "dvr"];
pub(super) const SMART_TV_HOSTNAME_PATTERNS: &[&str] =
    &["tv-", "smarttv", "roku", "firetv", "chromecast", "appletv"];
pub(super) const GAME_CONSOLE_HOSTNAME_PATTERNS: &[&str] =
    &["xbox", "playstation", "ps4", "ps5", "nintendo", "switch"];

/// Helper function to check whether a string contains any of the patterns.
pub(super) fn contains_any(s: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|p| s.contains(p))
}
