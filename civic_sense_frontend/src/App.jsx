import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Citizen from "./pages/Citizen";
import Officer from "./pages/Officer";
import Contractor from "./pages/Contractor";
import Complaint from "./pages/Complaint";
import NearbyComplaints from "./pages/NearbyComplaints";
import ReportDetails from "./pages/ReportDetails";

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

                <Route
                    path="/nearby-complaints"
                    element={<NearbyComplaints />}
                />
                <Route
                    path="/report/:id"
                    element={<ReportDetails />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;