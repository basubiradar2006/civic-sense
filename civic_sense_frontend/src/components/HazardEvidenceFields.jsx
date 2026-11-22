const POSITIONS = {
    SHOULDER: "Shoulder or verge", FOOTPATH: "Footpath", TRAVEL_LANE: "Travel lane", JUNCTION: "Junction",
};
const BLOCKAGE = { CLEAR: "Access clear", PARTIAL: "Partly blocked", FULL: "Fully blocked" };
const SIZE = { MINOR: "Small", MODERATE: "Moderate", SEVERE: "Severe" };

export default function HazardEvidenceFields({ category, value, onChange, officer = false }) {
    const update = (key, next) => onChange({ ...value, [key]: next });
    const wrapper = officer ? "form-group cp-evidence-field" : "form-group";
    const select = (key, label, options, convert = (item) => item) => (
        <label className={wrapper}>
            {label}
            <select value={value[key] == null ? "" : String(value[key])}
                onChange={(event) => update(key, event.target.value === "" ? null : convert(event.target.value))}>
                <option value="">Not sure</option>
                {Object.entries(options).map(([code, text]) => <option key={code} value={code}>{text}</option>)}
            </select>
        </label>
    );
    const yesNo = (key, label) => select(key, label, { true: "Yes", false: "No" }, (answer) => answer === "true");
    const number = (key, label, min, step) => (
        <label className={wrapper}>
            {label}
            <input type="number" min={min} max="10000" step={step} value={value[key] ?? ""}
                onChange={(event) => update(key, event.target.value === "" ? null : Number(event.target.value))} />
        </label>
    );

    if (!category) return null;
    const pothole = ["Pothole", "Road Damage"].includes(category);
    const flooding = ["Waterlogging", "Drainage", "Drainage Blockage", "Water Leakage"].includes(category);
    const streetlight = category === "Street Light";
    const pole = category === "Fallen Electric Pole";
    const tree = category === "Fallen Tree";
    const manhole = category === "Open Manhole";
    const roadIssue = pothole || flooding || tree || pole || manhole || ["Road Obstruction", "Road Collapse"].includes(category);
    const condition = pole ? { LEANING: "Leaning", FALLEN: "Fallen" }
        : streetlight ? { LAMP_FAILURE: "Lamp failure", DAMAGED_POLE: "Damaged pole", FALLEN: "Fallen pole" }
            : SIZE;

    return (
        <fieldset className="cp-evidence">
            <legend>Hazard details</legend>
            {(pothole || manhole || officer) && number("widthCm", "Width in cm, if known", 0.1, "any")}
            {(pothole || flooding || officer) && number("depthCm", "Depth in cm, if known", 0.1, "any")}
            {(pothole || manhole || officer) && select("position", "Where is the hazard?", POSITIONS)}
            {(roadIssue || officer) && select("blockage", "How much access is blocked?", BLOCKAGE)}
            {select("condition", pothole ? "Visual assessment, if measurements are unknown" : "Condition or extent", condition)}
            {(streetlight || officer) && number("affectedLights", "Number of lights affected, if known", 1, 1)}
            {(pole || tree || flooding || streetlight || officer) && yesNo("exposedWires", "Exposed or fallen electrical wires?")}
            {(tree || officer) && yesNo("injuries", "Any known injuries?")}
            {yesNo("immediateDanger", "Immediate severe danger to people?")}
            {(roadIssue || officer) && yesNo("emergencyAccessBlocked", "Emergency vehicle access disrupted?")}
            {(streetlight || manhole || officer) && yesNo("pedestrianExposure", "Pedestrians exposed to the hazard?")}
            {(pothole || officer) && yesNo("twoWheelerExposure", "Two-wheeler riders exposed to the hazard?")}
            {(flooding || officer) && yesNo("worsening", "Is the problem visibly getting worse?")}
            {(streetlight || officer) && yesNo("poorVisibility", "Poor visibility at the site?")}
            {officer && yesNo("alternativeRoute", "Usable alternate route?")}
        </fieldset>
    );
}
