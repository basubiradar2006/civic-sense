package com.example.civic_sense.severity;

/** Audit snapshot of an officer's assessment correction. */
public record SeverityReview(Long officerId, String reviewedAt, String reason,
                             HazardEvidence evidence, String roadId, String priority,
                             HazardEvidence previousEvidence, String previousPriority) {
    public record Request(HazardEvidence evidence, String roadId, String priority, String reason) {}
    public record Options(java.util.List<RoadIndex.Candidate> candidates, String roadId, String priority) {}
}
