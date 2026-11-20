package com.example.civic_sense.repository;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long> {

    // Complaints created by a citizen (includes merged child reports)
    List<Complaint> findByUser(User user);

    List<Complaint> findByUserOrderByIdDesc(User user);

    // Complaints assigned to a contractor
    List<Complaint> findByContractor(User contractor);

    List<Complaint> findByContractorAndMergedIntoIdIsNull(User contractor);

    List<Complaint> findTop10ByOrderByIdDesc();

    // =====================================================
    // MASTER COMPLAINTS ONLY (duplicates are hidden)
    // =====================================================

    List<Complaint> findByMergedIntoIdIsNull();

    List<Complaint> findTop20ByMergedIntoIdIsNullOrderByIdDesc();

    List<Complaint> findByMergedIntoIdIsNullAndStatusNotIn(
            Collection<String> statuses
    );

    // Child reports merged into a master complaint
    List<Complaint> findByMergedIntoIdOrderByIdAsc(Long mergedIntoId);

    boolean existsByMergedIntoIdAndUser(Long mergedIntoId, User user);

    // =====================================================
    // DUPLICATE DETECTION
    // Open master complaints of the same category inside a
    // small bounding box. The exact distance check
    // (Haversine) happens in Java afterwards.
    // =====================================================

    @Query("""
        SELECT c FROM Complaint c
        WHERE c.mergedIntoId IS NULL
          AND LOWER(c.category) = LOWER(:category)
          AND (c.status IS NULL OR c.status NOT IN ('COMPLETED', 'RESOLVED'))
          AND c.latitude BETWEEN :minLat AND :maxLat
          AND c.longitude BETWEEN :minLon AND :maxLon
    """)
    List<Complaint> findOpenDuplicateCandidates(
            @Param("category") String category,
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLon") double minLon,
            @Param("maxLon") double maxLon
    );

    // =====================================================
    // AREA ACTIVITY (used as a "usage" signal)
    // Number of distinct issues reported around a point.
    // =====================================================

    @Query("""
        SELECT COUNT(c) FROM Complaint c
        WHERE c.mergedIntoId IS NULL
          AND c.latitude BETWEEN :minLat AND :maxLat
          AND c.longitude BETWEEN :minLon AND :maxLon
          AND c.createdAt >= :since
    """)
    long countIssuesInArea(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLon") double minLon,
            @Param("maxLon") double maxLon,
            @Param("since") LocalDateTime since
    );
}
