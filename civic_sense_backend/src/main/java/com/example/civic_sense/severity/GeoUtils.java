package com.example.civic_sense.severity;

/**
 * Small geo helpers shared by duplicate detection and
 * location analysis.
 */
public final class GeoUtils {

    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private GeoUtils() {
    }

    /** Great-circle distance in metres (Haversine). */
    public static double distanceMeters(
            double lat1, double lon1,
            double lat2, double lon2) {

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Degrees of latitude that cover the given distance. */
    public static double latDelta(double meters) {
        return meters / 111_320.0;
    }

    /** Degrees of longitude that cover the given distance at a latitude. */
    public static double lonDelta(double meters, double latitude) {
        double cos = Math.cos(Math.toRadians(latitude));
        return meters / (111_320.0 * Math.max(cos, 0.01));
    }
}
