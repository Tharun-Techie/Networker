import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Explore from "./pages/Explore";
import OrgProfile from "./pages/OrgProfile";
import PersonProfile from "./pages/PersonProfile";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Explore</Link>
        <Link to="/search">Search/Query</Link>
      </nav>
      <h1>Networker</h1>
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/person/:id" element={<PersonProfile />} />
        <Route path="/org/:id" element={<OrgProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
