import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { setName as apiSetName } from '../api';
import type { Account } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Modal } from './Modal';

interface Props {
  account: Account;
  onAccountChange: (a: Account) => void;
  onPlay: (mode: 'quick' | 'online') => void;
  onShop: () => void;
}

export function MainMenu({ account, onAccountChange, onPlay, onShop }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(account.name);
  const [saving, setSaving] = useState(false);
  const [howto, setHowto] = useState(false);

  const saveName = async () => {
    const clean = name.trim();
    if (!clean || clean === account.name) return;
    setSaving(true);
    try {
      onAccountChange(await apiSetName(clean));
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="menu">
      <div className="menu-topbar">
        <div className="crystals-pill">
          💎 {account.crystals} <span className="muted">{t('menu.crystals')}</span>
        </div>
        <LanguageSwitcher compact />
      </div>

      <div className="menu-hero">
        <h1 className="title-glow">{t('app.title')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
      </div>

      <div className="name-row">
        <input
          className="text-input"
          value={name}
          maxLength={18}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('menu.namePlaceholder')}
        />
        <button className="btn ghost" onClick={saveName} disabled={saving}>
          {t('menu.save')}
        </button>
      </div>

      <div className="menu-cards">
        <button className="menu-card primary" onClick={() => onPlay('quick')}>
          <span className="card-emoji">🚀</span>
          <span className="card-title">{t('menu.play')}</span>
          <span className="card-desc">{t('menu.playDesc')}</span>
        </button>
        <button className="menu-card" onClick={() => onPlay('online')}>
          <span className="card-emoji">🌐</span>
          <span className="card-title">{t('menu.online')}</span>
          <span className="card-desc">{t('menu.onlineDesc')}</span>
        </button>
        <button className="menu-card" onClick={onShop}>
          <span className="card-emoji">💎</span>
          <span className="card-title">{t('menu.shop')}</span>
          <span className="card-desc">{t('menu.shopDesc')}</span>
        </button>
        <button className="menu-card" onClick={() => setHowto(true)}>
          <span className="card-emoji">📖</span>
          <span className="card-title">{t('menu.howto')}</span>
          <span className="card-desc">{t('menu.record', { wins: account.wins, games: account.games })}</span>
        </button>
      </div>

      {howto && (
        <Modal title={t('howto.title')} onClose={() => setHowto(false)}>
          <ol className="howto-list">
            <li>{t('howto.l1')}</li>
            <li>{t('howto.l2')}</li>
            <li>{t('howto.l3')}</li>
            <li>{t('howto.l4')}</li>
            <li>{t('howto.l5')}</li>
            <li>{t('howto.l6')}</li>
          </ol>
        </Modal>
      )}
    </div>
  );
}
