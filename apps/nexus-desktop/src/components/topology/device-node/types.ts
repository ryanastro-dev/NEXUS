export interface DeviceNodeData {
  label: string;
  ip: string;
  mac?: string;
  deviceType: string;
  isOnline: boolean;
  riskScore?: number;
  vendor?: string;
}

export interface DeviceNodeThemeTokens {
  bgColor: string;
  borderColor: string;
  textPrimary: string;
  textMuted: string;
  dividerColor: string;
  handleBorder: string;
}
