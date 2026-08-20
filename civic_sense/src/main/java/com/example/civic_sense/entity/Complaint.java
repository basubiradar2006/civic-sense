package com.example.civic_sense.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // COMPLAINT DETAILS
    // =====================================================

    private String category;

    @Column(length = 1000)
    private String description;

    // =====================================================
    // GPS LOCATION
    // =====================================================

    private Double latitude;

    private Double longitude;

    // GPS accuracy in meters
    private Double accuracy;

    // Human-readable location
    @Column(length = 500)
    private String address;

    // =====================================================
    // MEDIA
    // =====================================================

    // Image / video URL
    private String mediaUrl;

    // IMAGE / VIDEO
    private String mediaType;

    // =====================================================
    // COMPLAINT STATUS
    // =====================================================

    // PENDING / ACCEPTED / IN_PROGRESS / SOLVED / ESCALATED
    private String status;

    // LOW / MEDIUM / HIGH / CRITICAL
    private String priority;

    // =====================================================
    // SLA / ESCALATION
    // =====================================================

    // When complaint was submitted
    private LocalDateTime createdAt;

    // Deadline for resolving the complaint
    private LocalDateTime dueAt;

    // Whether SLA has been breached
    private boolean escalated = false;

    // When the complaint was escalated
    private LocalDateTime escalatedAt;

    // =====================================================
    // EVIDENCE CAPTURE TIME
    // =====================================================

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
    // LIKE INFORMATION
    // =====================================================

    @Transient
    private long likeCount;

    @Transient
    private boolean liked;

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

    // -----------------------------------------------------
    // CATEGORY
    // -----------------------------------------------------

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    // -----------------------------------------------------
    // DESCRIPTION
    // -----------------------------------------------------

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    // -----------------------------------------------------
    // LATITUDE
    // -----------------------------------------------------

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    // -----------------------------------------------------
    // LONGITUDE
    // -----------------------------------------------------

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    // -----------------------------------------------------
    // ACCURACY
    // -----------------------------------------------------

    public Double getAccuracy() {
        return accuracy;
    }

    public void setAccuracy(Double accuracy) {
        this.accuracy = accuracy;
    }

    // -----------------------------------------------------
    // ADDRESS
    // -----------------------------------------------------

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    // -----------------------------------------------------
    // MEDIA URL
    // -----------------------------------------------------

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    // -----------------------------------------------------
    // MEDIA TYPE
    // -----------------------------------------------------

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    // -----------------------------------------------------
    // STATUS
    // -----------------------------------------------------

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // -----------------------------------------------------
    // PRIORITY
    // -----------------------------------------------------

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    // -----------------------------------------------------
    // CAPTURED AT
    // -----------------------------------------------------

    public String getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(String capturedAt) {
        this.capturedAt = capturedAt;
    }

    // =====================================================
    // SLA
    // =====================================================

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDateTime dueAt) {
        this.dueAt = dueAt;
    }

    // =====================================================
    // ESCALATION
    // =====================================================

    public boolean isEscalated() {
        return escalated;
    }

    public void setEscalated(boolean escalated) {
        this.escalated = escalated;
    }

    public LocalDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(LocalDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
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

    // =====================================================
    // LIKE COUNT
    // =====================================================

    public long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(long likeCount) {
        this.likeCount = likeCount;
    }

    // =====================================================
    // LIKED
    // =====================================================

    public boolean isLiked() {
        return liked;
    }

    public void setLiked(boolean liked) {
        this.liked = liked;
    }
}