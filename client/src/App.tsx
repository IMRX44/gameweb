import { useCallback, useEffect, useState } from 'react';
import { useI18n } from './i18n/I18nContext';
import { authGuest, fetchMe } from './api';
import { net } from './net';
import type { Account } from './types';
import { MainMenu } from './components/MainMenu';
import { Shop } from './components/Shop';
import { GameScreen } from './components/GameScreen';
import { LanguageSwitcher } from './components/LanguageSwitcher';

type View = { name: 'menu' } | { name: 'shop' } | { name: 'play'; mode: 'quick' | 'online' };

export default function App() {
  const { t } = useI18n();
  const [account, setAccount] = useState<Account | null>(null);
  const [view, setView] = useState<View>({ name: 'menu' });
  const [loading, setLoading] = useState(true);

  // Bootstrap: resume or create a guest account, then open the realtime socket.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let acc: Account;
        try {
          acc = await fetchMe();
        } catch {
          acc = await authGuest();
        }
        if (!cancelled) {
          setAccount(acc);
          net.connect();
        }
      } catch {
        // Could not reach the server; retry shortly.
        if (!cancelled) setTimeout(() => location.reload(), 2500);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      setAccount(await fetchMe());
    } catch {
      /* ignore */
    }
  }, []);

  if (loading || !account) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">🌌</div>
        <div className="boot-text">{t('common.loading')}</div>
        <LanguageSwitcher />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {view.name === 'menu' && (
        <MainMenu
          account={account}
          onAccountChange={setAccount}
          onPlay={(mode) => setView({ name: 'play', mode })}
          onShop={() => setView({ name: 'shop' })}
        />
      )}

      {view.name === 'shop' && (
        <Shop account={account} onAccountChange={setAccount} onBack={() => setView({ name: 'menu' })} />
      )}

      {view.name === 'play' && (
        <GameScreen
          mode={view.mode}
          onExit={() => {
            refreshAccount();
            setView({ name: 'menu' });
          }}
        />
      )}
    </div>
  );
}
