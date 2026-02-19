interface SettingsHeroProps {
  panelClassName: string;
}

export function SettingsHero({ panelClassName }: SettingsHeroProps) {
  return (
    <div className={`${panelClassName} p-5 sm:p-6`}>
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
        System Configuration
      </p>
      <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-4xl">Settings</h1>
      <p className="mt-2 text-sm text-text-secondary sm:text-base">
        Manage scan behavior, monitoring runtime, and local data policy for production use.
      </p>
    </div>
  );
}
