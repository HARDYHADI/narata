"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { upsertPreferences, type UserPreference } from "@/lib/taste/queries";

export default function PreferenceToggle({
  label,
  prefKey,
  initialOn,
}: {
  label: string;
  prefKey: keyof UserPreference;
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;

    const next = !on;
    setOn(next); // optimistic
    setSaving(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setOn(!next);
      setSaving(false);
      return;
    }

    const result = await upsertPreferences(supabase, { [prefKey]: next } as Partial<UserPreference>);
    setSaving(false);

    if (!result.success) {
      setOn(!next); // revert on failure
    }
  }

  return (
    <div className="toggle-row">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={label}
        className={`toggle${on ? "" : " off"}`}
        style={{ cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <i />
      </div>
      <span>{label}</span>
    </div>
  );
}
