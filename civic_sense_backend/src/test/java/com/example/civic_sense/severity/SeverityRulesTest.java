package com.example.civic_sense.severity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static com.example.civic_sense.severity.HazardEvidence.Blockage.FULL;
import static com.example.civic_sense.severity.HazardEvidence.Condition.FALLEN;
import static com.example.civic_sense.severity.HazardEvidence.Condition.SEVERE;
import static com.example.civic_sense.severity.HazardEvidence.Position.*;
import static org.junit.jupiter.api.Assertions.*;

class SeverityRulesTest {
    private final SeverityRules rules = new SeverityRules("40,25,20,15", "25,50,80", "30,40,30",
            "35,25,25,15", "45,30,25", 100, 15);

    @TempDir
    Path temp;

    @Test
    void smallLargeAndDeepPotholesUseAvailableMeasurements() {
        var small = assess("Pothole", evidence(10.0, 1.5, SHOULDER, null, null, null, null));
        var large = assess("Pothole", evidence(100.0, 15.0, TRAVEL_LANE, null, null, null, null));
        var deep = assess("Pothole", evidence(null, 15.0, null, null, null, null, null));
        assertEquals(11.5, small.hazard());
        assertEquals(94.0, large.hazard());
        assertEquals(100.0, deep.hazard());
        assertTrue(deep.evidenceCompleteness() < 100);
    }

    @Test
    void aTreeBlockingEmergencyAccessAndAFallenPoleWithWiresAreCritical() {
        var tree = assess("Fallen Tree", evidence(null, null, null, FULL, FALLEN, false, true));
        var pole = assess("Fallen Electric Pole", evidence(null, null, null, null, FALLEN, true, null));
        var collapse = assess("Road Collapse", evidence(null, null, TRAVEL_LANE, FULL, SEVERE, null, null));
        for (var assessment : new SeverityAssessment[]{tree, pole, collapse}) {
            assertEquals("CRITICAL", assessment.priority());
            assertEquals(100.0, assessment.score());
            assertNotNull(assessment.emergencyRule());
        }
    }

    @Test
    void manholeAndPoleWithUncertainDangerRequireUrgentReview() {
        var manhole = assess("Open Manhole", evidence(60.0, null, FOOTPATH, null, null, null, null));
        assertEquals(80.0, manhole.hazard());
        assertTrue(manhole.urgentVerification());
        var pole = assess("Fallen Electric Pole", evidence(null, null, null, null, FALLEN, null, null));
        assertEquals("URGENT_REVIEW", pole.verificationStatus());
        assertNull(pole.emergencyRule());
    }

    @Test
    void soleHospitalAccessIncreasesImportanceAndNearbyParallelRoadsNeedCorrection() throws Exception {
        Path index = temp.resolve("roads.tsv");
        Files.writeString(index, """
                id	way	name	class	lat1	lon1	lat2	lon2	connectivity	essential	confidence	updated
                1:a:b	1	Hospital Access	residential	15.8500	74.51	15.8510	74.51	90	100	ESTIMATED	2026-01-01
                2:c:d	2	Arterial	primary	15.8500	74.5102	15.8510	74.5102	45		ESTIMATED	2026-01-01
                """);
        RoadIndex roads = new RoadIndex(index.toString(), rules);
        assertEquals("MISSING_GPS", roads.match(null, null, null, null).status());
        assertEquals("AMBIGUOUS_ROAD", roads.match(15.8505, 74.5101, 5.0, null).status());
        var corrected = roads.match(15.8505, 74.5101, 5.0, "1:a:b");
        assertEquals("OFFICER_MATCHED", corrected.status());
        var hospital = corrected.road();
        assertEquals(62.5, hospital.importance());
        assertEquals(100.0, hospital.essentialAccess());
        assertSame(hospital, roads.match(15.8505, 74.51, 5.0, null).road());

        var arterial = roads.match(15.8505, 74.5102, 5.0, null).road();
        assertEquals(45.0, arterial.connectivity());
        assertNull(arterial.essentialAccess());
        assertEquals("Estimated from OSM road class", arterial.trafficSource());
        assertEquals("CORRECTION_UNAVAILABLE", roads.match(15.85, 74.51, 5.0, "bad").status());
    }

    @Test
    void insufficientEvidenceAndGpsLeaveFactorsUnknown() {
        var result = assess("Other", null);
        assertNull(result.hazard());
        assertNull(result.roadImportance());
        assertNull(result.trafficExposure());
        assertNull(result.priority());
        assertNull(result.score());
        assertEquals("NEEDS_REVIEW", result.verificationStatus());
    }

    @Test
    void knownCategoryGetsProvisionalPriorityWithoutMeasuredEvidence() {
        var pothole = assess("Pothole", null);
        assertEquals(35.0, pothole.score());
        assertEquals("MEDIUM", pothole.priority());
        assertNull(pothole.hazard());
        assertEquals(0, pothole.evidenceCompleteness());
        assertTrue(pothole.explanation().contains("complaint category"));

        var electric = assess("Fallen Electric Pole", null);
        assertEquals("HIGH", electric.priority());
        assertTrue(electric.urgentVerification());
    }

    @Test
    void standardRoadIndexIsDiscoveredFromRepositoryAndBackendDirectories() throws Exception {
        Path backend = Files.createDirectory(temp.resolve("civic_sense_backend"));
        assertNull(RoadIndex.findLocalIndex(backend));

        Path dataDirectory = Files.createDirectory(temp.resolve(".local-data"));
        Path index = Files.createFile(dataDirectory.resolve("belagavi-roads.tsv"));
        assertEquals(index, RoadIndex.findLocalIndex(temp));
        assertEquals(index, RoadIndex.findLocalIndex(backend));
    }

    private SeverityAssessment assess(String category, HazardEvidence evidence) {
        return rules.assess(category, evidence, new RoadIndex.Match("MISSING_GPS", null), null,
                null, null, false, false, null);
    }

    private static HazardEvidence evidence(Double width, Double depth, HazardEvidence.Position position,
            HazardEvidence.Blockage blockage, HazardEvidence.Condition condition, Boolean wires, Boolean access) {
        return new HazardEvidence(width, depth, position, blockage, condition, null, wires, null,
                null, access, null, null, null, null, null);
    }
}
