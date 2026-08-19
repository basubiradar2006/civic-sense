package com.example.civic_sense.repository;

import com.example.civic_sense.entity.Like;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<Like, Long> {

    // Check whether a user has already liked a complaint
    boolean existsByUserAndComplaint(User user, Complaint complaint);

    // Count total likes on a complaint
    long countByComplaint(Complaint complaint);

    // Remove a user's like from a complaint
    void deleteByUserAndComplaint(User user, Complaint complaint);
}