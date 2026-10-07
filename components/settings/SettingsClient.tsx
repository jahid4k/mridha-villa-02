"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import ChangePasswordForm from "./ChangePasswordForm";
import { Save, Database, Building2, Zap, KeyRound } from "lucide-react";
import { useI18n } from "@/components/providers/LanguageProvider";
import { capitalize } from "@/lib/formatters";

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
  const { t } = useI18n();

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t("Setting saved"));
    } catch (e: any) {
      toast.error(e.message || t("Failed to save"));
    } finally {
      setSaving(null);
    }
  };

  const handleSaveGroup = async (fields: SettingField[]) => {
    for (const field of fields) {
      await handleSave(field.key);
    }
    toast.success(t("All settings saved"));
  };

  const handleSeed = async () => {
    if (
      !confirm(
        t("This will seed the database with default users and units. Continue?"),
      )
    )
      return;
    setSeedLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t("Seed complete: {count} items", { count: data.results?.length ?? 0 }));
    } catch (e: any) {
      toast.error(e.message || t("Seed failed"));
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
              <CardTitle>{t(`${group.title} settings`)}</CardTitle>
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
                          {t(field.label)}
                        </p>
                        {field.hint && (
                          <p className="text-xs text-slate-500">{t(field.hint)}</p>
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
                      label={t(field.label)}
                      type={field.type === "number" ? "number" : "text"}
                      hint={field.hint ? t(field.hint) : undefined}
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
                {t('Save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">{t('Developer Tools')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {t('Seed the database with default users (jahid, jony) and units (7 shops + 5 rooms). Safe to run multiple times — existing records are skipped.')}
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSeed}
              loading={seedLoading}
            >
              {t('Seed Database')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Session')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {t('Logged in as:')}{" "}
            <span className="font-semibold">{t(capitalize(currentUser))}</span>
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-500" />
            <CardTitle>{t('Change Password')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm username={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
