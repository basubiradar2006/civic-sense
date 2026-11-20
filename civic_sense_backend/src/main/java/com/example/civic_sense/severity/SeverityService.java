package com.example.civic_sense.severity;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.realtime.RealtimeService;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.LikeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Applies the severity model to complaints and keeps
 * merged child reports in sync with their master.
 */
@Service
public class SeverityService implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(SeverityService.class);

    private final ComplaintRepository complaintRepository;
    private final LikeRepository likeRepository;
    private final LocationContextService locationContextService;
    private final RealtimeService realtimeService;

    // Map lookups run in the background so submissions stay fast
    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "severity-analysis");
        t.setDaemon(true);
        return t;
    });

    public SeverityService(
            ComplaintRepository complaintRepository,
            LikeRepository likeRepository,
            LocationContextService locationContextService,
            RealtimeService realtimeService) {

        this.complaintRepository = complaintRepository;
        this.likeRepository = likeRepository;
        this.locationContextService = locationContextService;
        this.realtimeService = realtimeService;
    }

    // =====================================================
    // QUICK SCORE (used while saving a new complaint)
    // =====================================================

    public void applyQuick(Complaint complaint) {
        apply(complaint, locationContextService.quick(complaint));
    }

    // =====================================================
    // RE-SCORE WITH STORED LOCATION FACTORS
    // (after likes, merges, status changes, SLA ticks)
    // =====================================================

    public void recompute(Complaint complaint) {

        LocationContext location;

        if (complaint.getTrafficFactor() != null && complaint.getUsageFactor() != null) {
            location = new LocationContext(
                    complaint.getTrafficFactor(),
                    complaint.getUsageFactor(),
                    complaint.getRoadType(),
                    complaint.getLocationContext(),
                    false);
        } else {
            location = locationContextService.quick(complaint);
        }

        apply(complaint, location);
    }

    /** Recompute, save, sync children and notify dashboards. */
    public Complaint recomputeAndPublish(Complaint complaint) {
        Complaint master = master(complaint);
        recompute(master);
        Complaint saved = complaintRepository.save(master);
        syncChildren(saved);
        realtimeService.publish("SEVERITY", saved);
        return saved;
    }

    // =====================================================
    // FULL ANALYSIS (OpenStreetMap) IN THE BACKGROUND
    // =====================================================

    public void refreshAsync(Long complaintId) {
        executor.submit(() -> {
            try {
                Complaint snapshot = complaintRepository.findById(complaintId).orElse(null);
                if (snapshot == null) {
                    return;
                }

                // Slow part (network) first ...
                LocationContext location = locationContextService.full(master(snapshot));

                // ... then reload so we don't overwrite a status change
                // that happened while we were waiting for the map data.
                Complaint fresh = master(complaintRepository.findById(complaintId).orElse(snapshot));
                apply(fresh, location);

                Complaint saved = complaintRepository.save(fresh);
                syncChildren(saved);
                realtimeService.publish("SEVERITY", saved);

            } catch (Exception e) {
                log.warn("Severity analysis failed for complaint {}: {}", complaintId, e.getMessage());
            }
        });
    }

    // =====================================================
    // CORE
    // =====================================================

    private void apply(Complaint complaint, LocationContext location) {

        long likes = complaint.getId() == null
                ? 0
                : likeRepository.countByComplaint(complaint);

        SeverityResult result = SeverityCalculator.calculate(
                complaint.getCategory(),
                location,
                complaint.getReportCount(),
                likes,
                complaint.getStatus(),
                complaint.getCreatedAt(),
                complaint.getDueAt(),
                complaint.isEscalated(),
                LocalDateTime.now());

        complaint.setSeverityScore(result.score());
        complaint.setSeverityLevel(result.level());
        complaint.setCategoryFactor(result.categoryFactor());
        complaint.setTrafficFactor(result.trafficFactor());
        complaint.setUsageFactor(result.usageFactor());
        complaint.setCommunityFactor(result.communityFactor());
        complaint.setSlaFactor(result.slaFactor());
        complaint.setRoadType(location.roadType());
        complaint.setLocationContext(location.description());
        complaint.setSeverityUpdatedAt(LocalDateTime.now());

        // Keep the old "priority" column meaningful for existing screens
        complaint.setPriority(result.level());
    }

    /** Copy the master's live state onto every merged child report. */
    public void syncChildren(Complaint master) {

        if (master.getId() == null) {
            return;
        }

        List<Complaint> children = complaintRepository.findByMergedIntoIdOrderByIdAsc(master.getId());

        if (children.isEmpty()) {
            return;
        }

        for (Complaint child : children) {
            child.setStatus(master.getStatus());
            child.setContractor(master.getContractor());
            child.setReportCount(master.getReportCount());
            child.setSeverityScore(master.getSeverityScore());
            child.setSeverityLevel(master.getSeverityLevel());
            child.setPriority(master.getPriority());
            child.setEscalated(master.isEscalated());
        }

        complaintRepository.saveAll(children);
    }

    private Complaint master(Complaint complaint) {
        if (complaint.getMergedIntoId() == null) {
            return complaint;
        }
        return complaintRepository.findById(complaint.getMergedIntoId()).orElse(complaint);
    }

    @Override
    public void destroy() {
        executor.shutdownNow();
    }
}
