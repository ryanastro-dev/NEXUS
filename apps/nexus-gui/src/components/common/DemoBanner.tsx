import { useDemoMode } from '../../hooks/useDemoMode';

export default function DemoBanner() {
  useDemoMode(); // Ensure hook is still called if needed by React
  
  // Return nothing even if in demo mode to hide the banner from users
  return null;
}
