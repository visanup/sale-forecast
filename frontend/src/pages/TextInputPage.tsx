import { useState } from 'react';

export function TextInputPage() {
  const [text, setText] = useState('');
  return (
    <div className="max-w-3xl mx-auto card p-6 space-y-4">
      <h1 className="text-2xl font-bold">Free text input</h1>
      <textarea
        className="input h-48 resize-y"
        placeholder="Paste or type your content here..."
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />
      <div className="text-sm text-neutral-500">Characters: {text.length}</div>
      <div className="flex gap-3">
        <button className="btn-primary">Submit</button>
        <button className="px-4 py-2 rounded-lg border" onClick={()=>setText('')}>Clear</button>
      </div>
    </div>
  );
}


