import { useI18n } from '../i18n/I18nContext';
import { colorForSlot, hexCss } from '../config';
import type { GameResults } from '../types';

interface Props {
  results: GameResults;
  youId: string;
  onMenu: () => void;
}

export function GameOver({ results, youId, onMenu }: Props) {
  const { t } = useI18n();
  const won = results.winner === youId;
  const winner = results.players.find((p) => p.id === results.winner);
  const sorted = [...results.players].sort(
    (a, b) => b.planets - a.planets || b.stats.captured - a.stats.captured,
  );

  return (
    <div className="over-overlay">
      <div className="over-card">
        <h1 className={won ? 'victory' : 'defeat'}>
          {won ? t('over.victory') : winner ? t('over.defeat') : t('over.draw')}
        </h1>
        {winner && <p className="over-winner">{t('over.winner', { name: winner.name })}</p>}

        <div className="standings-table">
          <div className="standings-row head">
            <span></span>
            <span>{t('over.standings')}</span>
            <span>🪐</span>
            <span>{t('over.captured')}</span>
            <span>{t('over.sent')}</span>
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} className={`standings-row ${p.id === youId ? 'me' : ''}`}>
              <span className="rank">{i + 1}</span>
              <span className="sname">
                <span className="dot" style={{ background: hexCss(colorForSlot(p.slot)) }} />
                {p.name}
                {p.isBot ? ' 🤖' : ''}
              </span>
              <span>{p.planets}</span>
              <span>{p.stats.captured}</span>
              <span>{p.stats.sent}</span>
            </div>
          ))}
        </div>

        <div className="over-actions">
          <button className="btn primary" onClick={onMenu}>
            {t('over.menu')}
          </button>
        </div>
      </div>
    </div>
  );
}
