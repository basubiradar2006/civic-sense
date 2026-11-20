package com.example.civic_sense.severity;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.repository.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Works out how busy / important the place of a complaint is.
 *
 * Two levels of analysis:
 *  1. quick()  - no network: address keywords + how many other
 *                issues were reported around the same spot.
 *  2. full()   - quick() plus OpenStreetMap (Overpass API):
 *                road class at the exact spot (traffic) and
 *                schools / hospitals / markets / bus stations
 *                within 300 m (usage).
 *
 * full() is called asynchronously after a complaint is saved,
 * so citizens never wait for the map lookup.
 */
@Service
public class LocationContextService {

    private static final Logger log = LoggerFactory.getLogger(LocationContextService.class);

    private static final String POI_REGEX =
            "^(school|hospital|clinic|marketplace|bus_station|college|university|place_of_worship|kindergarten)$";

    private final ComplaintRepository complaintRepository;

    private final boolean osmEnabled;
    private final String overpassUrl;
    private final RestClient restClient;

    // Cache map lookups per ~11 m grid cell
    private final Map<String, OsmData> osmCache = new ConcurrentHashMap<>();

    public LocationContextService(
            ComplaintRepository complaintRepository,
            @Value("${civic.severity.osm.enabled:true}") boolean osmEnabled,
            @Value("${civic.severity.osm.url:https://overpass-api.de/api/interpreter}") String overpassUrl) {

        this.complaintRepository = complaintRepository;
        this.osmEnabled = osmEnabled;
        this.overpassUrl = overpassUrl;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(4));
        factory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("User-Agent", "CivicPulse/1.0 (civic complaint severity analysis)")
                .build();
    }

    // =====================================================
    // QUICK ANALYSIS (no network)
    // =====================================================

    public LocationContext quick(Complaint complaint) {

        String address = complaint.getAddress() == null
                ? ""
                : complaint.getAddress().toLowerCase(Locale.ROOT);

        // ---- traffic from address words ----
        double traffic = 0.5;
        String roadType = "unknown";

        if (containsAny(address, "highway", "expressway", "national highway", "nh-", "nh ", "motorway")) {
            traffic = 0.95;
            roadType = "highway";
        } else if (containsAny(address, "main road", "avenue", "bypass", "flyover", "bridge", "boulevard")) {
            traffic = 0.80;
            roadType = "main road";
        } else if (containsAny(address, "junction", "chowk", "circle", "crossing", "square", " mor ", "roundabout")) {
            traffic = 0.75;
            roadType = "junction";
        } else if (containsAny(address, " road", " rd")) {
            traffic = 0.55;
            roadType = "road";
        } else if (containsAny(address, "lane", "goli", "gali", "street", "alley")) {
            traffic = 0.40;
            roadType = "lane";
        }

        // ---- usage from address words ----
        Set<String> places = new TreeSet<>();
        for (String word : List.of("school", "hospital", "clinic", "market", "bazar", "bazaar",
                "station", "college", "university", "mosque", "temple", "church", "mall", "terminal")) {
            if (address.contains(word)) {
                places.add(word);
            }
        }
        double poiScore = Math.min(1.0, places.size() / 2.0);

        // ---- area activity: issues within 500 m in last 90 days ----
        long nearbyIssues = countNearbyIssues(complaint, 500);
        double density = Math.min(1.0, nearbyIssues / 10.0);

        double usage = 0.2 + 0.4 * poiScore + 0.4 * density;

        StringBuilder description = new StringBuilder();
        if (!places.isEmpty()) {
            description.append("Address mentions: ").append(String.join(", ", places)).append(". ");
        }
        description.append(nearbyIssues).append(" issue(s) reported within 500 m in the last 90 days.");

        return new LocationContext(
                SeverityCalculator.clamp(traffic),
                SeverityCalculator.clamp(usage),
                roadType,
                description.toString(),
                false);
    }

    // =====================================================
    // FULL ANALYSIS (OpenStreetMap)
    // =====================================================

    public LocationContext full(Complaint complaint) {

        LocationContext quick = quick(complaint);

        if (!osmEnabled
                || complaint.getLatitude() == null
                || complaint.getLongitude() == null) {
            return quick;
        }

        OsmData osm = lookupOsm(complaint.getLatitude(), complaint.getLongitude());

        if (osm == null) {
            return quick;
        }

        double traffic = osm.roadType == null
                ? quick.trafficFactor()
                : Math.max(osm.trafficFactor, quick.trafficFactor() * 0.8);

        double poiScore = Math.min(1.0, osm.pois.size() / 4.0);
        double usage = Math.max(quick.usageFactor(), quick.usageFactor() * 0.6 + 0.5 * poiScore);

        StringBuilder description = new StringBuilder();
        if (osm.roadType != null) {
            description.append("Road: ").append(osm.roadType).append(". ");
        }
        if (!osm.pois.isEmpty()) {
            description.append("Within 300 m: ").append(String.join(", ", osm.pois)).append(". ");
        }
        description.append(quick.description());

        return new LocationContext(
                SeverityCalculator.clamp(traffic),
                SeverityCalculator.clamp(usage),
                osm.roadType != null ? osm.roadType : quick.roadType(),
                description.toString(),
                true);
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private long countNearbyIssues(Complaint complaint, double radiusMeters) {

        if (complaint.getLatitude() == null || complaint.getLongitude() == null) {
            return 0;
        }

        double lat = complaint.getLatitude();
        double lon = complaint.getLongitude();
        double dLat = GeoUtils.latDelta(radiusMeters);
        double dLon = GeoUtils.lonDelta(radiusMeters, lat);

        long count = complaintRepository.countIssuesInArea(
                lat - dLat, lat + dLat,
                lon - dLon, lon + dLon,
                LocalDateTime.now().minusDays(90));

        // Don't count the complaint itself
        return complaint.getId() != null ? Math.max(0, count - 1) : count;
    }

    private OsmData lookupOsm(double lat, double lon) {

        String key = String.format(Locale.ROOT, "%.4f,%.4f", lat, lon);

        OsmData cached = osmCache.get(key);
        if (cached != null) {
            return cached;
        }

        String query = String.format(Locale.ROOT, """
                [out:json][timeout:8];
                (
                  way(around:40,%1$f,%2$f)[highway];
                  node(around:300,%1$f,%2$f)[amenity~"%3$s"];
                  way(around:300,%1$f,%2$f)[amenity~"%3$s"];
                  node(around:300,%1$f,%2$f)[public_transport=station];
                );
                out tags;
                """, lat, lon, POI_REGEX);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(overpassUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body("data=" + URLEncoder.encode(query, StandardCharsets.UTF_8))
                    .retrieve()
                    .body(Map.class);

            OsmData data = parseOsm(response);

            if (osmCache.size() > 5000) {
                osmCache.clear();
            }
            osmCache.put(key, data);

            return data;

        } catch (Exception e) {
            log.warn("OpenStreetMap lookup failed for {}: {}", key, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private OsmData parseOsm(Map<String, Object> response) {

        OsmData data = new OsmData();

        if (response == null || !(response.get("elements") instanceof List<?> elements)) {
            return data;
        }

        for (Object element : elements) {
            if (!(element instanceof Map<?, ?> map)
                    || !(map.get("tags") instanceof Map<?, ?> tags)) {
                continue;
            }

            Object highway = tags.get("highway");
            if (highway != null) {
                double factor = roadTrafficFactor(highway.toString());
                if (factor > data.trafficFactor) {
                    data.trafficFactor = factor;
                    data.roadType = highway.toString();
                }
            }

            Object amenity = tags.get("amenity");
            if (amenity != null) {
                data.pois.add(amenity.toString().replace('_', ' '));
            }

            if ("station".equals(String.valueOf(tags.get("public_transport")))) {
                data.pois.add("transit station");
            }
        }

        return data;
    }

    /** OpenStreetMap highway=* class to a 0..1 traffic estimate. */
    static double roadTrafficFactor(String highway) {
        String h = highway.toLowerCase(Locale.ROOT).replace("_link", "");
        return switch (h) {
            case "motorway", "trunk" -> 1.0;
            case "primary" -> 0.9;
            case "secondary" -> 0.75;
            case "tertiary" -> 0.6;
            case "pedestrian" -> 0.5;
            case "unclassified" -> 0.45;
            case "residential", "living_street" -> 0.35;
            case "service" -> 0.25;
            case "footway", "path", "cycleway", "steps", "track" -> 0.2;
            default -> 0.3;
        };
    }

    private static boolean containsAny(String text, String... words) {
        for (String w : words) {
            if (text.contains(w)) {
                return true;
            }
        }
        return false;
    }

    private static final class OsmData {
        double trafficFactor = 0.0;
        String roadType = null;
        Set<String> pois = new TreeSet<>();
    }
}
