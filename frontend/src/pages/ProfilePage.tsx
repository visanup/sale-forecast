export function ProfilePage() {
  // Placeholder for when user profile endpoint is added; edit fields available
  return (
    <div className="max-w-2xl mx-auto card p-6 space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">First name</label>
          <input className="input mt-1" defaultValue="Demo" />
        </div>
        <div>
          <label className="text-sm">Last name</label>
          <input className="input mt-1" defaultValue="User" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm">Email</label>
          <input className="input mt-1" defaultValue="demo@example.com" />
        </div>
      </div>
      <button className="btn-primary w-fit">Save changes</button>
    </div>
  );
}


