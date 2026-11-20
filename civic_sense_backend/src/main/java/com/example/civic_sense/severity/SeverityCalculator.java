package com.example.civic_sense.severity;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Pure (no Spring, no database) severity model so it is easy
 * to unit test and to tune.
 *
 * <pre>
 * score = 100 * ( 0.25 * category      how dangerous this kind of issue is
 *               + 0.20 * traffic       road class at the spot
 *               + 0.15 * usage         schools/hospitals/markets + area activity
 *               + 0.25 * community     number of people reporting / upvoting
 *               + 0.15 * sla )         how close to / past the SLA deadline
 *
 * level: >= 70 CRITICAL, >= 50 HIGH, >= 30 MEDIUM, else LOW
 * </pre>
 */
public final class SeverityCalculator {

    public static final double W_CATEGORY = 0.25;
    public static final double W_TRAFFIC = 0.20;
    public static final double W_USAGE = 0.15;
    public static final double W_COMMUNITY = 0.25;
    public static final double W_SLA = 0.15;

    /** Number of extra reports at which the community factor saturates. */
    private static final double COMMUNITY_SATURATION = 15.0;

    private SeverityCalculator() {
    }

    public static SeverityResult calculate(
            String category,
            LocationContext location,
            int reportCount,
            long likeCount,
            String status,
            LocalDateTime createdAt,
            LocalDateTime dueAt,
            boolean escalated,
            LocalDateTime now) {

        double categoryFactor = categoryFactor(category);
        double trafficFactor = clamp(location == null ? 0.5 : location.trafficFactor());
        double usageFactor = clamp(location == null ? 0.3 : location.usageFactor());
        double communityFactor = communityFactor(reportCount, likeCount);
        double slaFactor = slaFactor(status, createdAt, dueAt, now);

        double score = 100.0 * (
                W_CATEGORY * categoryFactor
                        + W_TRAFFIC * trafficFactor
                        + W_USAGE * usageFactor
                        + W_COMMUNITY * communityFactor
                        + W_SLA * slaFactor);

        // An escalated (SLA-breached) complaint is never below HIGH.
        if (escalated && !isClosed(status)) {
            score = Math.max(score, 50.0);
        }

        score = Math.round(score * 10.0) / 10.0;

        return new SeverityResult(
                score,
                level(score),
                round(categoryFactor),
                round(trafficFactor),
                round(usageFactor),
                round(communityFactor),
                round(slaFactor));
    }

    // -----------------------------------------------------
    // CATEGORY: intrinsic risk of the issue type
    // -----------------------------------------------------

    public static double categoryFactor(String category) {
        if (category == null) {
            return 0.3;
        }

        return switch (category.trim().toLowerCase(Locale.ROOT)) {
            case "water leakage" -> 0.90;
            case "road damage", "pothole" -> 0.80;
            case "drainage" -> 0.75;
            case "illegal dumping" -> 0.60;
            case "garbage" -> 0.60;
            case "street light" -> 0.55;
            case "public property damage" -> 0.45;
            default -> 0.30;
        };
    }

    // -----------------------------------------------------
    // COMMUNITY: duplicate reports + upvotes (log scale)
    // 1 report, 0 likes  -> 0.00
    // 5 reports          -> ~0.58
    // 16+ reports        -> 1.00
    // -----------------------------------------------------

    public static double communityFactor(int reportCount, long likeCount) {
        double extraSignals = Math.max(0, reportCount - 1) + 0.5 * Math.max(0, likeCount);

        return clamp(Math.log1p(extraSignals) / Math.log1p(COMMUNITY_SATURATION));
    }

    // -----------------------------------------------------
    // SLA: fraction of the allowed resolution time used up
    // -----------------------------------------------------

    public static double slaFactor(
            String status,
            LocalDateTime createdAt,
            LocalDateTime dueAt,
            LocalDateTime now) {

        if (isClosed(status)) {
            return 0.0;
        }

        if (createdAt == null || dueAt == null || now == null) {
            return 0.2;
        }

        long total = Duration.between(createdAt, dueAt).toMinutes();
        long used = Duration.between(createdAt, now).toMinutes();

        if (total <= 0) {
            return 1.0;
        }

        return clamp((double) used / total);
    }

    public static String level(double score) {
        if (score >= 70) {
            return "CRITICAL";
        }
        if (score >= 50) {
            return "HIGH";
        }
        if (score >= 30) {
            return "MEDIUM";
        }
        return "LOW";
    }

    public static boolean isClosed(String status) {
        return "COMPLETED".equalsIgnoreCase(status)
                || "RESOLVED".equalsIgnoreCase(status);
    }

    static double clamp(double v) {
        if (Double.isNaN(v)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(1.0, v));
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
