import {
  Camera,
  Cpu,
  Gamepad2,
  HardDrive,
  HelpCircle,
  Laptop,
  MonitorSmartphone,
  Printer,
  Router,
  Server,
  Shield,
  Smartphone,
  Tv,
  Wifi,
} from 'lucide-react';
import type { ElementType } from 'react';

export const DEVICE_ICONS: Record<string, ElementType> = {
  ROUTER: Router,
  SWITCH: Cpu,
  ACCESS_POINT: Wifi,
  FIREWALL: Shield,
  SERVER: Server,
  NAS: HardDrive,
  PC: Laptop,
  LAPTOP: Laptop,
  MOBILE: Smartphone,
  TABLET: MonitorSmartphone,
  SMART_TV: Tv,
  IOT_DEVICE: Cpu,
  PRINTER: Printer,
  CAMERA: Camera,
  GAME_CONSOLE: Gamepad2,
  UNKNOWN: HelpCircle,
};

export const DEVICE_COLORS: Record<string, string> = {
  ROUTER: '#3B82F6',
  SWITCH: '#10B981',
  ACCESS_POINT: '#0EA5E9',
  FIREWALL: '#EF4444',
  SERVER: '#F59E0B',
  NAS: '#F59E0B',
  PC: '#6B7280',
  LAPTOP: '#6B7280',
  MOBILE: '#14B8A6',
  TABLET: '#14B8A6',
  SMART_TV: '#14B8A6',
  IOT_DEVICE: '#EF4444',
  PRINTER: '#14B8A6',
  CAMERA: '#F97316',
  GAME_CONSOLE: '#06B6D4',
  UNKNOWN: '#9CA3AF',
};

export const FALLBACK_DEVICE_COLOR = '#9CA3AF';
