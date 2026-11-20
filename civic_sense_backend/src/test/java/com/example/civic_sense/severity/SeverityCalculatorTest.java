package com.example.civic_sense.severity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeverityCalculatorTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 19, 12, 0);

    private static final LocationContext BUSY_ROAD_NEAR_SCHOOL =
            new LocationContext(0.9, 0.5, "primary", "Within 300 m: school", true);

    private static final LocationContext QUIET_LANE =
            new LocationContext(0.35, 0.2, "residential", "", true);

    @Test
    void pothole_on_busy_road_with_single_report_is_medium() {
        SeverityResult r = SeverityCalculator.calculate(
                "Road Damage", BUSY_ROAD_NEAR_SCHOOL, 1, 0, "PENDING",
                NOW, NOW.plusDays(10), false, NOW);

        assertEquals("MEDIUM", r.level());
        assertEquals(0.0, r.communityFactor());
    }

    @Test
    void more_reports_raise_the_score() {
        SeverityResult one = SeverityCalculator.calculate(
                "Road Damage", BUSY_ROAD_NEAR_SCHOOL, 1, 0, "PENDING",
                NOW, NOW.plusDays(10), false, NOW);

        SeverityResult six = SeverityCalculator.calculate(
                "Road Damage", BUSY_ROAD_NEAR_SCHOOL, 6, 0, "PENDING",
                NOW, NOW.plusDays(10), false, NOW);

        assertTrue(six.score() > one.score());
        assertEquals("HIGH", six.level());
    }

    @Test
    void overdue_heavily_reported_issue_is_critical() {
        SeverityResult r = SeverityCalculator.calculate(
                "Road Damage", BUSY_ROAD_NEAR_SCHOOL, 8, 4, "VERIFIED",
                NOW.minusDays(12), NOW.minusDays(2), true, NOW);

        assertEquals("CRITICAL", r.level());
        assertEquals(1.0, r.slaFactor());
    }

    @Test
    void garbage_in_quiet_lane_is_low() {
        SeverityResult r = SeverityCalculator.calculate(
                "Garbage", QUIET_LANE, 1, 0, "PENDING",
                NOW, NOW.plusDays(2), false, NOW);

        assertEquals("LOW", r.level());
    }

    @Test
    void resolved_complaints_have_no_sla_pressure() {
        assertEquals(0.0, SeverityCalculator.slaFactor("RESOLVED", NOW.minusDays(9), NOW.minusDays(1), NOW));
    }

    @Test
    void community_factor_saturates_at_one() {
        assertEquals(1.0, SeverityCalculator.communityFactor(100, 100));
    }

    @Test
    void distance_between_two_points_is_reasonable() {
        // ~111 m per 0.001 degree of latitude
        double d = GeoUtils.distanceMeters(23.8103, 90.4125, 23.8113, 90.4125);
        assertTrue(d > 105 && d < 117, "distance was " + d);
    }
}
