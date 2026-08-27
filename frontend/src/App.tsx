import { Outlet, Link } from "react-router-dom";

export default function App() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" className="wordmark">
          ORBIIS
        </Link>
        <span className="top-bar-tag">research contribution intelligence</span>
      </header>
      <Outlet />
    </div>
  );
}
