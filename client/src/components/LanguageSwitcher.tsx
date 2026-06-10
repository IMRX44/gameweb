import { useI18n } from '../i18n/I18nContext';
import { LOCALE_META, type Lang } from '../i18n/strings';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const langs = Object.keys(LOCALE_META) as Lang[];
  return (
    <div className={`lang-switch ${compact ? 'compact' : ''}`}>
      {langs.map((l) => (
        <button
          key={l}
          className={`lang-btn ${l === lang ? 'active' : ''}`}
          onClick={() => setLang(l)}
          aria-pressed={l === lang}
        >
          {LOCALE_META[l].name}
        </button>
      ))}
    </div>
  );
}
