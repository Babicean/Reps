import { useRef } from "react";
import type { Entry, MenuItem } from "../types";
import {
  backupFilename,
  buildBackup,
  parseBackup,
  type MergeResult,
  type BackupPayload,
} from "../lib/backup";
import { shareBackupFile } from "../lib/exportFile";
import { loadSettings } from "../lib/settings";
import { useToast } from "../hooks/useToast";
import Toast from "./Toast";

interface Props {
  entries: Entry[];
  menu: MenuItem[];
  onImport: (backup: BackupPayload) => MergeResult;
}

/** Quiet backup controls at the foot of the History screen. */
export default function DataCard({ entries, menu, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();

  const notify = (message: string) =>
    showToast({ kind: "undo", message }, 2600);

  const exportBackup = async () => {
    const payload = buildBackup(entries, menu, loadSettings());
    try {
      await shareBackupFile(
        backupFilename(),
        JSON.stringify(payload, null, 2),
      );
      notify("Backup exported");
    } catch {
      // Share sheet dismissed — not an error worth reporting.
    }
  };

  const importFile = async (file: File) => {
    const backup = parseBackup(await file.text());
    if (!backup) {
      notify("That file isn’t a Reps backup");
      return;
    }
    const result = onImport(backup);
    if (result.addedEntries === 0 && result.addedItems === 0) {
      notify("Already up to date");
    } else {
      notify(
        `Restored ${result.addedEntries} ${
          result.addedEntries === 1 ? "entry" : "entries"
        } · ${result.addedItems} menu ${
          result.addedItems === 1 ? "item" : "items"
        }`,
      );
    }
  };

  return (
    <>
      <h2 className="section-label">Your data</h2>
      <div className="card data-card">
        <p className="data-sub">
          Everything stays on this device. Export a backup now and then,
          especially before switching phones.
        </p>
        <div className="data-actions">
          <button className="data-btn primary" onClick={exportBackup}>
            Export backup
          </button>
          <button
            className="data-btn"
            onClick={() => fileRef.current?.click()}
          >
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <Toast toast={toast} />
    </>
  );
}
