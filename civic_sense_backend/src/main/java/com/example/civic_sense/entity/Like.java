package com.example.civic_sense.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "complaint_likes",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {"user_id", "complaint_id"}
                )
        }
)
public class Like {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User who liked the complaint
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Complaint that was liked
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;


    // =========================
    // Constructors
    // =========================

    public Like() {
    }

    public Like(User user, Complaint complaint) {
        this.user = user;
        this.complaint = complaint;
    }


    // =========================
    // Getters and Setters
    // =========================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Complaint getComplaint() {
        return complaint;
    }

    public void setComplaint(Complaint complaint) {
        this.complaint = complaint;
    }
}