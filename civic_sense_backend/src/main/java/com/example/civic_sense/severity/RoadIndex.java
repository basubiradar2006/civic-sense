package com.example.civic_sense.severity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Immutable local spatial index, swapped only after a complete successful import. */
@Component
public final class RoadIndex {
    private static final Logger log = LoggerFactory.getLogger(RoadIndex.class);
    private static final double CELL_DEGREES = 0.001;
    private static final double CANDIDATE_METERS = 75;
    private static final String HEADER =
            "id\tway\tname\tclass\tlat1\tlon1\tlat2\tlon2\tconnectivity\tessential\tconfidence\tupdated";
    private final Path configuredPath;
    private final boolean autoDiscover;
    private final SeverityRules rules;
    private volatile Snapshot snapshot = new Snapshot(Map.of(), Map.of());
    private FileTime loaded;
    private Path loadedPath;

    public RoadIndex(@Value("${civic.severity.road-index:auto}") String path, SeverityRules rules) {
        this.autoDiscover = "auto".equalsIgnoreCase(path);
        this.configuredPath = path.isBlank() || autoDiscover ? null : Path.of(path);
        this.rules = rules;
        reload();
    }

    @Scheduled(fixedDelayString = "${civic.severity.road-index-refresh-ms:300000}")
    public synchronized void reload() {
        Path path = autoDiscover ? findLocalIndex(Path.of("").toAbsolutePath()) : configuredPath;
        if (path == null) return;
        try {
            FileTime modified = Files.getLastModifiedTime(path);
            if (path.equals(loadedPath) && modified.equals(loaded)) return;
            Snapshot complete = read(path);
            snapshot = complete;
            loaded = modified;
            loadedPath = path;
            log.info("Loaded {} local OSM road segments", complete.roads.size());
        } catch (IOException | IllegalArgumentException e) {
            log.warn("Local road index could not be loaded: {}", e.getMessage());
        }
    }

    static Path findLocalIndex(Path workingDirectory) {
        Path relative = Path.of(".local-data", "belagavi-roads.tsv");
        Path inWorkingDirectory = workingDirectory.resolve(relative);
        if (Files.isRegularFile(inWorkingDirectory)) return inWorkingDirectory;
        Path parent = workingDirectory.getParent();
        if (parent == null) return null;
        Path inParent = parent.resolve(relative);
        return Files.isRegularFile(inParent) ? inParent : null;
    }

    Match match(Double lat, Double lon, Double accuracy, String correctedRoadId) {
        Snapshot index = snapshot;
        if ("UNMATCHED".equals(correctedRoadId)) return new Match("OFFICER_UNMATCHED", null);
        if (correctedRoadId != null) {
            Road corrected = index.roads.get(correctedRoadId);
            return new Match(corrected == null ? "CORRECTION_UNAVAILABLE" : "OFFICER_MATCHED", corrected);
        }
        if (!valid(lat, lon)) return new Match("MISSING_GPS", null);
        if (index.roads.isEmpty()) return new Match("INDEX_UNAVAILABLE", null);
        if (accuracy != null && (!Double.isFinite(accuracy) || accuracy < 0 || accuracy > 35)) {
            return new Match("UNCERTAIN_GPS", null);
        }
        List<Candidate> candidates = candidates(index, lat, lon);
        double uncertainty = accuracy == null ? 12 : Math.max(8, accuracy);
        if (candidates.isEmpty() || candidates.get(0).distanceMeters() > Math.max(18, uncertainty)) {
            return new Match("NO_ROAD_MATCH", null);
        }
        Candidate best = candidates.get(0);
        if (candidates.stream().skip(1).anyMatch(candidate -> !sameRoad(best.road(), candidate.road())
                && candidate.distanceMeters() - best.distanceMeters() <= uncertainty)) {
            return new Match("AMBIGUOUS_ROAD", null);
        }
        return new Match("MATCHED", best.road());
    }

    private static boolean sameRoad(Road a, Road b) {
        return a.way().equals(b.way()) || (!a.name().isBlank() && a.name().equals(b.name())
                && a.roadClass().equals(b.roadClass()));
    }

    public List<Candidate> candidates(Double lat, Double lon) {
        return valid(lat, lon) ? candidates(snapshot, lat, lon).stream().limit(20).toList() : List.of();
    }

