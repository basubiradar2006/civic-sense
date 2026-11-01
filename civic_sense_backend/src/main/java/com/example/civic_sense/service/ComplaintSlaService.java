package com.example.civic_sense.service;

import org.springframework.stereotype.Service;

@Service
public class ComplaintSlaService {

    // =====================================================
    // PRIORITY BASED ON CATEGORY
    // =====================================================

    public String getPriority(String category) {

        if (category == null) {
            return "LOW";
        }

        return switch (category) {

            case "Water Leakage" ->
                    "CRITICAL";

            case "Road Damage",
                 "Garbage",
                 "Drainage",
                 "Illegal Dumping" ->
                    "HIGH";

            case "Street Light",
                 "Public Property Damage" ->
                    "MEDIUM";

            case "Other" ->
                    "LOW";

            default ->
                    "LOW";
        };
    }


    // =====================================================
    // RESOLUTION SLA IN DAYS
    // =====================================================

    public int getResolutionDays(String category) {

        if (category == null) {
            return 7;
        }

        return switch (category) {

            // Critical
            case "Water Leakage" ->
                    1;

            // High
            case "Garbage" ->
                    2;

            case "Drainage" ->
                    3;

            case "Illegal Dumping" ->
                    3;

            // Road work requires more time
            case "Road Damage" ->
                    10;

            // Medium
            case "Street Light" ->
                    3;

            case "Public Property Damage" ->
                    7;

            // Low
            case "Other" ->
                    7;

            default ->
                    7;
        };
    }
}