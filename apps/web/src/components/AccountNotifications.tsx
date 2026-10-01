"use client";

/**
 * `/cont/notificari` (§11, Stage 12): the push notifications on this phone or computer (Q17; the
 * browser asks for permission, the club's key comes from the server), and the kinds of messages
 * the client may turn off, by email and by push. Messages about the account, bookings and money
 * always arrive (the server refuses to turn them off).
 */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import * as member from "@/lib/member";
import { MemberOnly } from "./useMember";
import { useErrorText } from "./useErrorText";

const CATEGORIES = ["reminders", "classes", "league", "subscriptions", "money", "club"];
const CHANNELS = ["email", "push"];

type Push = "loading" | "unsupported" | "off-at-club" | "denied" | "on" | "off";

export function AccountNotifications() {
  return <MemberOnly>{() => <NotificationsPanel />}</MemberOnly>;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

function NotificationsPanel() {
  const t = useTranslations("web.account.notifications");
  const errorText = useErrorText();
  const [push, setPush] = useState<Push>("loading");
  const [key, setKey] = useState("");
  const [choices, setChoices] = useState<member.Choices | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [prefs, server, reg] = await Promise.all([member.notificationChoices(), member.pushKey(), registration()]);
      if (!alive) return;
      setChoices(prefs.ok ? prefs.data.choices : {});
      if (!reg) return setPush("unsupported");
      if (!server.ok || !server.data.enabled) return setPush("off-at-club");
      setKey(server.data.public_key);
      if (Notification.permission === "denied") return setPush("denied");
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const reg = await registration();
      if (!reg) return setPush("unsupported");
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: member.keyBytes(key) });
      const keys = subscription.toJSON().keys ?? {};
      const answer = await member.savePushSubscription({ endpoint: subscription.endpoint, p256dh: keys.p256dh ?? "", auth: keys.auth ?? "" });
      if (!answer.ok) {
        await subscription.unsubscribe();
        return setNotice({ text: errorText(answer.code, answer.params), error: true });
      }
      setPush("on");
      setNotice({ text: t("pushOn"), error: false });
    } catch {
      setPush(Notification.permission === "denied" ? "denied" : "off");
      setNotice({ text: t("pushFailed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    const subscription = await (await registration())?.pushManager.getSubscription();
    if (subscription) {
      await member.removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setBusy(false);
    setPush("off");
    setNotice({ text: t("pushOff"), error: false });
  };

  const toggle = async (category: string, channel: string, enabled: boolean) => {
    // The box changes at once; the server's answer confirms it or puts it back.
    const before = choices;
    setChoices((current) => (current ? { ...current, [category]: { ...current[category], [channel]: enabled } } : current));
    const answer = await member.saveNotificationChoices({ [category]: { [channel]: enabled } });
    if (!answer.ok) {
      setChoices(before);
      return setNotice({ text: errorText(answer.code, answer.params), error: true });
    }
    setChoices(answer.data.choices);
    setNotice({ text: t("saved"), error: false });
  };

  return (
    <div className="account">
      <section className="account__card" aria-labelledby="push-title">
        <h2 id="push-title" className="h3">
          {t("pushTitle")}
        </h2>
        <p className="league__text">{t(`push.${push}`)}</p>
        {push === "off" && (
          <p className="account__actions">
            <button type="button" className="btn btn-primary" disabled={busy || !key} onClick={() => void turnOn()}>
              {t("turnOn")}
            </button>
          </p>
        )}
        {push === "on" && (
          <p className="account__actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void turnOff()}>
              {t("turnOff")}
            </button>
          </p>
        )}
        <p className="events__note">{t("pushNote")}</p>
      </section>

      <section className="account__card" aria-labelledby="choices-title" aria-busy={choices === null}>
        <h2 id="choices-title" className="h3">
          {t("choicesTitle")}
        </h2>
        <p className="league__text">{t("choicesLead")}</p>
        {choices && (
          <table className="notify-table">
            <thead>
              <tr>
                <th scope="col">{t("kind")}</th>
                {CHANNELS.map((channel) => (
                  <th key={channel} scope="col">
                    {t(`channels.${channel}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.filter((category) => choices[category]).map((category) => (
                <tr key={category}>
                  <th scope="row">
                    {t(`categories.${category}.title`)}
                    <span>{t(`categories.${category}.text`)}</span>
                  </th>
                  {CHANNELS.map((channel) => {
                    const value = choices[category]?.[channel];
                    return (
                      <td key={channel}>
                        {value === undefined ? (
                          <span aria-label={t("notSent")}>–</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={value}
                            aria-label={t("toggle", { kind: t(`categories.${category}.title`), channel: t(`channels.${channel}`) })}
                            onChange={(e) => void toggle(category, channel, e.target.checked)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="events__note">{t("always")}</p>
        {notice && (
          <p className="status" data-kind={notice.error ? "error" : undefined} role={notice.error ? "alert" : "status"}>
            {notice.text}
          </p>
        )}
      </section>
    </div>
  );
}
