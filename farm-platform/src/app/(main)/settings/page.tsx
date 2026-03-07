import SurveyImport from "@/components/settings/SurveyImport";

export default function SettingsPage() {
  return (
    <main className="flex-1 overflow-auto">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-8">Settings</h1>
        <SurveyImport />
      </div>
    </main>
  );
}
