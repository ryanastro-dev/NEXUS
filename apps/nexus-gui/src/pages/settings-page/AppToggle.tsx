interface AppToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function AppToggle({ enabled, onToggle }: AppToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-12 rounded-full transition-colors ${
        enabled ? 'bg-accent-blue' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
