package com.example.civic_sense.severity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Optional;
import java.util.TreeMap;

/** Matches imported traffic surveys to the affected road segment. */
@Component
public final class VehicleCount {

    private static final Logger log = LoggerFactory.getLogger(VehicleCount.class);
    private static final String HEADER =
            "start_lat,start_lon,end_lat,end_lon,period,vehicles,source";
    private static final double MAX_DISTANCE_METERS = 25;
    private static final double MIN_AMBIGUITY_METERS = 8;

    private final Map<Segment, SegmentSurveys> surveys;
    private final double referenceDailyVolume;

    public VehicleCount(
            @Value("${civic.severity.vehicle-count.csv:}") String csv,
            @Value("${civic.severity.vehicle-count.reference-daily-volume:50000}") double referenceDailyVolume,
            ResourceLoader resources) {
        if (!Double.isFinite(referenceDailyVolume) || referenceDailyVolume <= 0) {
            throw new IllegalArgumentException("Vehicle count reference daily volume must be positive");
        }
        this.referenceDailyVolume = referenceDailyVolume;
        this.surveys = csv.isBlank() ? Map.of() : load(csv, resources);
    }

    Optional<MonthlyVolume> monthlyVolume(Double lat, Double lon, Double accuracy, YearMonth month) {
        if (surveys.isEmpty() || lat == null || lon == null || !validPoint(lat, lon)
                || (accuracy != null && (!Double.isFinite(accuracy) || accuracy < 0
                        || accuracy > MAX_DISTANCE_METERS))) {
            return Optional.empty();
        }

        Segment best = null;
        double nearest = Double.POSITIVE_INFINITY;
        double runnerUp = Double.POSITIVE_INFINITY;
        double uncertainty = Math.max(MIN_AMBIGUITY_METERS, accuracy == null ? 0 : accuracy);
        for (Segment segment : surveys.keySet()) {
            double distance = segment.distanceMeters(lat, lon);
            if (distance < nearest) {
                runnerUp = nearest;
                nearest = distance;
                best = segment;
            } else if (distance < runnerUp) {
                runnerUp = distance;
            }
        }
        if (nearest > MAX_DISTANCE_METERS || runnerUp - nearest <= uncertainty) {
            return Optional.empty();
        }

        SegmentSurveys history = surveys.get(best);
        Survey observed = history.monthly.get(month);
        if (observed != null) {
            return Optional.of(new MonthlyVolume(month, observed.vehicles(), observed.source(), null));
        }

        int latestAnnualYear = month.getMonthValue() == 12 ? month.getYear() : month.getYear() - 1;
        Map.Entry<Integer, Survey> annual = history.annual.floorEntry(latestAnnualYear);
        if (annual == null) {
            return Optional.empty();
        }
        Survey survey = annual.getValue();
        return Optional.of(new MonthlyVolume(month, survey.vehicles() * month.lengthOfMonth(),
                survey.source(), annual.getKey()));
    }

    double trafficFactor(MonthlyVolume volume) {
        double dailyAverage = (double) volume.vehicles() / volume.month().lengthOfMonth();
        return SeverityCalculator.clamp(dailyAverage / referenceDailyVolume);
    }

    private static Map<Segment, SegmentSurveys> load(String csv, ResourceLoader resources) {
        Map<Segment, SegmentSurveys> result = new HashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                resources.getResource(csv).getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null || !HEADER.equals(header.replace("\uFEFF", "").trim())) {
                log.warn("Ignoring vehicle count file {}. Expected header {}", csv, HEADER);
                return Map.of();
            }

            int lineNumber = 1;
            for (String line; (line = reader.readLine()) != null; ) {
                lineNumber++;
                if (line.isBlank()) {
                    continue;
                }
                try {
                    addSurvey(result, line);
                } catch (IllegalArgumentException | DateTimeParseException e) {
                    log.warn("Skipping invalid vehicle count at {} line {}", csv, lineNumber);
                }
            }
        } catch (IOException e) {
            log.warn("Could not read vehicle count file {}: {}", csv, e.getMessage());
            return Map.of();
        }
        return result;
    }

    private static void addSurvey(Map<Segment, SegmentSurveys> result, String line) {
        String[] fields = line.split(",", -1);
        if (fields.length != 7) {
            throw new IllegalArgumentException("Expected seven CSV fields");
        }
        double startLat = Double.parseDouble(fields[0].trim());
        double startLon = Double.parseDouble(fields[1].trim());
        double endLat = Double.parseDouble(fields[2].trim());
        double endLon = Double.parseDouble(fields[3].trim());
        String period = fields[4].trim();
        boolean annual = period.matches("[0-9]{4}");
        YearMonth month = YearMonth.parse(annual ? period + "-12" : period);
        long vehicles = Long.parseLong(fields[5].trim());
        String source = fields[6].trim();
        if (!validPoint(startLat, startLon) || !validPoint(endLat, endLon)
                || (startLat == endLat && startLon == endLon)
                || vehicles < 0 || (annual && vehicles > Long.MAX_VALUE / 31)
                || source.isBlank() || source.length() > 160) {
            throw new IllegalArgumentException("Invalid survey values");
        }
        Segment segment = startLat < endLat || (startLat == endLat && startLon < endLon)
                ? new Segment(startLat, startLon, endLat, endLon)
                : new Segment(endLat, endLon, startLat, startLon);
        SegmentSurveys history = result.computeIfAbsent(segment, key -> new SegmentSurveys());
        Survey survey = new Survey(vehicles, source);
        if (annual) {
            history.annual.put(month.getYear(), survey);
        } else {
            history.monthly.put(month, survey);
        }
    }

    private static boolean validPoint(double lat, double lon) {
        return Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }

    record MonthlyVolume(YearMonth month, long vehicles, String source, Integer aadtYear) {
        String description() {
            String method = aadtYear == null ? "recorded monthly count" : "estimated from " + aadtYear + " AADT";
            return String.format(Locale.ROOT, "Traffic for %s: %,d vehicle passes (%s, %s).",
                    month, vehicles, method, source);
        }
    }

    private record Survey(long vehicles, String source) {
    }

    private static final class SegmentSurveys {
        final Map<YearMonth, Survey> monthly = new HashMap<>();
        final NavigableMap<Integer, Survey> annual = new TreeMap<>();
    }

    private record Segment(double startLat, double startLon, double endLat, double endLon) {
        double distanceMeters(double lat, double lon) {
            double metersPerDegreeLat = 1 / GeoUtils.latDelta(1);
            double metersPerDegreeLon = 1 / GeoUtils.lonDelta(1, lat);
            double x1 = Math.IEEEremainder(startLon - lon, 360) * metersPerDegreeLon;
            double y1 = (startLat - lat) * metersPerDegreeLat;
            double dx = Math.IEEEremainder(endLon - startLon, 360) * metersPerDegreeLon;
            double dy = (endLat - startLat) * metersPerDegreeLat;
            double projection = SeverityCalculator.clamp(-(x1 * dx + y1 * dy) / (dx * dx + dy * dy));
            return Math.hypot(x1 + projection * dx, y1 + projection * dy);
        }
    }
}
