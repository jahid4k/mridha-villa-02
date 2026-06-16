"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import ChangePasswordForm from "./ChangePasswordForm";
import { Save, Database, Building2, Zap, KeyRound } from "lucide-react";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  hint?: string;
}

const SETTINGS_GROUPS: {
  title: string;
  icon: React.ReactNode;
  fields: SettingField[];
}[] = [
  {
    title: "Building",
    icon: <Building2 className="w-4 h-4 text-indigo-500" />,
    fields: [
      { key: "buildingName", label: "Building Name", type: "text" },
      { key: "buildingAddress", label: "Building Address", type: "text" },
      { key: "ownerName", label: "Owner's Name", type: "text" },
      { key: "ownerPhone", label: "Owner's Phone", type: "text" },
    ],
  },
  {
    title: "Rent",
    icon: <Database className="w-4 h-4 text-emerald-500" />,
    fields: [
      {
        key: "defaultRentDueDay",
        label: "Default Rent Due Day",
        type: "number",
        hint: "Day of month (1–28)",
      },
      {
        key: "lateFeePercentage",
        label: "Late Fee (%)",
        type: "number",
        hint: "Applied after due date",
      },
      { key: "currency", label: "Currency Symbol", type: "text" },
    ],
  },
  {
    title: "Electricity",
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
    fields: [
      {
        key: "defaultElectricityRate",
        label: "Default Rate per Unit (৳)",
        type: "number",
        hint: "BDT per kWh unit",
      },
    ],
  },
];

export default function SettingsClient({
  initialSettings,
  currentUser,
}: {
  initialSettings: Record<string, any>;
  currentUser: string;
}) {
  const [settings, setSettings] =
    useState<Record<string, any>>(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Setting saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveGroup = async (fields: SettingField[]) => {
    for (const field of fields) {
      await handleSave(field.key);
    }
    toast.success("All settings saved");
  };

  const handleSeed = async () => {
    if (
      !confirm(
        "This will seed the database with default users and units. Continue?",
      )
    )
      return;
    setSeedLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Seed complete: ${data.results?.length} items`);
    } catch (e: any) {
      toast.error(e.message || "Seed failed");
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {SETTINGS_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {group.icon}
              <CardTitle>{group.title} Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.fields.map((field) => (
                <div key={field.key}>
                  {field.type === "boolean" ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {field.label}
                        </p>
                        {field.hint && (
                          <p className="text-xs text-slate-500">{field.hint}</p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={!!settings[field.key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [field.key]: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                      />
                    </div>
                  ) : (
                    <Input
                      label={field.label}
                      type={field.type === "number" ? "number" : "text"}
                      hint={field.hint}
                      value={settings[field.key] ?? ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [field.key]:
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                loading={saving !== null}
                onClick={() => handleSaveGroup(group.fields)}
              >
                Save {group.title} Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Developer Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Seed the database with default users (jahid, jony) and units (7
              shops + 5 rooms). Safe to run multiple times — existing records
              are skipped.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSeed}
              loading={seedLoading}
            >
              Seed Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Logged in as:{" "}
            <span className="font-semibold capitalize">{currentUser}</span>
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-500" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm username={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
