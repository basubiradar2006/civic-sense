package com.example.civic_sense.severity;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import static com.example.civic_sense.severity.HazardEvidence.Blockage.FULL;
import static com.example.civic_sense.severity.HazardEvidence.Condition.*;

@Component
public final class SeverityRules {
    private final double[] weights;
    private final double[] thresholds;
    private final double[] potholeWeights;
    private final double[] roadWeights;
    private final double[] impactWeights;
    private final double widthReference;
    private final double depthReference;

    public SeverityRules(
            @Value("${civic.severity.weights:40,25,20,15}") String weights,
            @Value("${civic.severity.thresholds:25,50,80}") String thresholds,
            @Value("${civic.severity.pothole.weights:30,40,30}") String potholeWeights,
            @Value("${civic.severity.road.weights:35,25,25,15}") String roadWeights,
            @Value("${civic.severity.impact.weights:45,30,25}") String impactWeights,
            @Value("${civic.severity.pothole.width-reference-cm:100}") double widthReference,
            @Value("${civic.severity.pothole.depth-reference-cm:15}") double depthReference) {
        this.weights = parse(weights, 4);
        this.thresholds = parse(thresholds, 3);
        this.potholeWeights = parse(potholeWeights, 3);
        this.roadWeights = parse(roadWeights, 4);
        this.impactWeights = parse(impactWeights, 3);
        if (this.thresholds[0] >= this.thresholds[1] || this.thresholds[1] >= this.thresholds[2]
                || !Double.isFinite(widthReference) || widthReference <= 0
                || !Double.isFinite(depthReference) || depthReference <= 0) {
            throw new IllegalArgumentException("Invalid severity thresholds or pothole references");
        }
        this.widthReference = widthReference;
        this.depthReference = depthReference;
    }

    SeverityAssessment assess(String category, HazardEvidence evidence, RoadIndex.Match match,
                              RoadIndex.Road road, Double traffic, String trafficSource, boolean overdue,
                              boolean reviewed, String priorityOverride) {
        String type = category == null ? "" : category.strip().toLowerCase(java.util.Locale.ROOT);
        Double hazard = hazard(type, evidence);
        Double categoryEstimate = hazard == null ? categoryEstimate(type) : null;
        Double importance = road == null ? null : java.util.Objects.equals(road.trafficSource(), trafficSource)
                ? road.importance() : roadImportance(road.classificationScore(), road.connectivity(), road.essentialAccess(), traffic);
        Double exposure = evidence == null ? null : maximum(traffic,
                signal(evidence.pedestrianExposure(), 75), signal(evidence.twoWheelerExposure(), 75));
        Double access = evidence == null ? null : maximum(signal(evidence.emergencyAccessBlocked(), 100),
                inverseSignal(evidence.alternativeRoute(), 80));
        Double impact = evidence == null ? null : combine(impactWeights,
                blockage(evidence), exposure, access);
        Double urgency = evidence == null ? null : maximum(signal(evidence.immediateDanger(), 100),
                signal(evidence.worsening(), 75), signal(evidence.poorVisibility(), 60),
                signal(evidence.emergencyAccessBlocked(), 100), signal(evidence.exposedWires(), 95),
                signal(evidence.injuries(), 95));
        Emergency emergency = emergency(type, evidence);
        boolean uncertain = emergency == null && uncertainEmergency(type, evidence);
        boolean urgent = uncertain || emergency != null && !reviewed;
        Double score = combine(weights, hazard == null ? categoryEstimate : hazard, importance, impact, urgency);
        int completeness = completeness(hazard, evidence, road, traffic);
        String priority = score == null ? null : level(score);
        if (priorityOverride != null) {
            priority = priorityOverride;
        }
        if (emergency != null) {
            priority = "CRITICAL";
            score = 100.0;
        } else if ((urgent || overdue) && (priority == null || "MEDIUM".equals(priority) || "LOW".equals(priority))) {
            priority = "HIGH";
        }
        String verification = urgent ? "URGENT_REVIEW"
                : reviewed ? "OFFICER_REVIEWED" : completeness < 100 ? "NEEDS_REVIEW" : "PROVISIONAL";
        String explanation = emergency != null ? emergency.explanation : urgent ? "A serious hazard is possible. Verify promptly."
                : score == null ? "There is insufficient evidence to calculate a score."
                : categoryEstimate != null ? "Provisional score uses the complaint category because the site's physical hazard is unknown."
                : completeness < 100 ? "Scored using available evidence. Some factors remain unknown."
                : "Scored from the reported hazard, affected road, public impact and urgency.";
        if (urgent && emergency == null && categoryEstimate != null) {
            explanation += " The provisional score uses the complaint category.";
        }
        if (emergency == null && evidence != null && evidence.blockage() != null
                && evidence.blockage() != HazardEvidence.Blockage.CLEAR) {
            explanation += evidence.blockage() == FULL ? " Full blockage reported." : " Partial blockage reported.";
        }
        if (priorityOverride != null && emergency == null) {
            explanation += " An officer set the operational priority.";
        }
        if (overdue && emergency == null) {
            explanation += " The resolution deadline has passed.";
        }
        return new SeverityAssessment(hazard, importance, impact, urgency, score, priority, completeness,
                verification, emergency == null ? null : emergency.name(), urgent, explanation, match.status(),
                road == null ? null : road.id(), road == null ? null : road.name(),
                road == null ? null : road.roadClass(), road == null ? null : road.connectivity(),
                road == null ? null : road.essentialAccess(), traffic, trafficSource,
                trafficSource == null ? null : switch (trafficSource) {
                    case "Recorded vehicle count" -> "HIGH";
                    case "Estimated from survey AADT" -> "MEDIUM";
                    default -> "LOW";
                },
                road == null ? null : road.confidence(), road == null ? null : road.updatedAt());
    }

