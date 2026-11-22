package com.example.civic_sense.controller;

import com.example.civic_sense.dto.NearbyComplaintResponse;
import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.entity.WorkPhoto;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.LikeRepository;
import com.example.civic_sense.repository.UserRepository;
import com.example.civic_sense.repository.WorkPhotoRepository;
import com.example.civic_sense.service.ComplaintService;
import com.example.civic_sense.severity.SeverityService;
import com.example.civic_sense.severity.SeverityReview;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Complaint REST API.
 *
 * Every write goes through {@link ComplaintService} which handles
 * duplicate merging, severity scoring and real-time broadcasting.
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final WorkPhotoRepository workPhotoRepository;
    private final ComplaintService complaintService;
    private final SeverityService severityService;

    public ComplaintController(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            LikeRepository likeRepository,
            WorkPhotoRepository workPhotoRepository,
            ComplaintService complaintService,
            SeverityService severityService) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.workPhotoRepository = workPhotoRepository;
        this.complaintService = complaintService;
        this.severityService = severityService;
    }

    // =====================================================
    // CREATE COMPLAINT
    // Duplicates (same category, same spot) are merged
    // automatically - see ComplaintService#create.
    // Response field "submissionResult": NEW | MERGED | ALREADY_REPORTED
    // =====================================================

    @PostMapping
    public Complaint createComplaint(
            @RequestBody Complaint complaint,
            Principal principal) {

        return complaintService.create(complaint, currentUser(principal));
    }

    // =====================================================
    // GET ALL COMPLAINTS (master complaints only,
    // highest severity first)
    // ?includeMerged=true also returns child reports
    // =====================================================

    @GetMapping
    public List<Complaint> getComplaints(
            @RequestParam(defaultValue = "false") boolean includeMerged,
            Principal principal) {

        List<Complaint> complaints = new ArrayList<>(
                includeMerged
                        ? complaintRepository.findAll()
                        : complaintRepository.findByMergedIntoIdIsNull());

        complaints.sort(BY_SEVERITY);

        addLikeInformation(complaints, currentUser(principal));

        return complaints;
    }

    // =====================================================
    // GET MY COMPLAINTS (including the ones merged
    // into somebody else's report)
    // =====================================================

    @GetMapping("/my")
    public List<Complaint> getMyComplaints(Principal principal) {

        User user = currentUser(principal);

        List<Complaint> complaints = complaintRepository.findByUserOrderByIdDesc(user);

        addLikeInformation(complaints, user);

        return complaints;
    }

    // =====================================================
    // GET CONTRACTOR ASSIGNED COMPLAINTS
    // =====================================================

    @GetMapping("/assigned")
    public List<Complaint> getAssignedComplaints(Principal principal) {

        List<Complaint> complaints = new ArrayList<>(
                complaintRepository.findByContractorAndMergedIntoIdIsNull(currentUser(principal)));

        complaints.sort(BY_SEVERITY);

        return complaints;
    }

    // =====================================================
    // GET RECENT COMPLAINTS (community feed)
    // =====================================================

    @GetMapping("/recent")
    public List<Complaint> getRecentComplaints(Principal principal) {

        List<Complaint> complaints = complaintRepository.findTop20ByMergedIntoIdIsNullOrderByIdDesc();

        addLikeInformation(complaints, currentUser(principal));

        return complaints;
    }

    // =====================================================
    // MERGED REPORTS OF A COMPLAINT
    // Who else reported the same issue
    // =====================================================

    @GetMapping("/{id}/reports")
    public List<Complaint> getMergedReports(@PathVariable Long id) {

        Complaint master = complaintService.masterOf(complaintService.get(id));

        List<Complaint> reports = new ArrayList<>();
        reports.add(master);
        reports.addAll(complaintRepository.findByMergedIntoIdOrderByIdAsc(master.getId()));

        return reports;
    }

    // =====================================================
    // SEVERITY
    // =====================================================

    // Re-run the full location analysis (OpenStreetMap)
    @PostMapping("/{id}/severity/refresh")
    public Map<String, Object> refreshSeverity(@PathVariable Long id, Principal principal) {

        requireOfficer(principal);
        Complaint master = complaintService.masterOf(complaintService.get(id));

        severityService.refreshAsync(master.getId());

        return Map.of(
                "message", "Severity analysis started",
                "complaintId", master.getId());
    }

    // Re-score every open complaint
    @PostMapping("/severity/recompute")
    public Map<String, Object> recomputeAll(Principal principal) {

        requireOfficer(principal);
        int count = complaintService.recomputeAllOpen();

        return Map.of(
                "message", "Severity recomputed",
                "complaints", count);
    }

    @GetMapping("/{id}/severity/roads")
    public SeverityReview.Options severityRoads(@PathVariable Long id, Principal principal) {
        requireOfficer(principal);
        return severityService.reviewOptions(complaintService.masterOf(complaintService.get(id)));
    }

    @PutMapping("/{id}/severity/review")
    public Complaint reviewSeverity(@PathVariable Long id, @RequestBody SeverityReview.Request request, Principal principal) {
        User officer = requireOfficer(principal);
        return severityService.review(complaintService.masterOf(complaintService.get(id)), request, officer.getId());
    }

    // =====================================================
    // MANUAL MERGE
    // PUT /api/complaints/{duplicateId}/merge/{masterId}
    // =====================================================

    @PutMapping("/{duplicateId}/merge/{masterId}")
    public Complaint mergeComplaint(
            @PathVariable Long duplicateId,
            @PathVariable Long masterId, Principal principal) {

        requireOfficer(principal);
        return complaintService.merge(duplicateId, masterId);
    }

    // =====================================================
    // GET NEARBY COMPLAINTS
    //
    // /api/complaints/nearby
    // ?latitude=12.9786
    // &longitude=77.364
    // &radius=5
    //
    // radius = kilometers
    // =====================================================

    @GetMapping("/nearby")
    public List<NearbyComplaintResponse> getNearbyComplaints(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5") double radius,
            Principal principal) {

        // =============================================
        // GET CURRENT USER
        // =============================================

        User currentUser = null;

        if (principal != null) {

            String email = principal.getName();

            currentUser = userRepository
                    .findByEmail(email)
                    .orElse(null);
        }

        // =============================================
        // GET ALL COMPLAINTS
        // =============================================

        List<Complaint> allComplaints =
                complaintRepository.findAll();

        List<NearbyComplaintResponse> nearbyComplaints =
                new ArrayList<>();

        // =============================================
        // CHECK EACH COMPLAINT
        // =============================================

        for (Complaint complaint : allComplaints) {

            // =========================================
            // SKIP COMPLAINTS WITHOUT GPS
            // =========================================

            if (complaint.getLatitude() == null ||
                    complaint.getLongitude() == null) {

                continue;
            }

            // Merged duplicates are shown through their master
            if (complaint.getMergedIntoId() != null) {

                continue;
            }

            // =========================================
            // CALCULATE DISTANCE
            // =========================================

            double distance = calculateDistance(
                    latitude,
                    longitude,
                    complaint.getLatitude(),
                    complaint.getLongitude()
            );

            // =========================================
            // CHECK RADIUS
            // =========================================

            if (distance <= radius) {

                // =====================================
                // LIKE COUNT
                // =====================================

                long likeCount =
                        likeRepository
                                .countByComplaint(
                                        complaint
                                );

                // =====================================
                // CHECK IF CURRENT USER LIKED
                // =====================================

                boolean liked = false;

                if (currentUser != null) {

                    liked =
                            likeRepository
                                    .existsByUserAndComplaint(
                                            currentUser,
                                            complaint
                                    );
                }

                // =====================================
                // CREATE DTO
                // =====================================

                NearbyComplaintResponse response =
                        new NearbyComplaintResponse(

                                complaint.getId(),

                                complaint.getCategory(),

                                complaint.getDescription(),

                                complaint.getLatitude(),

                                complaint.getLongitude(),

                                complaint.getAddress(),

                                complaint.getMediaUrl(),

                                complaint.getMediaType(),

                                complaint.getStatus(),

                                complaint.getPriority(),

                                complaint.getSeverityScore(),

                                complaint.getCapturedAt(),

                                distance,

                                likeCount,

                                liked
                        );

                nearbyComplaints.add(response);
            }
        }

        // =============================================
        // SORT NEAREST FIRST
        // =============================================

        nearbyComplaints.sort(
                (a, b) ->
                        Double.compare(
                                a.getDistance(),
                                b.getDistance()
                        )
        );

        return nearbyComplaints;
    }

    // =====================================================
    // GET SINGLE COMPLAINT
    // =====================================================

    @GetMapping("/{id}")
    public Complaint getComplaint(@PathVariable Long id) {

        return complaintService.get(id);
    }

    // =====================================================
    // STATUS TRANSITIONS
    // PENDING -> VERIFIED -> ASSIGNED -> IN_PROGRESS
    //         -> COMPLETED -> RESOLVED
    // =====================================================

    @PutMapping("/{id}/verify")
    public Complaint verifyComplaint(@PathVariable Long id, Principal principal) {

        requireOfficer(principal);
        return complaintService.verify(id);
    }

    @PutMapping("/{complaintId}/assign/{contractorId}")
    public Complaint assignContractor(
            @PathVariable Long complaintId,
            @PathVariable Long contractorId, Principal principal) {

        requireOfficer(principal);
        return complaintService.assign(complaintId, contractorId);
    }

    @PutMapping("/{id}/start")
    public Complaint startComplaint(
            @PathVariable Long id,
            Principal principal) {

        return complaintService.start(id, currentUser(principal));
    }

    @PutMapping("/{id}/complete")
    public Complaint completeComplaint(
            @PathVariable Long id,
            Principal principal) {

        return complaintService.complete(id, currentUser(principal));
    }

    @PutMapping("/{id}/resolve")
    public Complaint resolveComplaint(@PathVariable Long id, Principal principal) {

        requireOfficer(principal);
        return complaintService.resolve(id);
    }

    // Officer rejects the completed work -> back to IN_PROGRESS
    @PutMapping("/{id}/reopen")
    public Complaint reopenComplaint(@PathVariable Long id, Principal principal) {

        requireOfficer(principal);
        return complaintService.reopen(id);
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private static final Comparator<Complaint> BY_SEVERITY =
            Comparator.comparingInt(ComplaintController::priorityRank)
                    .thenComparing(c -> c.getSeverityScore() == null ? -1.0 : c.getSeverityScore())
                    .reversed()
                    .thenComparing(Complaint::getId, Comparator.reverseOrder());

    private static int priorityRank(Complaint complaint) {
        return List.of("UNASSESSED", "LOW", "MEDIUM", "HIGH", "CRITICAL")
                .indexOf(complaint.getPriority() == null ? "UNASSESSED" : complaint.getPriority());
    }

    private User requireOfficer(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in as an officer");
        }
        User user = currentUser(principal);
        if (user.getRole() != Role.OFFICER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Officer access is required");
        }
        return user;
    }

    private User currentUser(Principal principal) {

        if (principal == null) {
            throw new RuntimeException("Please sign in again");
        }

        return userRepository
                .findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void addLikeInformation(List<Complaint> complaints, User currentUser) {

        if (complaints == null || complaints.isEmpty()) {
            return;
        }

        List<Long> complaintIds = complaints.stream().map(Complaint::getId).toList();

        Map<Long, Long> likeCounts = new HashMap<>();
        for (Object[] row : likeRepository.countLikesForComplaints(complaintIds)) {
            likeCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }

        Set<Long> likedIds = new HashSet<>(
                likeRepository.findLikedComplaintIds(currentUser.getId(), complaintIds));

        for (Complaint complaint : complaints) {
            complaint.setLikeCount(likeCounts.getOrDefault(complaint.getId(), 0L));
            complaint.setLiked(likedIds.contains(complaint.getId()));
        }
    }

    // =====================================================
    // UPLOAD / SAVE CONTRACTOR WORK PHOTOS
    //
    // POST
    // /api/complaints/{complaintId}/work-photos
    // =====================================================

    @PostMapping(
            "/{complaintId}/work-photos"
    )
    public ResponseEntity<?> saveWorkPhotos(
            @PathVariable Long complaintId,
            @RequestBody
            Map<String, List<String>> request,
            Principal principal) {

        // =============================================
        // GET COMPLAINT
        // =============================================

        Complaint complaint =
                complaintRepository
                        .findById(complaintId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Complaint not found"
                                ));

        // =============================================
        // GET LOGGED-IN CONTRACTOR
        // =============================================

        String email =
                principal.getName();

        User contractor =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Contractor not found"
                                ));

        // =============================================
        // CHECK ASSIGNMENT
        // =============================================

        if (complaint.getContractor() == null ||
                !complaint
                        .getContractor()
                        .getId()
                        .equals(
                                contractor.getId()
                        )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Complaint is not assigned to you"
                    );
        }

        // =============================================
        // MUST BE IN PROGRESS
        // =============================================

        if (!"IN_PROGRESS".equals(
                complaint.getStatus())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Work photos can only be uploaded when work is in progress"
                    );
        }

        // =============================================
        // GET PHOTO URLS
        // =============================================

        List<String> photoUrls =
                request.get(
                        "photoUrls"
                );

        if (photoUrls == null ||
                photoUrls.isEmpty()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "No photos provided"
                    );
        }

        // =============================================
        // SAVE EACH PHOTO
        // =============================================

        for (String photoUrl : photoUrls) {

            if (photoUrl == null ||
                    photoUrl.isBlank()) {

                continue;
            }

            WorkPhoto workPhoto =
                    new WorkPhoto();

            workPhoto.setPhotoUrl(
                    photoUrl
            );

            workPhoto.setUploadedAt(
                    LocalDateTime.now()
            );

            workPhoto.setComplaint(
                    complaint
            );

            workPhoto.setContractor(
                    contractor
            );

            workPhotoRepository.save(
                    workPhoto
            );
        }

        // =============================================
        // RETURN ALL PHOTOS FOR COMPLAINT
        // =============================================

        return ResponseEntity.ok(
                workPhotoRepository
                        .findByComplaintId(
                                complaintId
                        )
        );
    }

    // =====================================================
    // GET CONTRACTOR WORK PHOTOS
    //
    // GET
    // /api/complaints/{complaintId}/work-photos
    // =====================================================

    @GetMapping(
            "/{complaintId}/work-photos"
    )
    public ResponseEntity<?> getWorkPhotos(
            @PathVariable Long complaintId) {

        // Make sure complaint exists
        if (!complaintRepository
                .existsById(complaintId)) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        List<WorkPhoto> photos =
                workPhotoRepository
                        .findByComplaintId(
                                complaintId
                        );

        return ResponseEntity.ok(
                photos
        );
    }

    // =====================================================
    // HAVERSINE DISTANCE CALCULATION
    // =====================================================

    private double calculateDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        final double EARTH_RADIUS_KM =
                6371.0;

        double latDistance =
                Math.toRadians(
                        lat2 - lat1
                );

        double lonDistance =
                Math.toRadians(
                        lon2 - lon1
                );

        double a =
                Math.sin(
                        latDistance / 2
                )
                        *
                        Math.sin(
                                latDistance / 2
                        )

                        +

                        Math.cos(
                                Math.toRadians(lat1)
                        )
                                *
                                Math.cos(
                                        Math.toRadians(lat2)
                                )
                                *
                                Math.sin(
                                        lonDistance / 2
                                )
                                *
                                Math.sin(
                                        lonDistance / 2
                                );

        double c =
                2
                        *
                        Math.atan2(
                                Math.sqrt(a),
                                Math.sqrt(
                                        1 - a
                                )
                        );

        return EARTH_RADIUS_KM * c;
    }
}
