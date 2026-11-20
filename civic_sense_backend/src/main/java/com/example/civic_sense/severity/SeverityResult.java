package com.example.civic_sense.severity;

/** Output of the severity model. All factors are 0..1, score is 0..100. */
public record SeverityResult(
        double score,
        String level,
        double categoryFactor,
        double trafficFactor,
        double usageFactor,
        double communityFactor,
        double slaFactor
) {
}
