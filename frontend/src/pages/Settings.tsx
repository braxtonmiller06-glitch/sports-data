import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import { Container } from "../components/Container";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import { Segmented } from "../components/Segmented";
import { SettingGroup, SettingRow, NumberInput, Select } from "../components/SettingRow";
import { useTheme, type Theme } from "../context/ThemeContext";
import {
  useSettings,
  bankrollMath,
  formatMoney,
  type Currency,
  type OddsFormat,
  type Timeframe,
  type UnitMode,
} from "../hooks/useSettings";
import { useProfile } from "../hooks/useProfile";

type Pane = "appearance" | "bankroll" | "defaults";

const PANES: { id: Pane; label: string; icon: string }[] = [
  { id: "appearance", label: "Appearance", icon: "M12 3.5v17M12 3.5a8.5 8.5 0 000 17" },
  { id: "bankroll", label: "Bankroll", icon: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5" },
  { id: "defaults", label: "Defaults", icon: "M4 6h16M4 12h16M4 18h10" },
];

const SUN =
  "M12 8a4 4 0 100 8 4 4 0 000-8M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8";
const MOON = "M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z";

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function Settings() {
  const [pane, setPane] = useState<Pane>("appearance");
  const { theme, setTheme } = useTheme();
  const { settings, update, save, loading, loaded, saving, error, savedAt } = useSettings();
  const { profile } = useProfile();

  // The theme applies the moment it's clicked (via ThemeContext + localStorage);
  // the saved row is what carries it to another device. Adopt the row's value
  // only once a real row has loaded -- gating on `loading` alone would let the
  // DEFAULT_SETTINGS placeholder ("system") clobber a locally stored choice for
  // signed-out users and anyone whose row hasn't been created yet.
  const adopted = useRef(false);
  useEffect(() => {
    if (!loaded || adopted.current) return;
    adopted.current = true;
    if (settings.theme !== theme) setTheme(settings.theme);
  }, [loaded, settings.theme, theme, setTheme]);

  function onThemeChange(next: Theme) {
    setTheme(next);
    update("theme", next);
  }

  const math = bankrollMath(settings);
  const cur = settings.currency;
  const stanceColor =
    math.stance === "conservative"
      ? "text-edge-400"
      : math.stance === "aggressive"
        ? "text-warn-500"
        : "text-danger-500";

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <Container className="py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-50">Settings</h1>
          <p className="mt-2 text-sm text-ink-300">
            Saved to your account, not this browser &mdash; they follow you to your phone.
          </p>
        </header>

        {error ? (
          <div className="mb-6 rounded-lg border border-danger-500/40 bg-danger-500/10 px-4 py-3 text-sm text-ink-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPane(p.id)}
                aria-current={pane === p.id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm
                  transition-colors duration-150
                  ${
                    pane === p.id
                      ? "bg-edge-500/10 font-medium text-edge-400"
                      : "text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                  }`}
              >
                <Icon d={p.icon} />
                {p.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 space-y-5">
            {pane === "appearance" ? (
              <>
                <SettingGroup title="Theme">
                  <SettingRow
                    title="Colour mode"
                    description="System follows your device and switches automatically at sunset."
                  >
                    <Segmented<Theme>
                      label="Colour mode"
                      value={theme}
                      onChange={onThemeChange}
                      options={[
                        { value: "light", label: "Light", icon: <Icon d={SUN} className="h-3.5 w-3.5" /> },
                        { value: "dark", label: "Dark", icon: <Icon d={MOON} className="h-3.5 w-3.5" /> },
                        { value: "system", label: "System" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Reduce motion"
                    description="Turns off chart animations and panel transitions."
                  >
                    <Toggle
                      label="Reduce motion"
                      checked={settings.reduce_motion}
                      onChange={(v) => update("reduce_motion", v)}
                    />
                  </SettingRow>
                </SettingGroup>

                <SettingGroup title="Odds display">
                  <SettingRow
                    title="Odds format"
                    description="Affects every price in the app, including the parlay builder."
                  >
                    <Segmented<OddsFormat>
                      label="Odds format"
                      value={settings.odds_format}
                      onChange={(v) => update("odds_format", v)}
                      options={[
                        { value: "american", label: "American" },
                        { value: "decimal", label: "Decimal" },
                        { value: "fractional", label: "Fractional" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Show implied probability"
                    description="Prints the de-vigged percentage next to every price."
                  >
                    <Toggle
                      label="Show implied probability"
                      checked={settings.show_implied}
                      onChange={(v) => update("show_implied", v)}
                    />
                  </SettingRow>
                </SettingGroup>
              </>
            ) : null}

            {pane === "bankroll" ? (
              <>
                <SettingGroup title="Your bankroll">
                  <SettingRow
                    title="Starting bankroll"
                    description="Saved to your account, so the unit calculator stops asking every session."
                    htmlFor="bankroll"
                  >
                    <NumberInput
                      id="bankroll"
                      value={settings.bankroll}
                      onChange={(v) => update("bankroll", v === "" ? 0 : v)}
                      min={0}
                      step={10}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Unit size"
                    description="A unit is one standard bet. One percent is the common conservative setting."
                    htmlFor="unit"
                  >
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <NumberInput
                        id="unit"
                        value={settings.unit_value}
                        onChange={(v) => update("unit_value", v === "" ? 0.25 : v)}
                        min={0.25}
                        max={settings.unit_mode === "percent" ? 25 : undefined}
                        step={settings.unit_mode === "percent" ? 0.25 : 5}
                        width="w-20"
                      />
                      <Segmented<UnitMode>
                        label="Unit mode"
                        value={settings.unit_mode}
                        onChange={(v) => {
                          update("unit_mode", v);
                          // The two modes are different orders of magnitude; carrying
                          // "1" from percent to flat would mean $1 bets.
                          update("unit_value", v === "percent" ? 1 : 10);
                        }}
                        options={[
                          { value: "percent", label: "% of roll" },
                          { value: "flat", label: `Flat ${formatMoney(0, cur).charAt(0)}` },
                        ]}
                      />
                    </div>
                  </SettingRow>

                  <SettingRow
                    title="Max bet cap"
                    description="Hard ceiling on any single wager, in units. Nothing will be suggested above it."
                    htmlFor="cap"
                  >
                    <NumberInput
                      id="cap"
                      value={settings.max_bet_units}
                      onChange={(v) => update("max_bet_units", v === "" ? 1 : v)}
                      min={1}
                      max={25}
                      step={0.5}
                      suffix="units"
                      width="w-20"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Currency"
                    description="Display only — Atlas never holds funds."
                    htmlFor="currency"
                  >
                    <Select<Currency>
                      id="currency"
                      value={settings.currency}
                      onChange={(v) => update("currency", v)}
                      options={[
                        { value: "USD", label: "USD ($)" },
                        { value: "GBP", label: "GBP (£)" },
                        { value: "EUR", label: "EUR (€)" },
                        { value: "CAD", label: "CAD (C$)" },
                        { value: "AUD", label: "AUD (A$)" },
                      ]}
                    />
                  </SettingRow>
                </SettingGroup>

                <section className="rounded-xl border border-edge-500/30 bg-edge-500/[0.06] p-5">
                  <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-edge-400">
                    What this means
                  </h3>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ["1 unit", formatMoney(math.unit, cur)],
                      ["Max bet", `${formatMoney(math.maxBet, cur)}`],
                      ["Bankroll", formatMoney(settings.bankroll, cur)],
                      ["Bets to ruin", math.betsToRuin > 0 ? `${math.betsToRuin} straight` : "—"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] uppercase tracking-[0.13em] text-ink-400">{k}</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums text-ink-50">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 border-t border-edge-500/25 pt-3 text-[13px] leading-relaxed text-ink-300">
                    At <b className="text-ink-50">{formatMoney(math.unit, cur)}</b> a unit you can
                    lose <b className="text-ink-50">{math.betsToRuin}</b> bets in a row before the
                    roll is gone. That is a <b className={stanceColor}>{math.stance}</b> stake for a{" "}
                    {formatMoney(settings.bankroll, cur)} bankroll — even a sharp bettor loses about
                    45% of the time, and losing runs of eight are routine.
                  </p>
                </section>

                <SettingGroup title="Tracking">
                  <SettingRow
                    title="Auto-track plays I copy"
                    description="Anything sent to your book gets logged and graded when the game settles."
                  >
                    <Toggle
                      label="Auto-track plays I copy"
                      checked={settings.auto_track}
                      onChange={(v) => update("auto_track", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Roll the bankroll forward"
                    description="Unit size recalculates off your current balance instead of the starting figure."
                  >
                    <Toggle
                      label="Roll the bankroll forward"
                      checked={settings.compound_bankroll}
                      onChange={(v) => update("compound_bankroll", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    title="Weekly loss limit"
                    description="Stake suggestions stop for the week once you hit it. You can still browse everything."
                    htmlFor="limit"
                  >
                    <NumberInput
                      id="limit"
                      value={settings.weekly_loss_limit_units ?? ""}
                      onChange={(v) => update("weekly_loss_limit_units", v === "" ? null : v)}
                      min={0}
                      step={1}
                      suffix="units"
                      width="w-20"
                    />
                  </SettingRow>
                </SettingGroup>

                <p className="text-[13px] leading-relaxed text-ink-400">
                  A weekly loss limit is the most useful setting on this page. It is also the one
                  nobody sets until they wish they had.
                </p>
              </>
            ) : null}

            {pane === "defaults" ? (
              <SettingGroup title="Defaults">
                <SettingRow
                  title="Landing sport"
                  description="Which board opens when you sign in."
                  htmlFor="sport"
                >
                  <Select<string>
                    id="sport"
                    value={settings.default_sport ?? ""}
                    onChange={(v) => update("default_sport", v === "" ? null : v)}
                    options={[
                      { value: "", label: "Whatever's in season" },
                      { value: "WNBA", label: "WNBA" },
                      { value: "NBA", label: "NBA" },
                      { value: "NFL", label: "NFL" },
                      { value: "MLB", label: "MLB" },
                      { value: "MLS", label: "MLS" },
                    ]}
                  />
                </SettingRow>
                <SettingRow
                  title="Default timeframe"
                  description="Applied to every player card and game log."
                  htmlFor="timeframe"
                >
                  <Select<Timeframe>
                    id="timeframe"
                    value={settings.default_timeframe}
                    onChange={(v) => update("default_timeframe", v)}
                    options={[
                      { value: "last5", label: "Last 5" },
                      { value: "last10", label: "Last 10" },
                      { value: "last20", label: "Last 20" },
                      { value: "season", label: "Season" },
                    ]}
                  />
                </SettingRow>
                <SettingRow
                  title="Hide thin samples"
                  description="Filter combinations under 8 games are collapsed rather than shown greyed out."
                >
                  <Toggle
                    label="Hide thin samples"
                    checked={settings.hide_thin_samples}
                    onChange={(v) => update("hide_thin_samples", v)}
                  />
                </SettingRow>
              </SettingGroup>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Button onClick={() => void save()} disabled={saving || loading}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {savedAt ? (
                <span className="text-[13px] font-medium text-edge-400">
                  Saved to your account
                </span>
              ) : null}
              {profile ? (
                <span className="ml-auto text-[13px] text-ink-400">
                  Signed in as {profile.email}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
