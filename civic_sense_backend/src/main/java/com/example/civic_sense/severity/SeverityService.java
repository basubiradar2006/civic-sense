package com.example.civic_sense.severity;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.realtime.RealtimeService;
import com.example.civic_sense.repository.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ConcurrentHashMap;

/** Applies severity without affecting complaint ownership or workflow status. */
@Service
public class SeverityService implements DisposableBean {
    private static final Logger log = LoggerFactory.getLogger(SeverityService.class);
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private final ComplaintRepository complaintRepository;
    private final RealtimeService realtimeService;
    private final VehicleCount vehicleCount;
    private final RoadIndex roads;
    private final SeverityRules rules;
    private final ConcurrentHashMap<String, RoadVolume> roadVolumes = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "severity-analysis");
        thread.setDaemon(true);
        return thread;
    });

    public SeverityService(ComplaintRepository complaintRepository, RealtimeService realtimeService,
                           VehicleCount vehicleCount, RoadIndex roads, SeverityRules rules) {
        this.complaintRepository = complaintRepository;
        this.realtimeService = realtimeService;
        this.vehicleCount = vehicleCount;
        this.roads = roads;
        this.rules = rules;
    }

    public void recompute(Complaint complaint) {
        try {
            apply(complaint);
        } catch (RuntimeException e) {
            log.warn("Severity assessment failed for complaint {}", complaint.getId(), e);
            complaint.setSeverityAssessment(SeverityAssessment.pending());
            // Preserve the last operational priority if a reassessment fails.
        }
    }

    @Transactional
    public Complaint recomputeAndPublish(Complaint complaint) {
        return persist(master(complaint), "SEVERITY");
    }

    public void refreshAsync(Long complaintId) {
        executor.submit(() -> {
            try {
                roads.reload();
                complaintRepository.findById(complaintId).ifPresent(this::recomputeAndPublish);
            } catch (RuntimeException e) {
                log.warn("Could not save refreshed severity for complaint {}", complaintId, e);
            }
        });
    }

    public List<RoadIndex.Candidate> candidates(Complaint complaint) {
        return roads.candidates(complaint.getLatitude(), complaint.getLongitude());
    }

    public SeverityReview.Options reviewOptions(Complaint complaint) {
        var history = complaint.getSeverityReviews();
        var last = history.isEmpty() ? null : history.get(history.size() - 1);
        return new SeverityReview.Options(candidates(complaint), last == null ? null : last.roadId(),
                last == null ? null : last.priority());
    }

    @Transactional
    public Complaint review(Complaint complaint, SeverityReview.Request request, Long officerId) {
        String reason = request.reason() == null ? "" : request.reason().strip();
        String priority = request.priority() == null || request.priority().isBlank() ? null : request.priority();
        String roadId = request.roadId() == null || request.roadId().isBlank() ? null : request.roadId();
        if (reason.isBlank() || reason.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a review reason of 1 to 500 characters");
        }
        if (priority != null && !PRIORITIES.contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown priority");
        }
        if (roadId != null && !"UNMATCHED".equals(roadId)
                && candidates(complaint).stream().noneMatch(candidate -> candidate.road().id().equals(roadId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a nearby road from the current road index");
        }

        List<SeverityReview> history = new ArrayList<>(complaint.getSeverityReviews());
        history.add(new SeverityReview(officerId, LocalDateTime.now().toString(), reason, request.evidence(), roadId,
                priority, complaint.getHazardEvidence(), complaint.getPriority()));
        complaint.setHazardEvidence(request.evidence());
        complaint.setSeverityReviews(history);
        return persist(complaint, "SEVERITY");
    }

    /** Promote a credible emergency from a second report even when the master was reviewed. */
    public void considerDuplicateEvidence(Complaint master, Complaint report) {
        HazardEvidence evidence = report.getHazardEvidence();
        var assessment = rules.assess(report.getCategory(), evidence, new RoadIndex.Match("UNASSESSED", null),
                null, null, null, false, false, null);
        if (assessment.emergencyRule() != null && Objects.equals(master.getCategory(), report.getCategory())) {
            master.setHazardEvidence(evidence);
        }
    }

    private Complaint persist(Complaint complaint, String event) {
        recompute(complaint);
        Complaint saved = complaintRepository.save(complaint);
        syncChildren(saved);
        realtimeService.publish(event, saved);
        return saved;
    }

    private void apply(Complaint complaint) {
        LocalDateTime now = LocalDateTime.now();
        var reviews = complaint.getSeverityReviews();
        var lastReview = reviews.isEmpty() ? null : reviews.get(reviews.size() - 1);
        boolean reviewed = lastReview != null && Objects.equals(lastReview.evidence(), complaint.getHazardEvidence());
        String roadOverride = lastReview == null ? null : lastReview.roadId();
        var match = roads.match(complaint.getLatitude(), complaint.getLongitude(), complaint.getAccuracy(), roadOverride);
        var road = match.road();
        var survey = road == null ? Optional.<VehicleCount.MonthlyVolume>empty()
                : volumeFor(road, YearMonth.from(now).minusMonths(1));
        Double traffic = survey.map(volume -> 100 * vehicleCount.trafficFactor(volume))
                .orElse(road == null ? null : road.trafficExposure());
        String trafficSource = survey.map(volume -> volume.aadtYear() == null
                        ? "Recorded vehicle count" : "Estimated from survey AADT")
                .orElse(road == null ? null : road.trafficSource());
        var result = rules.assess(complaint.getCategory(), complaint.getHazardEvidence(), match, road, traffic,
                trafficSource, complaint.isEscalated() && !SeverityCalculator.isClosed(complaint.getStatus()),
                reviewed && !"CORRECTION_UNAVAILABLE".equals(match.status()), reviewed ? lastReview.priority() : null);

        complaint.setSeverityAssessment(result);
        complaint.setSeverityScore(result.score());
        complaint.setSeverityLevel(result.priority());
        complaint.setPriority(result.priority());
        complaint.setRoadType(result.roadClass());
        complaint.setTrafficFactor(traffic == null ? null : traffic / 100);
        complaint.setVehicleCountSummary(survey.map(VehicleCount.MonthlyVolume::description).orElse(null));
        complaint.setSeverityUpdatedAt(now);
    }

    private Optional<VehicleCount.MonthlyVolume> volumeFor(RoadIndex.Road road, YearMonth month) {
        return roadVolumes.compute(road.id(), (id, previous) -> {
            if (previous != null && previous.month().equals(month) && previous.road().equals(road)) {
                return previous;
            }
            return new RoadVolume(road, month, vehicleCount.monthlyVolume((road.lat1() + road.lat2()) / 2,
                    (road.lon1() + road.lon2()) / 2, null, month));
        }).volume();
    }

    private record RoadVolume(RoadIndex.Road road, YearMonth month, Optional<VehicleCount.MonthlyVolume> volume) {}

    public void syncChildren(Complaint master) {
        if (master.getId() == null) return;
        List<Complaint> children = complaintRepository.findByMergedIntoIdOrderByIdAsc(master.getId());
        for (Complaint child : children) {
            child.setStatus(master.getStatus());
            child.setContractor(master.getContractor());
            child.setReportCount(master.getReportCount());
            child.setSeverityScore(master.getSeverityScore());
            child.setSeverityLevel(master.getSeverityLevel());
            child.setSeverityAssessment(master.getSeverityAssessment());
            child.setVehicleCountSummary(master.getVehicleCountSummary());
            child.setPriority(master.getPriority());
            child.setEscalated(master.isEscalated());
        }
        if (!children.isEmpty()) complaintRepository.saveAll(children);
    }

    private Complaint master(Complaint complaint) {
        return complaint.getMergedIntoId() == null ? complaint
                : complaintRepository.findById(complaint.getMergedIntoId()).orElse(complaint);
    }

    @Override
    public void destroy() {
        executor.shutdownNow();
    }
}
