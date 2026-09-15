import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Explore from "./pages/Explore";
import OrgProfile from "./pages/OrgProfile";
import PersonProfile from "./pages/PersonProfile";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nw-nav">
        <div className="nw-brand">
          <span className="nw-brand-mark">N</span>
          Networker
        </div>
        <div className="nw-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")} end>
            Explore
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => (isActive ? "active" : "")}>
            Search / Query
          </NavLink>
        </div>
      </nav>
      <main className="nw-main">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/person/:id" element={<PersonProfile />} />
          <Route path="/org/:id" element={<OrgProfile />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
