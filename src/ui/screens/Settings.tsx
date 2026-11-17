// Settings screen with every GameSettings option and the Debug section (SPEC §10.1). Every control
// writes through updateSettings, which saves to omi.settings.v1 straight away.
import { useId, useState, type ReactNode } from 'react';
import type { MessageKey } from '../../content/i18n/t';
import { makeCard, SUITS } from '../../engine/cards';
import {
  DEFAULT_GAME_SETTINGS,
  type BotDifficulty,
  type GameSettings,
  type Seat,
  type Speed,
} from '../../engine/types';
import { gameStore } from '../../store/gameStore';
import { clampSetting, SETTING_BOUNDS, type NumericSetting } from '../../store/mergeSettings';
import { useNavStore } from '../../store/navStore';
import { parseSeed, resetAllSavedData } from '../../store/resetAll';
import { loadSavedGame } from '../../store/savedGame';
import { useSettingsStore } from '../../store/settingsStore';
import { BackIcon } from '../components/BackIcon';
import { Card } from '../components/Card';
import { LanguageToggle } from '../components/LanguageToggle';
import '../styles/game.css';
import '../styles/lesson.css';
import '../styles/settings.css';
import { useT } from '../useT';

type Option<T extends string> = { value: T; label: MessageKey };

const DIFFICULTIES: readonly Option<BotDifficulty>[] = [
  { value: 'easy', label: 'difficulty.easy' },
  { value: 'medium', label: 'difficulty.medium' },
  { value: 'hard', label: 'difficulty.hard' },
];

const SPEEDS: readonly Option<Speed>[] = [
  { value: 'slow', label: 'settings.speedSlow' },
  { value: 'normal', label: 'settings.speedNormal' },
  { value: 'fast', label: 'settings.speedFast' },
];

const RULE_STEPPERS: readonly { key: NumericSetting; label: MessageKey }[] = [
  { key: 'targetScore', label: 'settings.targetScore' },
  { key: 'trumpTeamWinPoints', label: 'settings.trumpTeamWinPoints' },
  { key: 'defenderWinPoints', label: 'settings.defenderWinPoints' },
  { key: 'kapothiPoints', label: 'settings.kapothiPoints' },
  { key: 'tieBonus', label: 'settings.tieBonus' },
];

const PRACTICE_AIDS: readonly { key: keyof GameSettings['practice']; label: MessageKey }[] = [
  { key: 'highlightLegal', label: 'settings.highlightLegal' },
  { key: 'autoFeedback', label: 'settings.autoFeedback' },
  { key: 'allowUndo', label: 'settings.allowUndo' },
];

/** Bot seats in screen order: partner (top), right, left (CLAUDE.md seat model). */
const NAME_FIELDS: readonly { seat: Exclude<Seat, 0>; label: MessageKey }[] = [
  { seat: 2, label: 'settings.namePartner' },
  { seat: 1, label: 'settings.nameRight' },
  { seat: 3, label: 'settings.nameLeft' },
];

const PREVIEW_CARDS = SUITS.map((suit) => makeCard('A', suit));
const NAME_MAX_LENGTH = 16;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settings__section" aria-labelledby={id}>
      <h2 id={id} className="settings__heading">
        {title}
      </h2>
      <div className="settings__group">{children}</div>
    </section>
  );
}

