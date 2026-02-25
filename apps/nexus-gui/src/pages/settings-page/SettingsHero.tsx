import { useLanguage } from '../../hooks/useLanguage';

interface SettingsHeroProps {
  panelClassName: string;
}

export function SettingsHero({ panelClassName }: SettingsHeroProps) {
  const { copy } = useLanguage();
  const heroCopy = copy.settings.hero;

  return (
    <div className={`${panelClassName} p-5 sm:p-6`}>
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
        {heroCopy.kicker}
      </p>
      <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-4xl">{heroCopy.title}</h1>
      <p className="mt-2 text-sm text-text-secondary sm:text-base">
        {heroCopy.subtitle}
      </p>
    </div>
  );
}
