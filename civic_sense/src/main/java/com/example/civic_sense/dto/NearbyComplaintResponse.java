package com.example.civic_sense.dto;

public class NearbyComplaintResponse {

    private Long id;
    private String category;
    private String description;
    private Double latitude;
    private Double longitude;
    private String address;
    private String mediaUrl;
    private String mediaType;
    private String status;
    private String priority;
    private String capturedAt;

    private Double distance;
    private long likeCount;
    private boolean liked;

    public NearbyComplaintResponse() {
    }

    public NearbyComplaintResponse(
            Long id,
            String category,
            String description,
            Double latitude,
            Double longitude,
            String address,
            String mediaUrl,
            String mediaType,
            String status,
            String priority,
            String capturedAt,
            Double distance,
            long likeCount,
            boolean liked
    ) {
        this.id = id;
        this.category = category;
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.mediaUrl = mediaUrl;
        this.mediaType = mediaType;
        this.status = status;
        this.priority = priority;
        this.capturedAt = capturedAt;
        this.distance = distance;
        this.likeCount = likeCount;
        this.liked = liked;
    }

    public Long getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getAddress() {
        return address;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public String getMediaType() {
        return mediaType;
    }

    public String getStatus() {
        return status;
    }

    public String getPriority() {
        return priority;
    }

    public String getCapturedAt() {
        return capturedAt;
    }

    public Double getDistance() {
        return distance;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public boolean isLiked() {
        return liked;
    }
}