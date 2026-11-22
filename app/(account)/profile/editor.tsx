"use client";

import { useState } from "react";
import { saveProfile } from "../../../lib/profile/actions";
import { BIO_LIMIT, DISPLAY_NAME_LIMIT } from "../../../lib/profile/validation";
import { ActionForm } from "../form";

type EditableProfile = { display_name: string; bio: string | null; discoverable: boolean };

export function ProfileEditor({ profile }: { profile: EditableProfile | null }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [discoverable, setDiscoverable] = useState(profile?.discoverable ?? false);

  return (
    <ActionForm action={saveProfile} submit={profile ? "Save changes" : "Create profile"} pendingLabel="Saving profile…">
      <div className="account-field">
        <label htmlFor="display-name">Display name</label>
        <input id="display-name" name="display_name" value={displayName} onChange={(event) => setDisplayName(event.target.value)}
          aria-describedby="display-name-hint" autoComplete="nickname" required />
        <small id="display-name-hint">Use 1–{DISPLAY_NAME_LIMIT} characters. A nickname is fine.</small>
      </div>
      <div className="account-field">
        <label htmlFor="profile-bio">Bio (optional)</label>
        <textarea id="profile-bio" name="bio" rows={4} value={bio} onChange={(event) => setBio(event.target.value)}
          aria-describedby="bio-hint" />
        <small id="bio-hint">Up to {BIO_LIMIT} characters. Leave out booking references and contact details.</small>
      </div>
      <div className="privacy-choice">
        <label>
          <input type="checkbox" name="discoverable" checked={discoverable}
            onChange={(event) => setDiscoverable(event.target.checked)} aria-describedby="discoverable-hint" />
          Opt in to future discoverability
        </label>
        <p id="discoverable-hint">This saves a preference. Your profile stays private until flight verification and discovery are available.</p>
      </div>
    </ActionForm>
  );
}