    Double roadImportance(double classification, Double connectivity, Double essential, Double traffic) {
        return combine(roadWeights, classification, connectivity, essential, traffic);
    }

    /** Starting estimate for triage when a reported category has no physical hazard evidence. */
    private static Double categoryEstimate(String type) {
        return switch (type) {
            case "road collapse", "fallen electric pole", "open manhole" -> 60.0;
            case "fallen tree", "road obstruction", "waterlogging", "water leakage", "drainage blockage" -> 45.0;
            case "pothole", "potholes", "road damage", "drainage", "street light", "damaged streetlight" -> 35.0;
            case "garbage", "illegal dumping", "public property damage" -> 20.0;
            default -> null;
        };
    }

    private Double hazard(String type, HazardEvidence evidence) {
        if (evidence == null) {
            return null;
        }
        Double condition = condition(evidence.condition());
        Double blocked = blockage(evidence);
        Double position = evidence.position() == null ? null : switch (evidence.position()) {
            case SHOULDER -> 15.0;
            case FOOTPATH -> 55.0;
            case TRAVEL_LANE -> 80.0;
            case JUNCTION -> 100.0;
        };
        return switch (type) {
            case "pothole", "potholes", "road damage" -> {
                Double positionRisk = maximum(position, signal(evidence.pedestrianExposure(), 70),
                        signal(evidence.twoWheelerExposure(), 80));
                if (position == null && positionRisk != null && positionRisk == 0) positionRisk = null;
                Double measured = combine(potholeWeights, measurement(evidence.widthCm(), widthReference),
                        measurement(evidence.depthCm(), depthReference), positionRisk);
                yield measured == null ? condition : measured;
            }
            case "fallen tree" -> maximum(blocked, condition, signal(evidence.pedestrianExposure(), 70),
                    signal(evidence.exposedWires(), 100), signal(evidence.injuries(), 100),
                    signal(evidence.emergencyAccessBlocked(), 100));
            case "fallen electric pole" -> maximum(condition, blocked, signal(evidence.exposedWires(), 100));
            case "street light", "damaged streetlight" -> maximum(condition,
                    evidence.affectedLights() == null ? null : Math.min(100.0, evidence.affectedLights() * 15.0),
                    signal(evidence.poorVisibility(), 75), signal(evidence.pedestrianExposure(), 60));
            case "open manhole" -> maximum(condition, position, measurement(evidence.widthCm(), 75),
                    signal(evidence.pedestrianExposure(), 85));
            case "waterlogging", "drainage", "drainage blockage", "water leakage" ->
                    maximum(condition, blocked, measurement(evidence.depthCm(), 50),
                            signal(evidence.exposedWires(), 100), signal(evidence.worsening(), 75));
            case "road collapse" -> maximum(condition, blocked, position);
            default -> maximum(condition, blocked, signal(evidence.immediateDanger(), 90));
        };
    }

    private static Emergency emergency(String type, HazardEvidence evidence) {
        if (evidence == null) return null;
        if (Boolean.TRUE.equals(evidence.exposedWires())) return Emergency.LIVE_WIRE_RISK;
        if ("road collapse".equals(type) && (evidence.condition() == SEVERE || evidence.blockage() == FULL)) {
            return Emergency.DANGEROUS_ROAD_COLLAPSE;
        }
        if ("fallen tree".equals(type) && evidence.blockage() == FULL
                && Boolean.TRUE.equals(evidence.emergencyAccessBlocked())) {
            return Emergency.EMERGENCY_ACCESS_BLOCKED_BY_TREE;
        }
        if (Boolean.TRUE.equals(evidence.immediateDanger()) || Boolean.TRUE.equals(evidence.injuries())) {
            return Emergency.IMMEDIATE_DANGER_OR_INJURIES;
        }
        return null;
    }

