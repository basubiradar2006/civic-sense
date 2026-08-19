package com.example.civic_sense.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String category;

    @Column(length = 1000)
    private String description;

    // GPS location
    private Double latitude;

    private Double longitude;

    // GPS accuracy in meters
    private Double accuracy;

    // Human-readable location
    @Column(length = 500)
    private String address;

    // Image / video URL
    private String mediaUrl;

    // IMAGE / VIDEO
    private String mediaType;

    // PENDING / ACCEPTED / IN_PROGRESS / SOLVED
    private String status;

    // LOW / MEDIUM / HIGH
    private String priority;

    // Time when evidence was captured
    private String capturedAt;

    // =====================================================
    // CITIZEN WHO CREATED THE COMPLAINT
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // =====================================================
    // CONTRACTOR ASSIGNED TO THE COMPLAINT
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "contractor_id")
    private User contractor;

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public Complaint() {
    }

    // =====================================================
    // GETTERS AND SETTERS
    // =====================================================

    public Long getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getAccuracy() {
        return accuracy;
    }

    public void setAccuracy(Double accuracy) {
        this.accuracy = accuracy;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(String capturedAt) {
        this.capturedAt = capturedAt;
    }

    // =====================================================
    // CITIZEN
    // =====================================================

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    // =====================================================
    // CONTRACTOR
    // =====================================================

    public User getContractor() {
        return contractor;
    }

    public void setContractor(User contractor) {
        this.contractor = contractor;
    }
}