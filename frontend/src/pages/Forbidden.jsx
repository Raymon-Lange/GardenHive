import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-garden-50 flex flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl mb-4">🔒</span>
      <h1 className="text-3xl font-bold text-garden-900 mb-2">403</h1>
      <p className="text-garden-600 text-sm max-w-sm mb-6">
        You don&apos;t have permission to view this page.
      </p>
      <Link to="/dashboard" className="text-sm text-garden-600 hover:text-garden-900 underline">
        Go to Dashboard
      </Link>
    </div>
  );
}