    private enum Emergency {
        LIVE_WIRE_RISK("Potentially live exposed or fallen wires reported."),
        DANGEROUS_ROAD_COLLAPSE("Dangerous road collapse reported."),
        EMERGENCY_ACCESS_BLOCKED_BY_TREE("Fallen tree fully blocks emergency access."),
        IMMEDIATE_DANGER_OR_INJURIES("Immediate danger to people or injuries reported.");

        private final String explanation;

        Emergency(String explanation) {
            this.explanation = explanation;
        }
    }

    private static boolean uncertainEmergency(String type, HazardEvidence evidence) {
        if ("road collapse".equals(type)) {
            return evidence == null || evidence.immediateDanger() == null || evidence.blockage() == null;
        }
        if ("fallen electric pole".equals(type)) return evidence == null || evidence.exposedWires() == null;
        return "open manhole".equals(type) && (evidence == null || evidence.immediateDanger() == null)
                || "fallen tree".equals(type) && evidence != null && evidence.blockage() == FULL
                    && evidence.emergencyAccessBlocked() == null;
    }

    private static int completeness(Double hazard, HazardEvidence e, RoadIndex.Road road, Double traffic) {
        double hazardCoverage = hazard == null ? 0 : e != null && (e.condition() != null
                || e.widthCm() != null && e.depthCm() != null && e.position() != null) ? 1 : 0.5;
        double roadCoverage = road == null ? 0 : (1.0 + (road.connectivity() == null ? 0 : 1)
                + (road.essentialAccess() == null ? 0 : 1) + (traffic == null ? 0 : 1)) / 4;
        double impactCoverage = e == null ? 0 : ((e.blockage() == null ? 0 : 1)
                + (e.pedestrianExposure() == null && e.twoWheelerExposure() == null && traffic == null ? 0 : 1)
                + (e.emergencyAccessBlocked() == null && e.alternativeRoute() == null ? 0 : 1)) / 3.0;
        double urgencyCoverage = e == null ? 0 : ((e.immediateDanger() == null ? 0 : 1)
                + (e.worsening() == null ? 0 : 1) + (e.poorVisibility() == null ? 0 : 1)) / 3.0;
        return (int) Math.round(25 * (hazardCoverage + roadCoverage + impactCoverage + urgencyCoverage));
    }

    private String level(double score) {
        if (score >= thresholds[2]) return "CRITICAL";
        if (score >= thresholds[1]) return "HIGH";
        return score >= thresholds[0] ? "MEDIUM" : "LOW";
    }

    private static Double blockage(HazardEvidence evidence) {
        return evidence.blockage() == null ? null : switch (evidence.blockage()) {
            case CLEAR -> 0.0;
            case PARTIAL -> 60.0;
            case FULL -> 100.0;
        };
    }

    private static Double condition(HazardEvidence.Condition condition) {
        return condition == null ? null : switch (condition) {
            case MINOR, LAMP_FAILURE -> 20.0;
            case MODERATE -> 55.0;
            case DAMAGED_POLE, LEANING -> 75.0;
            case SEVERE, FALLEN -> 95.0;
        };
    }

    private static Double signal(Boolean value, double risk) {
        return value == null ? null : value ? risk : 0.0;
    }

    private static Double inverseSignal(Boolean value, double risk) {
        return value == null ? null : signal(!value, risk);
    }

    private static Double measurement(Double value, double reference) {
        return value == null ? null : Math.min(100.0, value * 100 / reference);
    }

    private static Double maximum(Double... values) {
        return Arrays.stream(values).filter(java.util.Objects::nonNull).max(Double::compareTo).orElse(null);
    }

    private static Double combine(double[] weights, Double... values) {
        double total = 0;
        double available = 0;
        for (int i = 0; i < weights.length; i++) {
            if (values[i] != null) {
                total += weights[i] * values[i];
                available += weights[i];
            }
        }
        return available == 0 ? null : Math.round(10 * total / available) / 10.0;
    }

    private static double[] parse(String values, int count) {
        double[] result = Arrays.stream(values.split(",")).mapToDouble(Double::parseDouble).toArray();
        if (result.length != count || Arrays.stream(result).anyMatch(n -> !Double.isFinite(n) || n <= 0 || n > 100)) {
            throw new IllegalArgumentException("Invalid severity weights or thresholds");
        }
        return result;
    }
}