function Switch(props: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="settings__row">
      <div className="settings__label">
        <span id={`${id}-l`}>{props.label}</span>
        {props.description && (
          <span id={`${id}-d`} className="settings__desc">
            {props.description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className="toggle-switch"
        aria-checked={props.checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={props.description ? `${id}-d` : undefined}
        onClick={() => props.onChange(!props.checked)}
      >
        <span className="toggle-switch__thumb" />
      </button>
    </div>
  );
}

function Segmented<T extends string>(props: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useT();
  const id = useId();
  return (
    <div className="settings__row settings__row--stack">
      <span id={id} className="settings__label">
        {props.label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === props.value}
            className="segmented__option"
            onClick={() => props.onChange(option.value)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper(props: { label: string; setting: NumericSetting; value: number }) {
  const t = useT();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const id = useId();
  const { min, max } = SETTING_BOUNDS[props.setting];
  const set = (value: number) =>
    updateSettings({ [props.setting]: clampSetting(props.setting, value) });
  return (
    <div className="settings__row">
      <span id={id} className="settings__label">
        {props.label}
      </span>
      <div className="stepper" role="group" aria-labelledby={id}>
        <button
          type="button"
          className="stepper__btn"
          aria-label={t('settings.decrease', { name: props.label })}
          disabled={props.value <= min}
          onClick={() => set(props.value - 1)}
        >
          −
        </button>
        <output className="stepper__value" aria-live="polite">
          {props.value}
        </output>
        <button
          type="button"
          className="stepper__btn"
          aria-label={t('settings.increase', { name: props.label })}
          disabled={props.value >= max}
          onClick={() => set(props.value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function DebugSection() {
  const t = useT();
  const seedId = useId();
  const [seedText, setSeedText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  // Read once per render: the Settings screen is only shown when no game is open.
  const saved = loadSavedGame();
  const seed = parseSeed(seedText);

  return (
    <Section title={t('settings.sectionDebug')}>
      <p className="settings__row settings__debug-info">
        {saved
          ? t('settings.debugSeed', { seed: saved.seed, round: saved.state.round.number })
          : t('settings.debugNoGame')}
      </p>
      <form
        className="settings__row settings__row--stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (seed !== null) gameStore.getState().newGame({ seed, mode: 'real' });
        }}
      >
        <label htmlFor={seedId} className="settings__label">
          {t('settings.seedInput')}
        </label>
        <div className="settings__inline">
          <input
            id={seedId}
            className="settings__input"
            inputMode="numeric"
            autoComplete="off"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
          />
          <button type="submit" className="settings__button" disabled={seed === null}>
            {t('settings.startWithSeed')}
          </button>
        </div>
      </form>
      <div className="settings__row settings__row--stack">
        {confirming ? (
          <div
            role="alertdialog"
            aria-labelledby="settings-reset-text"
            className="settings__confirm"
          >
            <p id="settings-reset-text" className="settings__desc settings__desc--strong">
              {t('settings.resetConfirm')}
            </p>
            <div className="settings__inline">
              <button
                type="button"
                className="settings__button"
                onClick={() => setConfirming(false)}
              >
                {t('settings.resetNo')}
              </button>
              <button
                type="button"
                className="settings__button settings__button--danger"
                onClick={() => {
                  resetAllSavedData();
                  setConfirming(false);
                  setResetDone(true);
                }}
              >
                {t('settings.resetYes')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="settings__button settings__button--danger"
            onClick={() => {
              setResetDone(false);
              setConfirming(true);
            }}
          >
            {t('settings.resetAll')}
          </button>
        )}
        {resetDone && (
          <p className="settings__desc" role="status">
            {t('settings.resetDone')}
          </p>
        )}
      </div>
    </Section>
  );
}

export function Settings() {
  const t = useT();
  const go = useNavStore((s) => s.go);
  const settings = useSettingsStore();
  const { updateSettings } = settings;

  const setBotName = (seat: Exclude<Seat, 0>, name: string) => {
    const botNames = [...settings.botNames] as GameSettings['botNames'];
    botNames[seat] = name;
    updateSettings({ botNames });
  };

  return (
    <main className="settings">
      <header className="page-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('settings.back')}
          title={t('settings.back')}
          onClick={() => go({ name: 'home' })}
        >
          <BackIcon />
        </button>
        <h1 className="page-bar__title">{t('settings.title')}</h1>
        <LanguageToggle />
      </header>

      <Section title={t('settings.sectionPlay')}>
        <Segmented
          label={t('settings.difficulty')}
          options={DIFFICULTIES}
          value={settings.botDifficulty}
          onChange={(botDifficulty) => updateSettings({ botDifficulty })}
        />
        <Segmented
          label={t('settings.speed')}
          options={SPEEDS}
          value={settings.speed}
          onChange={(speed) => updateSettings({ speed })}
        />
        <Switch
          label={t('settings.oneTapPlay')}
          description={t('settings.oneTapPlayDesc')}
          checked={settings.oneTapPlay}
          onChange={(oneTapPlay) => updateSettings({ oneTapPlay })}
        />
        <Switch
          label={t('settings.fourColorDeck')}
          description={t('settings.fourColorDeckDesc')}
          checked={settings.fourColorDeck}
          onChange={(fourColorDeck) => updateSettings({ fourColorDeck })}
        />
        <div className="settings__preview" role="group" aria-label={t('settings.preview')}>
          {PREVIEW_CARDS.map((card) => (
            <Card key={card.id} card={card} className="settings__preview-card" />
          ))}
        </div>
      </Section>

      <Section title={t('settings.sectionRules')}>
        <p className="settings__row settings__note">{t('settings.rulesNote')}</p>
        {RULE_STEPPERS.map(({ key, label }) => (
          <Stepper key={key} label={t(label)} setting={key} value={settings[key]} />
        ))}
        <Switch
          label={t('settings.stackTieBonus')}
          description={t('settings.stackTieBonusDesc')}
          checked={settings.stackTieBonus}
          onChange={(stackTieBonus) => updateSettings({ stackTieBonus })}
        />
        <div className="settings__row">
          <button
            type="button"
            className="settings__button"
            onClick={() => {
              const d = DEFAULT_GAME_SETTINGS;
              updateSettings({
                targetScore: d.targetScore,
                trumpTeamWinPoints: d.trumpTeamWinPoints,
                defenderWinPoints: d.defenderWinPoints,
                kapothiPoints: d.kapothiPoints,
                tieBonus: d.tieBonus,
                stackTieBonus: d.stackTieBonus,
              });
            }}
          >
            {t('settings.restoreRules')}
          </button>
        </div>
      </Section>

      <Section title={t('settings.sectionPractice')}>
        {PRACTICE_AIDS.map(({ key, label }) => (
          <Switch
            key={key}
            label={t(label)}
            checked={settings.practice[key]}
            onChange={(on) => updateSettings({ practice: { ...settings.practice, [key]: on } })}
          />
        ))}
      </Section>

      <Section title={t('settings.sectionNames')}>
        {NAME_FIELDS.map(({ seat, label }) => (
          <label key={seat} className="settings__row settings__row--stack">
            <span className="settings__label">{t(label)}</span>
            <input
              className="settings__input"
              value={settings.botNames[seat]}
              placeholder={DEFAULT_GAME_SETTINGS.botNames[seat]}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="off"
              onChange={(e) => setBotName(seat, e.target.value)}
            />
          </label>
        ))}
      </Section>

      <Section title={t('settings.sectionLessons')}>
        <Switch
          label={t('settings.unlockAllLessons')}
          checked={settings.unlockAllLessons}
          onChange={(unlockAllLessons) => updateSettings({ unlockAllLessons })}
        />
      </Section>

      <DebugSection />
    </main>
  );
}
