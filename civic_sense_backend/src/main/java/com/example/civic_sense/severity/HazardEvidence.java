package com.example.civic_sense.severity;

/** Empty answers stay null. Measurements are optional, in centimetres. */
public record HazardEvidence(
        Double widthCm, Double depthCm, Position position, Blockage blockage,
        Condition condition, Integer affectedLights, Boolean exposedWires,
        Boolean injuries, Boolean immediateDanger, Boolean emergencyAccessBlocked,
        Boolean pedestrianExposure, Boolean twoWheelerExposure, Boolean worsening,
        Boolean poorVisibility, Boolean alternativeRoute) {

    public enum Position { SHOULDER, FOOTPATH, TRAVEL_LANE, JUNCTION }
    public enum Blockage { CLEAR, PARTIAL, FULL }
    public enum Condition { MINOR, MODERATE, SEVERE, LAMP_FAILURE, DAMAGED_POLE, LEANING, FALLEN }

    public HazardEvidence {
        checkMeasurement(widthCm);
        checkMeasurement(depthCm);
        if (affectedLights != null && (affectedLights < 1 || affectedLights > 10000)) {
            throw new IllegalArgumentException("Affected lights must be between 1 and 10000");
        }
    }

    private static void checkMeasurement(Double value) {
        if (value != null && (!Double.isFinite(value) || value <= 0 || value > 10000)) {
            throw new IllegalArgumentException("Measurements must be positive and at most 10000 cm");
        }
    }
}
