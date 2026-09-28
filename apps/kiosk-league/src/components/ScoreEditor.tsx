/** Set-by-set score entry with large steppers (no keyboard, §8.2): games per set, the
 * tie-break points at 7–6, a super tie-break for the third set, and "unfinished" (§6.8). */
import { clamp, emptySet, limit, needsTiebreak, type SetEntry } from "../lib/score";
import { useT } from "../kiosk";

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  const t = useT();
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__button" aria-label={`${label}: ${t("score.less")}`} onClick={() => onChange(clamp(value - 1, max))}>
        −
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button type="button" className="stepper__button" aria-label={`${label}: ${t("score.more")}`} onClick={() => onChange(clamp(value + 1, max))}>
        +
      </button>
    </div>
  );
}

export type ScoreState = { sets: SetEntry[]; unfinished: boolean };

export const initialScore = (): ScoreState => ({ sets: [emptySet(), emptySet()], unfinished: false });

export function ScoreEditor({
  value,
  onChange,
  allowUnfinished,
}: {
  value: ScoreState;
  onChange: (next: ScoreState) => void;
  allowUnfinished: boolean;
}) {
  const t = useT();
  const update = (index: number, change: Partial<SetEntry>) =>
    onChange({ ...value, sets: value.sets.map((s, i) => (i === index ? { ...s, ...change } : s)) });

  return (
    <div className="score-editor">
      {value.sets.map((set, index) => {
        const name = t("score.set", { number: index + 1 });
        return (
          <fieldset key={index} className="set">
            <legend>{name}</legend>
            <div className="set__row">
              <span className="set__team">A</span>
              <Stepper label={`${name} A`} value={set.a} max={limit(set)} onChange={(a) => update(index, { a })} />
              <span className="set__team">B</span>
              <Stepper label={`${name} B`} value={set.b} max={limit(set)} onChange={(b) => update(index, { b })} />
            </div>
            {index === 2 ? (
              <label className="check">
                <input
                  type="checkbox"
                  checked={set.superTiebreak}
                  onChange={(e) => update(index, { superTiebreak: e.target.checked, a: 0, b: 0 })}
                />
                <span>{t("score.superTiebreak")}</span>
              </label>
            ) : null}
            {needsTiebreak(set) ? (
              <div className="set__row">
                <span className="set__team">{t("score.tiebreak")}</span>
                <Stepper label={`${name} ${t("score.tiebreak")} A`} value={set.tbA} max={30} onChange={(tbA) => update(index, { tbA })} />
                <Stepper label={`${name} ${t("score.tiebreak")} B`} value={set.tbB} max={30} onChange={(tbB) => update(index, { tbB })} />
              </div>
            ) : null}
          </fieldset>
        );
      })}
      {value.sets.length < 3 ? (
        <button type="button" className="button" onClick={() => onChange({ ...value, sets: [...value.sets, emptySet()] })}>
          {t("score.addSet")}
        </button>
      ) : (
        <button type="button" className="button button--quiet" onClick={() => onChange({ ...value, sets: value.sets.slice(0, 2) })}>
          {t("score.removeSet")}
        </button>
      )}
      {allowUnfinished ? (
        <label className="check">
          <input type="checkbox" checked={value.unfinished} onChange={(e) => onChange({ ...value, unfinished: e.target.checked })} />
          <span>{t("score.unfinished")}</span>
        </label>
      ) : null}
    </div>
  );
}
