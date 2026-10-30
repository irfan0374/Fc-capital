import "./admin.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="admin-ui">{children}</div>;
}
