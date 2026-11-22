package com.example.civic_sense.severity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VehicleCountTest {

    @TempDir
    Path directory;

    @Test
    void prefersAnObservedMonthAndKeepsAnnualCountForLeapYearEstimate() throws IOException {
        VehicleCount counts = load("""
                15.8000,75.1000,15.8020,75.1000,2023,24000,Road survey
                15.8020,75.1000,15.8000,75.1000,2023-12,930000,December count
                """);

        var december = counts.monthlyVolume(15.801, 75.100, 3.0, YearMonth.of(2023, 12)).orElseThrow();
        assertEquals(930_000, december.vehicles());
        assertNull(december.aadtYear());
        assertEquals(0.60, counts.trafficFactor(december), 0.00001);

        var february = counts.monthlyVolume(15.801, 75.100, 3.0, YearMonth.of(2024, 2)).orElseThrow();
        assertEquals(696_000, february.vehicles());
        assertEquals(2023, february.aadtYear());
        assertEquals(0.48, counts.trafficFactor(february), 0.00001);
    }

    @Test
    void skipsAmbiguousCoordinatesAndDoesNotBorrowCountsFromAnotherRoad() throws IOException {
        VehicleCount counts = load("""
                15.8000,75.1000,15.8020,75.1000,2023,24000,First road
                15.8000,75.1002,15.8020,75.1002,2024-01,900000,Second road
                """);
        YearMonth month = YearMonth.of(2024, 2);

        assertTrue(counts.monthlyVolume(15.801, 75.1001, 5.0, month).isEmpty());
        assertTrue(counts.monthlyVolume(15.801, 75.1000, 30.0, month).isEmpty());
        assertTrue(counts.monthlyVolume(15.801, 75.1002, 5.0, month).isEmpty());
        assertTrue(counts.monthlyVolume(15.801, 75.1050, 5.0, month).isEmpty());
    }

    private VehicleCount load(String rows) throws IOException {
        Path csv = Files.writeString(directory.resolve("counts.csv"),
                "start_lat,start_lon,end_lat,end_lon,period,vehicles,source\n" + rows);
        return new VehicleCount(csv.toUri().toString(), 50_000, new DefaultResourceLoader());
    }
}
