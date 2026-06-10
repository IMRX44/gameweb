import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { buyCosmetic, buyCrystals, fetchShop, setLoadout } from '../api';
import type { Account, Cosmetic, CrystalBundle } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  account: Account;
  onAccountChange: (a: Account) => void;
  onBack: () => void;
}

const TYPE_ORDER: Cosmetic['type'][] = ['ship_skin', 'trail', 'planet_theme', 'nameplate', 'emote'];
const RARITY_CSS: Record<string, string> = {
  common: 'rar-common',
  rare: 'rar-rare',
  epic: 'rar-epic',
  legendary: 'rar-legendary',
};

export function Shop({ account, onAccountChange, onBack }: Props) {
  const { t } = useI18n();
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [bundles, setBundles] = useState<CrystalBundle[]>([]);
  const [tab, setTab] = useState<'cosmetics' | 'crystals'>('cosmetics');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchShop()
      .then((d) => {
        setCosmetics(d.cosmetics);
        setBundles(d.bundles);
      })
      .catch(() => setToast({ text: t('common.error'), bad: true }));
  }, [t]);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 2200);
  };

  const grouped = useMemo(() => {
    const map: Record<string, Cosmetic[]> = {};
    for (const c of cosmetics) (map[c.type] ||= []).push(c);
    return map;
  }, [cosmetics]);

  const isOwned = (id: string) => account.owned.includes(id);
  const isEquipped = (c: Cosmetic) => (account.loadout as Record<string, string>)[c.type] === c.id;

  const handleBuy = async (c: Cosmetic) => {
    if (account.crystals < c.price) {
      flash(t('shop.notEnough'), true);
      return;
    }
    setBusy(c.id);
    try {
      onAccountChange(await buyCosmetic(c.id));
      flash(t('shop.success'));
    } catch {
      flash(t('shop.notEnough'), true);
    } finally {
      setBusy(null);
    }
  };

  const handleEquip = async (c: Cosmetic) => {
    setBusy(c.id);
    try {
      onAccountChange(await setLoadout(c.type, c.id));
    } catch {
      flash(t('common.error'), true);
    } finally {
      setBusy(null);
    }
  };

  const handleBuyCrystals = async (b: CrystalBundle) => {
    setBusy(b.id);
    try {
      const updated = await buyCrystals(b.id);
      onAccountChange(updated);
      flash(t('shop.crystalsGranted', { n: b.crystals + b.bonus }));
    } catch {
      flash(t('common.error'), true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="shop">
      <div className="shop-head">
        <button className="btn ghost" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <h1>{t('shop.title')}</h1>
        <div className="shop-head-right">
          <div className="crystals-pill">💎 {account.crystals}</div>
          <LanguageSwitcher compact />
        </div>
      </div>

      <p className="fairness-note">⚖️ {t('shop.fairness')}</p>

      <div className="tabs">
        <button className={`tab ${tab === 'cosmetics' ? 'active' : ''}`} onClick={() => setTab('cosmetics')}>
          {t('shop.tab.cosmetics')}
        </button>
        <button className={`tab ${tab === 'crystals' ? 'active' : ''}`} onClick={() => setTab('crystals')}>
          {t('shop.tab.crystals')}
        </button>
      </div>

      {tab === 'cosmetics' && (
        <div className="shop-scroll">
          {TYPE_ORDER.map((type) =>
            grouped[type] ? (
              <section key={type} className="cosmetic-section">
                <h3>{t(`shop.type.${type}`)}</h3>
                <div className="cosmetic-grid">
                  {grouped[type].map((c) => {
                    const owned = isOwned(c.id);
                    const equipped = isEquipped(c);
                    return (
                      <div key={c.id} className={`cosmetic-card ${RARITY_CSS[c.rarity]}`}>
                        <div className="cosmetic-preview">{c.glyph || iconFor(c)}</div>
                        <div className="cosmetic-name">{c.name}</div>
                        <div className="cosmetic-rarity">{t(`shop.rarity.${c.rarity}`)}</div>
                        {equipped ? (
                          <button className="btn tiny equipped" disabled>
                            ✓ {t('shop.equipped')}
                          </button>
                        ) : owned ? (
                          <button
                            className="btn tiny"
                            disabled={busy === c.id}
                            onClick={() => handleEquip(c)}
                          >
                            {t('shop.equip')}
                          </button>
                        ) : (
                          <button
                            className="btn tiny buy"
                            disabled={busy === c.id}
                            onClick={() => handleBuy(c)}
                          >
                            💎 {c.price}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}

      {tab === 'crystals' && (
        <div className="shop-scroll">
          <div className="bundle-grid">
            {bundles.map((b) => (
              <div key={b.id} className="bundle-card">
                <div className="bundle-emoji">💎</div>
                <div className="bundle-amount">
                  {b.crystals}
                  {b.bonus > 0 && <span className="bundle-bonus"> {t('shop.bonus', { n: b.bonus })}</span>}
                </div>
                <div className="bundle-name">{b.name}</div>
                <button className="btn buy" disabled={busy === b.id} onClick={() => handleBuyCrystals(b)}>
                  {t('shop.buyCrystals')} ${(b.priceCents / 100).toFixed(2)}
                </button>
              </div>
            ))}
          </div>
          <p className="muted small center">
            {t('shop.fairness')}
          </p>
        </div>
      )}

      {toast && <div className={`toast ${toast.bad ? 'bad' : 'good'}`}>{toast.text}</div>}
    </div>
  );
}

function iconFor(c: Cosmetic): string {
  switch (c.type) {
    case 'ship_skin':
      return '🛸';
    case 'trail':
      return '☄️';
    case 'planet_theme':
      return '🪐';
    case 'nameplate':
      return '🏷️';
    default:
      return '✨';
  }
}
