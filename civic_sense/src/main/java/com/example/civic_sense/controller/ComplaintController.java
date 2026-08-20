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

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://10.208.91.107:5173",
        "https://civic-sense-1-zc52.onrender.com"
})
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final WorkPhotoRepository workPhotoRepository;

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public ComplaintController(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            LikeRepository likeRepository,
            WorkPhotoRepository workPhotoRepository) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.workPhotoRepository = workPhotoRepository;
    }


    // =====================================================
    // CREATE COMPLAINT
    // =====================================================

    @PostMapping
    public Complaint createComplaint(
            @RequestBody Complaint complaint,
            Principal principal) {

        String email = principal.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found"
                        ));

        // Citizen who created complaint
        complaint.setUser(user);

        // Every new complaint starts pending
        complaint.setStatus("PENDING");

        // Default priority
        if (complaint.getPriority() == null ||
                complaint.getPriority().isBlank()) {

            complaint.setPriority("MEDIUM");
        }

        // No contractor initially
        complaint.setContractor(null);

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // GET ALL COMPLAINTS
    // =====================================================

    @GetMapping
    public List<Complaint> getComplaints(
            Principal principal) {

        List<Complaint> complaints =
                complaintRepository.findAll();

        String email = principal.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        addLikeInformation(
                complaints,
                user
        );

        return complaints;
    }


    // =====================================================
    // GET MY COMPLAINTS
    // Logged-in citizen complaints
    // =====================================================

    @GetMapping("/my")
    public List<Complaint> getMyComplaints(
            Principal principal) {

        String email = principal.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found"
                        ));

        List<Complaint> complaints =
                complaintRepository.findByUser(user);

        // Add like count + current user's like status
        addLikeInformation(
                complaints,
                user
        );

        return complaints;
    }


    // =====================================================
    // GET CONTRACTOR ASSIGNED COMPLAINTS
    // =====================================================

    @GetMapping("/assigned")
    public List<Complaint> getAssignedComplaints(
            Principal principal) {

        String email = principal.getName();

        User contractor = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Contractor not found"
                        ));

        return complaintRepository
                .findByContractor(contractor);
    }


    // =====================================================
    // GET RECENT COMPLAINTS
    // =====================================================

    @GetMapping("/recent")
    public List<Complaint> getRecentComplaints(
            Principal principal) {

        List<Complaint> complaints =
                complaintRepository
                        .findTop10ByOrderByIdDesc();

        String email = principal.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found"
                        ));

        // Add like count + current user's like status
        addLikeInformation(
                complaints,
                user
        );

        return complaints;
    }


    // =====================================================
    // ADD LIKE INFORMATION TO COMPLAINTS
    // =====================================================

    private void addLikeInformation(
            List<Complaint> complaints,
            User currentUser) {

        if (complaints == null ||
                complaints.isEmpty()) {

            return;
        }

        // =============================================
        // GET COMPLAINT IDs
        // =============================================

        List<Long> complaintIds =
                complaints.stream()
                        .map(Complaint::getId)
                        .toList();

        // =============================================
        // GET LIKE COUNTS
        // ONE DATABASE QUERY
        // =============================================

        List<Object[]> countResults =
                likeRepository.countLikesForComplaints(
                        complaintIds
                );

        Map<Long, Long> likeCounts =
                new HashMap<>();

        for (Object[] row : countResults) {

            Long complaintId =
                    ((Number) row[0]).longValue();

            Long count =
                    ((Number) row[1]).longValue();

            likeCounts.put(
                    complaintId,
                    count
            );
        }

        // =============================================
        // GET COMPLAINTS LIKED BY CURRENT USER
        // ONE DATABASE QUERY
        // =============================================

        List<Long> likedComplaintIds =
                likeRepository.findLikedComplaintIds(
                        currentUser.getId(),
                        complaintIds
                );

        Set<Long> likedIds =
                new HashSet<>(
                        likedComplaintIds
                );

        // =============================================
        // SET LIKE INFORMATION
        // =============================================

        for (Complaint complaint : complaints) {

            long count =
                    likeCounts.getOrDefault(
                            complaint.getId(),
                            0L
                    );

            complaint.setLikeCount(count);

            complaint.setLiked(
                    likedIds.contains(
                            complaint.getId()
                    )
            );
        }
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

            // Skip complaints without GPS
            if (complaint.getLatitude() == null ||
                    complaint.getLongitude() == null) {

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
    public Complaint getComplaint(
            @PathVariable Long id) {

        return complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"
                        ));
    }


    // =====================================================
    // VERIFY COMPLAINT
    // PENDING -> VERIFIED
    // =====================================================

    @PutMapping("/{id}/verify")
    public Complaint verifyComplaint(
            @PathVariable Long id) {

        Complaint complaint =
                complaintRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Complaint not found"
                                ));

        if (!"PENDING".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only PENDING complaints can be verified"
            );
        }

        complaint.setStatus("VERIFIED");

        return complaintRepository.save(
                complaint
        );
    }


    // =====================================================
    // ASSIGN CONTRACTOR
    // VERIFIED -> ASSIGNED
    // =====================================================

    @PutMapping("/{complaintId}/assign/{contractorId}")
    public Complaint assignContractor(
            @PathVariable Long complaintId,
            @PathVariable Long contractorId) {

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
        // GET CONTRACTOR
        // =============================================

        User contractor =
                userRepository
                        .findById(contractorId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Contractor not found"
                                ));

        // =============================================
        // VERIFY USER ROLE
        // =============================================

        if (contractor.getRole() !=
                Role.CONTRACTOR) {

            throw new RuntimeException(
                    "Selected user is not a contractor"
            );
        }

        // =============================================
        // COMPLAINT MUST BE VERIFIED
        // =============================================

        if (!"VERIFIED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only VERIFIED complaints can be assigned"
            );
        }

        complaint.setContractor(
                contractor
        );

        complaint.setStatus(
                "ASSIGNED"
        );

        return complaintRepository.save(
                complaint
        );
    }


    // =====================================================
    // START WORK
    // ASSIGNED -> IN_PROGRESS
    // =====================================================

    @PutMapping("/{id}/start")
    public Complaint startComplaint(
            @PathVariable Long id,
            Principal principal) {

        // =============================================
        // GET COMPLAINT
        // =============================================

        Complaint complaint =
                complaintRepository
                        .findById(id)
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

            throw new RuntimeException(
                    "This complaint is not assigned to you"
            );
        }

        // =============================================
        // CHECK STATUS
        // =============================================

        if (!"ASSIGNED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only ASSIGNED complaints can be started"
            );
        }

        complaint.setStatus(
                "IN_PROGRESS"
        );

        return complaintRepository.save(
                complaint
        );
    }


    // =====================================================
    // COMPLETE WORK
    // IN_PROGRESS -> COMPLETED
    // =====================================================

    @PutMapping("/{id}/complete")
    public Complaint completeComplaint(
            @PathVariable Long id,
            Principal principal) {

        // =============================================
        // GET COMPLAINT
        // =============================================

        Complaint complaint =
                complaintRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Complaint not found"
                                ));

        // =============================================
        // GET CONTRACTOR
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

            throw new RuntimeException(
                    "This complaint is not assigned to you"
            );
        }

        // =============================================
        // CHECK STATUS
        // =============================================

        if (!"IN_PROGRESS".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only IN_PROGRESS complaints can be completed"
            );
        }

        complaint.setStatus(
                "COMPLETED"
        );

        return complaintRepository.save(
                complaint
        );
    }


    // =====================================================
    // RESOLVE COMPLAINT
    // COMPLETED -> RESOLVED
    // =====================================================

    @PutMapping("/{id}/resolve")
    public Complaint resolveComplaint(
            @PathVariable Long id) {

        Complaint complaint =
                complaintRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Complaint not found"
                                ));

        if (!"COMPLETED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only COMPLETED complaints can be resolved"
            );
        }

        complaint.setStatus(
                "RESOLVED"
        );

        return complaintRepository.save(
                complaint
        );
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