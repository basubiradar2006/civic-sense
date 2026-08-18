import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Citizen from "./pages/Citizen";
import Officer from "./pages/Officer";
import Contractor from "./pages/Contractor";
import Complaint from "./pages/Complaint";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Login />} />

                <Route path="/register" element={<Register />} />

                <Route path="/citizen" element={<Citizen />} />

                <Route path="/officer" element={<Officer />} />

                <Route path="/contractor" element={<Contractor />} />

                <Route path="/complaint" element={<Complaint />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;