    private static List<Candidate> candidates(Snapshot index, double lat, double lon) {
        int latitudeRadius = (int) Math.ceil(GeoUtils.latDelta(CANDIDATE_METERS) / CELL_DEGREES);
        int longitudeRadius = (int) Math.ceil(GeoUtils.lonDelta(CANDIDATE_METERS, lat) / CELL_DEGREES);
        int ix = cell(lat), iy = cell(lon);
        Map<String, Candidate> distinct = new HashMap<>();
        for (int x = ix - latitudeRadius; x <= ix + latitudeRadius; x++) {
            for (int y = iy - longitudeRadius; y <= iy + longitudeRadius; y++) {
                for (Road road : index.cells.getOrDefault(new Cell(x, y), List.of())) {
                    if (distinct.containsKey(road.id())) continue;
                    double distance = road.distanceMeters(lat, lon);
                    if (distance <= CANDIDATE_METERS) distinct.put(road.id(), new Candidate(road, distance));
                }
            }
        }
        return distinct.values().stream().sorted(Comparator.comparingDouble(Candidate::distanceMeters)
                .thenComparing(candidate -> candidate.road().id())).toList();
    }

    private Snapshot read(Path file) throws IOException {
        Map<String, Road> roads = new HashMap<>();
        Map<Cell, List<Road>> cells = new HashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(file)) {
            if (!HEADER.equals(reader.readLine())) throw new IOException("Unexpected OSM road index header");
            for (String line; (line = reader.readLine()) != null; ) {
                String[] fields = line.split("\t", -1);
                if (fields.length != 12) throw new IOException("Invalid road index row");
                double lat1 = Double.parseDouble(fields[4]), lon1 = Double.parseDouble(fields[5]);
                double lat2 = Double.parseDouble(fields[6]), lon2 = Double.parseDouble(fields[7]);
                if (!valid(lat1, lon1) || !valid(lat2, lon2) || GeoUtils.distanceMeters(lat1, lon1, lat2, lon2) > 5000) {
                    throw new IOException("Invalid or unsplit road geometry");
                }
                Double connectivity = score(fields[8]), essential = score(fields[9]);
                double classification = classification(fields[3]);
                Road road = new Road(fields[0], fields[1], fields[2], fields[3], lat1, lon1, lat2, lon2,
                        classification, connectivity, essential, classification, "Estimated from OSM road class",
                        rules.roadImportance(classification, connectivity, essential, classification),
                        fields[10], fields[11]);
                if (roads.putIfAbsent(road.id(), road) != null) throw new IOException("Duplicate road segment ID");
                for (int x = cell(Math.min(lat1, lat2)); x <= cell(Math.max(lat1, lat2)); x++) {
                    for (int y = cell(Math.min(lon1, lon2)); y <= cell(Math.max(lon1, lon2)); y++) {
                        cells.computeIfAbsent(new Cell(x, y), key -> new ArrayList<>()).add(road);
                    }
                }
            }
        }
        if (roads.isEmpty()) throw new IOException("Road index contains no segments");
        return new Snapshot(roads, cells);
    }

    private static Double score(String value) throws IOException {
        if (value.isBlank()) return null;
        double parsed = Double.parseDouble(value);
        if (!Double.isFinite(parsed) || parsed < 0 || parsed > 100) throw new IOException("Road score outside 0–100");
        return parsed;
    }

    static double classification(String type) {
        return switch (type.replace("_link", "")) {
            case "motorway", "trunk" -> 100;
            case "primary" -> 85;
            case "secondary" -> 70;
            case "tertiary" -> 55;
            case "unclassified" -> 40;
            case "residential", "living_street" -> 30;
            case "service", "track" -> 15;
            case "pedestrian", "footway", "cycleway", "path", "steps" -> 10;
            default -> 20;
        };
    }

    private static boolean valid(Double lat, Double lon) {
        return lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }

    private static int cell(double coordinate) {
        return (int) Math.floor(coordinate / CELL_DEGREES);
    }

    public record Match(String status, Road road) {}
    public record Candidate(Road road, double distanceMeters) {}
    public record Road(String id, String way, String name, String roadClass,
                       double lat1, double lon1, double lat2, double lon2,
                       double classificationScore, Double connectivity, Double essentialAccess,
                       double trafficExposure, String trafficSource, Double importance, String confidence,
                       String updatedAt) {
        double distanceMeters(double lat, double lon) {
            double lonScale = 1 / GeoUtils.lonDelta(1, lat);
            double latScale = 1 / GeoUtils.latDelta(1);
            double x = (lat1 - lat) * latScale;
            double y = (lon1 - lon) * lonScale;
            double dx = (lat2 - lat1) * latScale;
            double dy = (lon2 - lon1) * lonScale;
            double lengthSquared = dx * dx + dy * dy;
            double projection = lengthSquared == 0 ? 0 : SeverityCalculator.clamp(-(x * dx + y * dy) / lengthSquared);
            return Math.hypot(x + projection * dx, y + projection * dy);
        }
    }

    private record Cell(int latitude, int longitude) {}
    private record Snapshot(Map<String, Road> roads, Map<Cell, List<Road>> cells) {}
}
