// Keep the admin area out of search engines.
export const metadata = {
  title: "Admin · Accounting Keys",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
