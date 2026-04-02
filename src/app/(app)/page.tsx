// src/app/(app)/page.tsx

// This is the root page of the application.
// It is wrapped by the AuthWrapper, which will handle redirecting
// unauthenticated users to the Framer landing page.
// Authenticated users will be redirected to the dashboard.

export default function RootPage() {
  // The AuthWrapper handles the logic, so this component can be minimal.
  // We can return null or a simple loading indicator, though it will likely never be seen.
  return null;
}
