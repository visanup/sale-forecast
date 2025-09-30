export function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto card p-6 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-4">
        <div>
          <label className="text-sm">Theme</label>
          <select className="input mt-1">
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Language</label>
          <select className="input mt-1">
            <option>English</option>
            <option>ไทย (Thai)</option>
          </select>
        </div>
        <div>
          <label className="text-sm">API Base URL (Data)</label>
          <input className="input mt-1" defaultValue={import.meta.env.VITE_DATA_URL || ''} />
        </div>
      </div>
      <button className="btn-primary w-fit">Save settings</button>
    </div>
  );
}


