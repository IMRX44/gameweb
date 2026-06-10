import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { colorForSlot, hexCss } from '../config';

export interface Standing {
  slot: number;
  name: string;
  isBot: boolean;
  planets: number;
  ships: number;
}

interface Props {
  standings: Standing[];
  mine: { planets: number; ships: number };
  selected: { id: number; ships: number; ownerSlot: number } | null;
  ratio: number;
  setRatio: (r: number) => void;
  youSlot: number;
  alliedSlots: number[];
  chat: { from: string; slot: number; text: string }[];
  onAlly: (slot: number, allied: boolean) => void;
  onChat: (text: string) => void;
  onLeave: () => void;
  connected: boolean;
}

const RATIOS = [0.25, 0.5, 0.75, 1];

export function HUD(props: Props) {
  const { t } = useI18n();
  const { standings, mine, selected, ratio, setRatio, youSlot, alliedSlots } = props;
  const [panel, setPanel] = useState<'none' | 'allies' | 'chat'>('none');
  const [draft, setDraft] = useState('');

  const others = standings.filter((s) => s.slot !== youSlot);
  const selectingMine = selected && selected.ownerSlot === youSlot;

  const submitChat = () => {
    const text = draft.trim();
    if (!text) return;
    props.onChat(text);
    setDraft('');
  };

  return (
    <>
      {/* Top scoreboard */}
      <div className="hud-top">
        <div className={`conn-dot ${props.connected ? 'on' : 'off'}`} title={props.connected ? 'online' : 'offline'} />
        <div className="scoreboard">
          {standings.slice(0, 6).map((s) => (
            <div
              key={s.slot}
              className={`score-chip ${s.slot === youSlot ? 'me' : ''} ${s.planets === 0 ? 'dead' : ''}`}
            >
              <span className="dot" style={{ background: hexCss(colorForSlot(s.slot)) }} />
              <span className="score-name">
                {s.name}
                {s.isBot ? ' 🤖' : ''}
              </span>
              <span className="score-num">{s.planets}</span>
            </div>
          ))}
        </div>
        <button className="icon-btn leave" onClick={props.onLeave} title={t('hud.surrender')}>
          ⏻
        </button>
      </div>

      {/* My totals */}
      <div className="hud-mine">
        <span>🪐 {mine.planets}</span>
        <span>🚀 {mine.ships}</span>
      </div>

      {/* Side panels */}
      {panel === 'allies' && (
        <div className="hud-panel">
          <div className="panel-head">{t('hud.alliances')}</div>
          <div className="panel-body">
            {others.length === 0 && <div className="muted small">—</div>}
            {others.map((s) => {
              const allied = alliedSlots.includes(s.slot);
              return (
                <div key={s.slot} className="ally-row">
                  <span className="dot" style={{ background: hexCss(colorForSlot(s.slot)) }} />
                  <span className="ally-name">
                    {s.name}
                    {s.isBot ? ' 🤖' : ''}
                  </span>
                  <button
                    className={`btn tiny ${allied ? 'danger' : ''}`}
                    onClick={() => props.onAlly(s.slot, allied)}
                  >
                    {allied ? t('hud.unally') : t('hud.ally')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {panel === 'chat' && (
        <div className="hud-panel">
          <div className="panel-head">{t('hud.chat')}</div>
          <div className="panel-body chat-log">
            {props.chat.map((c, i) => (
              <div key={i} className="chat-msg">
                <span className="dot" style={{ background: hexCss(colorForSlot(c.slot)) }} />
                <b>{c.from}:</b> {c.text}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="text-input"
              value={draft}
              maxLength={160}
              placeholder={t('hud.chatPlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitChat()}
            />
            <button className="btn tiny" onClick={submitChat}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="hud-bottom">
        <div className="selected-info">
          {selectingMine ? t('hud.selected', { n: selected!.ships }) : t('hud.selectSource')}
        </div>
        <div className="ratio-row">
          <span className="ratio-label">{t('hud.fleetSize')}</span>
          {RATIOS.map((r) => (
            <button
              key={r}
              className={`ratio-btn ${ratio === r ? 'active' : ''}`}
              onClick={() => setRatio(r)}
            >
              {Math.round(r * 100)}%
            </button>
          ))}
        </div>
        <div className="hud-actions">
          <button
            className={`btn tiny ${panel === 'allies' ? 'active' : ''}`}
            onClick={() => setPanel(panel === 'allies' ? 'none' : 'allies')}
          >
            🤝
          </button>
          <button
            className={`btn tiny ${panel === 'chat' ? 'active' : ''}`}
            onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')}
          >
            💬
          </button>
        </div>
      </div>
    </>
  );
}
