package com.example.civic_sense.repository;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.Like;
import com.example.civic_sense.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface LikeRepository extends JpaRepository<Like, Long> {

    // =====================================================
    // CHECK IF USER ALREADY LIKED A COMPLAINT
    // =====================================================

    boolean existsByUserAndComplaint(
            User user,
            Complaint complaint
    );


    // =====================================================
    // COUNT LIKES FOR ONE COMPLAINT
    // =====================================================

    long countByComplaint(
            Complaint complaint
    );


    // =====================================================
    // DELETE USER'S LIKE
    // =====================================================

    @Modifying
    @Transactional
    @Query("""
        DELETE FROM Like l
        WHERE l.user = :user
        AND l.complaint = :complaint
    """)
    void deleteByUserAndComplaint(
            @Param("user") User user,
            @Param("complaint") Complaint complaint
    );


    // =====================================================
    // GET LIKE COUNTS FOR MULTIPLE COMPLAINTS
    // =====================================================

    @Query("""
        SELECT l.complaint.id, COUNT(l)
        FROM Like l
        WHERE l.complaint.id IN :complaintIds
        GROUP BY l.complaint.id
    """)
    List<Object[]> countLikesForComplaints(
            @Param("complaintIds")
            List<Long> complaintIds
    );


    // =====================================================
    // GET COMPLAINTS LIKED BY CURRENT USER
    // =====================================================

    @Query("""
        SELECT l.complaint.id
        FROM Like l
        WHERE l.user.id = :userId
        AND l.complaint.id IN :complaintIds
    """)
    List<Long> findLikedComplaintIds(
            @Param("userId")
            Long userId,

            @Param("complaintIds")
            List<Long> complaintIds
    );
}