package com.example.civic_sense.severity;

public record SeverityAssessment(
        Double hazard, Double roadImportance, Double publicImpact, Double urgency,
        Double score, String priority, int evidenceCompleteness, String verificationStatus,
        String emergencyRule, boolean urgentVerification, String explanation,
        String roadMatchStatus, String roadId, String roadName, String roadClass,
        Double connectivity, Double essentialAccess, Double trafficExposure, String trafficSource, String trafficConfidence,
        String roadConfidence, String roadUpdatedAt) {

    public static SeverityAssessment pending() {
        return new SeverityAssessment(null, null, null, null, null, null, 0, "NEEDS_REVIEW",
                null, false, "Assessment unavailable. Awaiting reassessment.",
                null, null, null, null, null, null, null, null, null, null, null);
    }
}
