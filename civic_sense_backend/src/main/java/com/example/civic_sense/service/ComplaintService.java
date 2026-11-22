package com.example.civic_sense.service;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.realtime.RealtimeService;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.UserRepository;
import com.example.civic_sense.severity.GeoUtils;
import com.example.civic_sense.severity.SeverityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Complaint lifecycle:
 *
 *   PENDING -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> RESOLVED
 *
 * plus automatic duplicate merging: a new report with the same
 * category within a few metres of an open complaint is stored as
 * a child report of that complaint (mergedIntoId) and the master's
 * reportCount goes up. Officers work on the master only; every
 * status change is mirrored onto the children so each citizen
 * sees progress on their own report.
 */
@Service
public class ComplaintService {

    public static final String SUBMISSION_NEW = "NEW";
    public static final String SUBMISSION_MERGED = "MERGED";
    public static final String SUBMISSION_ALREADY_REPORTED = "ALREADY_REPORTED";

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final ComplaintSlaService slaService;
    private final SeverityService severityService;
    private final RealtimeService realtimeService;

    private final double duplicateRadiusMeters;
    private final double maxDuplicateRadiusMeters;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            ComplaintSlaService slaService,
            SeverityService severityService,
            RealtimeService realtimeService,
            @Value("${civic.dedup.radius-meters:35}") double duplicateRadiusMeters,
            @Value("${civic.dedup.max-radius-meters:75}") double maxDuplicateRadiusMeters) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.slaService = slaService;
        this.severityService = severityService;
        this.realtimeService = realtimeService;
        this.duplicateRadiusMeters = duplicateRadiusMeters;
        this.maxDuplicateRadiusMeters = maxDuplicateRadiusMeters;
    }

    // =====================================================
    // CREATE (with duplicate detection)
    // =====================================================

    @Transactional
    public Complaint create(Complaint input, User citizen) {

        LocalDateTime now = LocalDateTime.now();

        // Never trust server-managed fields coming from the browser
        input.setUser(citizen);
        input.setStatus("PENDING");
        input.setCreatedAt(now);
        input.setDueAt(now.plusDays(slaService.getResolutionDays(input.getCategory())));
        input.setEscalated(false);
        input.setEscalatedAt(null);
        input.setContractor(null);
        input.setMergedIntoId(null);
        input.setReportCount(1);
        input.setLastReportedAt(now);
        input.setTrafficFactor(null);
        input.setEstimatedTrafficFactor(null);
        input.setVehicleCountSummary(null);
        input.setUsageFactor(null);
        input.setSeverityScore(null);
        input.setSeverityLevel(null);
        input.setPriority(null);
        input.setSeverityAssessment(null);
        input.setSeverityReviews(null);

        Complaint master = findDuplicate(input);

        // ---------------------------------------------
        // DUPLICATE OF AN OPEN ISSUE
        // ---------------------------------------------
        if (master != null) {

            // Same citizen reporting the same thing again: don't inflate the count
            if (hasAlreadyReported(master, citizen)) {
                master.setSubmissionResult(SUBMISSION_ALREADY_REPORTED);
                return master;
            }

            input.setMergedIntoId(master.getId());
            input.setStatus(master.getStatus());
            input.setContractor(master.getContractor());
            input.setDueAt(master.getDueAt());

            Complaint child = complaintRepository.save(input);

            master.setReportCount(master.getReportCount() + 1);
            master.setLastReportedAt(now);
            severityService.considerDuplicateEvidence(master, input);

            Complaint savedMaster = severityService.recomputeAndPublish(master);

            // recomputeAndPublish synced the children, re-read this one
            child = complaintRepository.findById(child.getId()).orElse(child);
            child.setSubmissionResult(SUBMISSION_MERGED);

            realtimeService.publish("MERGED", savedMaster);
            realtimeService.publish("CREATED", child);

            return child;
        }

        // ---------------------------------------------
        // NEW ISSUE
        // ---------------------------------------------
        severityService.recompute(input);

        Complaint saved = complaintRepository.save(input);
        saved.setSubmissionResult(SUBMISSION_NEW);

        realtimeService.publish("CREATED", saved);

        return saved;
    }

    /** Nearest open complaint of the same category within the merge radius. */
    public Complaint findDuplicate(Complaint input) {

        if (input.getLatitude() == null
                || input.getLongitude() == null
                || input.getCategory() == null) {
            return null;
        }

        double accuracy = input.getAccuracy() == null ? 0 : input.getAccuracy();
        double radius = Math.max(duplicateRadiusMeters, Math.min(accuracy, maxDuplicateRadiusMeters));

        double lat = input.getLatitude();
        double lon = input.getLongitude();
        double dLat = GeoUtils.latDelta(radius);
        double dLon = GeoUtils.lonDelta(radius, lat);

        List<Complaint> candidates = complaintRepository.findOpenDuplicateCandidates(
                input.getCategory(),
                lat - dLat, lat + dLat,
                lon - dLon, lon + dLon);

        return candidates.stream()
                .filter(c -> !Objects.equals(c.getId(), input.getId()))
                .filter(c -> GeoUtils.distanceMeters(lat, lon, c.getLatitude(), c.getLongitude()) <= radius)
                .min(Comparator.comparingDouble(
                        c -> GeoUtils.distanceMeters(lat, lon, c.getLatitude(), c.getLongitude())))
                .orElse(null);
    }

    private boolean hasAlreadyReported(Complaint master, User citizen) {
        return (master.getUser() != null && Objects.equals(master.getUser().getId(), citizen.getId()))
                || complaintRepository.existsByMergedIntoIdAndUser(master.getId(), citizen);
    }

    // =====================================================
    // MANUAL MERGE (officer marks a duplicate)
    // =====================================================

    @Transactional
    public Complaint merge(Long duplicateId, Long masterId) {

        if (Objects.equals(duplicateId, masterId)) {
            throw new RuntimeException("A complaint cannot be merged into itself");
        }

        Complaint duplicate = get(duplicateId);
        Complaint master = masterOf(get(masterId));

        if (duplicate.getMergedIntoId() != null) {
            throw new RuntimeException("Complaint #" + duplicateId + " is already merged");
        }
        if (Objects.equals(duplicate.getId(), master.getId())) {
            throw new RuntimeException("Complaint #" + duplicateId + " is already the master");
        }

        // Re-point the duplicate's own children to the new master
        List<Complaint> grandChildren = complaintRepository.findByMergedIntoIdOrderByIdAsc(duplicate.getId());
        for (Complaint gc : grandChildren) {
            gc.setMergedIntoId(master.getId());
        }
        complaintRepository.saveAll(grandChildren);

        duplicate.setMergedIntoId(master.getId());
        complaintRepository.save(duplicate);

        master.setReportCount(master.getReportCount() + duplicate.getReportCount());
        master.setLastReportedAt(LocalDateTime.now());
        severityService.considerDuplicateEvidence(master, duplicate);

        Complaint saved = severityService.recomputeAndPublish(master);
        realtimeService.publish("MERGED", saved);

        return saved;
    }

    // =====================================================
    // STATUS TRANSITIONS
    // =====================================================

    public Complaint verify(Long id) {
        Complaint c = masterOf(get(id));
        requireStatus(c, "PENDING", "verified");
        c.setStatus("VERIFIED");
        return saveAndPublish(c);
    }

    public Complaint assign(Long id, Long contractorId) {
        Complaint c = masterOf(get(id));

        User contractor = userRepository.findById(contractorId)
                .orElseThrow(() -> new RuntimeException("Contractor not found"));

        if (contractor.getRole() != Role.CONTRACTOR) {
            throw new RuntimeException("Selected user is not a contractor");
        }

        // Allow re-assigning while still ASSIGNED (e.g. contractor unavailable)
        if (!"VERIFIED".equals(c.getStatus()) && !"ASSIGNED".equals(c.getStatus())) {
            throw new RuntimeException("Only VERIFIED complaints can be assigned");
        }

        c.setContractor(contractor);
        c.setStatus("ASSIGNED");
        return saveAndPublish(c);
    }

    public Complaint start(Long id, User contractor) {
        Complaint c = masterOf(get(id));
        requireAssignedTo(c, contractor);
        requireStatus(c, "ASSIGNED", "started");
        c.setStatus("IN_PROGRESS");
        return saveAndPublish(c);
    }

    public Complaint complete(Long id, User contractor) {
        Complaint c = masterOf(get(id));
        requireAssignedTo(c, contractor);
        requireStatus(c, "IN_PROGRESS", "completed");
        c.setStatus("COMPLETED");
        return saveAndPublish(c);
    }

    public Complaint resolve(Long id) {
        Complaint c = masterOf(get(id));
        requireStatus(c, "COMPLETED", "resolved");
        c.setStatus("RESOLVED");
        return saveAndPublish(c);
    }

    /** Officer sends completed work back to the contractor. */
    public Complaint reopen(Long id) {
        Complaint c = masterOf(get(id));
        requireStatus(c, "COMPLETED", "reopened");
        c.setStatus("IN_PROGRESS");
        return saveAndPublish(c);
    }

    // =====================================================
    // SLA ESCALATION (called by the scheduler)
    // =====================================================

    public void escalateOverdue() {
        LocalDateTime now = LocalDateTime.now();

        for (Complaint c : openMasters()) {
            boolean overdue = c.getDueAt() != null && now.isAfter(c.getDueAt());

            if (overdue && !c.isEscalated()) {
                c.setEscalated(true);
                c.setEscalatedAt(now);
                severityService.recompute(c);
                Complaint saved = complaintRepository.save(c);
                severityService.syncChildren(saved);
                realtimeService.publish("ESCALATED", saved);
            }
        }
    }

    /** Re-score every open complaint (SLA factor changes with time). */
    public int recomputeAllOpen() {
        List<Complaint> open = openMasters();
        for (Complaint c : open) {
            var before = c.getSeverityAssessment();
            String previousVehicleCount = c.getVehicleCountSummary();

            severityService.recompute(c);
            if (!Objects.equals(before, c.getSeverityAssessment())
                    || !Objects.equals(previousVehicleCount, c.getVehicleCountSummary())) {
                Complaint saved;
                try {
                    saved = complaintRepository.save(c);
                } catch (org.springframework.dao.OptimisticLockingFailureException changed) {
                    continue; // The existing periodic job will apply the newer evidence on its next pass.
                }
                severityService.syncChildren(saved);
                realtimeService.publish("SEVERITY", saved);
            }
        }
        return open.size();
    }

    public List<Complaint> openMasters() {
        return complaintRepository.findByMergedIntoIdIsNullAndStatusNotIn(List.of("COMPLETED", "RESOLVED"));
    }

    // =====================================================
    // HELPERS
    // =====================================================

    public Complaint get(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
    }

    public Complaint masterOf(Complaint complaint) {
        if (complaint.getMergedIntoId() == null) {
            return complaint;
        }
        return get(complaint.getMergedIntoId());
    }

    private Complaint saveAndPublish(Complaint c) {
        severityService.recompute(c);
        Complaint saved = complaintRepository.save(c);
        severityService.syncChildren(saved);
        realtimeService.publish("UPDATED", saved);
        return saved;
    }

    private static void requireStatus(Complaint c, String expected, String action) {
        if (!expected.equals(c.getStatus())) {
            throw new RuntimeException(
                    "Only " + expected + " complaints can be " + action
                            + " (current status: " + c.getStatus() + ")");
        }
    }

    private static void requireAssignedTo(Complaint c, User contractor) {
        if (c.getContractor() == null || !Objects.equals(c.getContractor().getId(), contractor.getId())) {
            throw new RuntimeException("This complaint is not assigned to you");
        }
    }
}
