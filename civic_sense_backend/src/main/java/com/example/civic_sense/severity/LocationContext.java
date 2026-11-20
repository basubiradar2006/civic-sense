package com.example.civic_sense.severity;

/**
 * What we know about the place where an issue happened.
 *
 * trafficFactor - 0..1, how busy the road at that spot is
 *                 (motorway = 1.0, footpath = 0.2)
 * usageFactor   - 0..1, how heavily the area is used by people
 *                 (schools / hospitals / markets nearby,
 *                 number of other issues reported around it)
 */
public record LocationContext(
        double trafficFactor,
        double usageFactor,
        String roadType,
        String description,
        boolean fromMapData
) {
}
