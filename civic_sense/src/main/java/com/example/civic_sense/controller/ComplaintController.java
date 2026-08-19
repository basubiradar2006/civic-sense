package com.example.civic_sense.controller;

import com.example.civic_sense.dto.NearbyComplaintResponse;
import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.LikeRepository;
import com.example.civic_sense.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

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

    public ComplaintController(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            LikeRepository likeRepository) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
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
                        new RuntimeException("User not found"));

        complaint.setUser(user);

        // Every new complaint starts as PENDING
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
    public List<Complaint> getComplaints() {

        return complaintRepository.findAll();
    }


    // =====================================================
    // GET MY COMPLAINTS
    // =====================================================

    @GetMapping("/my")
    public List<Complaint> getMyComplaints(
            Principal principal) {

        String email = principal.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        return complaintRepository.findByUser(user);
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
                                "Contractor not found"));

        return complaintRepository
                .findByContractor(contractor);
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
                                "Complaint not found"));
    }


    // =====================================================
    // VERIFY COMPLAINT
    // PENDING → VERIFIED
    // =====================================================

    @PutMapping("/{id}/verify")
    public Complaint verifyComplaint(
            @PathVariable Long id) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"));

        if (!"PENDING".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only PENDING complaints can be verified");
        }

        complaint.setStatus("VERIFIED");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // ASSIGN CONTRACTOR
    // VERIFIED → ASSIGNED
    // =====================================================

    @PutMapping("/{complaintId}/assign/{contractorId}")
    public Complaint assignContractor(
            @PathVariable Long complaintId,
            @PathVariable Long contractorId) {

        Complaint complaint = complaintRepository
                .findById(complaintId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"));

        User contractor = userRepository
                .findById(contractorId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Contractor not found"));

        // Make sure selected user is actually contractor
        if (contractor.getRole() != Role.CONTRACTOR) {

            throw new RuntimeException(
                    "Selected user is not a contractor");
        }

        // Only VERIFIED complaints can be assigned
        if (!"VERIFIED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only VERIFIED complaints can be assigned");
        }

        complaint.setContractor(contractor);

        complaint.setStatus("ASSIGNED");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // START WORK
    // ASSIGNED → IN_PROGRESS
    // =====================================================

    @PutMapping("/{id}/start")
    public Complaint startComplaint(
            @PathVariable Long id,
            Principal principal) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"));

        String email = principal.getName();

        User contractor = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Contractor not found"));

        // Check contractor assignment
        if (complaint.getContractor() == null ||
                !complaint.getContractor()
                        .getId()
                        .equals(contractor.getId())) {

            throw new RuntimeException(
                    "This complaint is not assigned to you");
        }

        // Only ASSIGNED complaints can be started
        if (!"ASSIGNED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only ASSIGNED complaints can be started");
        }

        complaint.setStatus("IN_PROGRESS");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // COMPLETE WORK
    // IN_PROGRESS → COMPLETED
    // =====================================================

    @PutMapping("/{id}/complete")
    public Complaint completeComplaint(
            @PathVariable Long id,
            Principal principal) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"));

        String email = principal.getName();

        User contractor = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Contractor not found"));

        // Check contractor assignment
        if (complaint.getContractor() == null ||
                !complaint.getContractor()
                        .getId()
                        .equals(contractor.getId())) {

            throw new RuntimeException(
                    "This complaint is not assigned to you");
        }

        // Only IN_PROGRESS can be completed
        if (!"IN_PROGRESS".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only IN_PROGRESS complaints can be completed");
        }

        complaint.setStatus("COMPLETED");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // RESOLVE COMPLAINT
    // COMPLETED → RESOLVED
    // =====================================================

    @PutMapping("/{id}/resolve")
    public Complaint resolveComplaint(
            @PathVariable Long id) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found"));

        // Only COMPLETED complaints can be resolved
        if (!"COMPLETED".equals(
                complaint.getStatus())) {

            throw new RuntimeException(
                    "Only COMPLETED complaints can be resolved");
        }

        complaint.setStatus("RESOLVED");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // GET NEARBY COMPLAINTS
    // =====================================================
    //
    // Example:
    //
    // GET /api/complaints/nearby
    // ?latitude=12.9786
    // &longitude=77.364
    // &radius=5
    //
    // radius = kilometers
    //
    // =====================================================

    @GetMapping("/nearby")
    public List<NearbyComplaintResponse> getNearbyComplaints(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5") double radius,
            Principal principal) {

        // -------------------------------------------------
        // Get current logged-in user
        // -------------------------------------------------

        User currentUser = null;

        if (principal != null) {

            String email = principal.getName();

            currentUser = userRepository
                    .findByEmail(email)
                    .orElse(null);
        }


        // -------------------------------------------------
        // Get all complaints
        // -------------------------------------------------

        List<Complaint> allComplaints =
                complaintRepository.findAll();


        // -------------------------------------------------
        // Store nearby complaints
        // -------------------------------------------------

        List<NearbyComplaintResponse> nearbyComplaints =
                new ArrayList<>();


        // -------------------------------------------------
        // Check every complaint
        // -------------------------------------------------

        for (Complaint complaint : allComplaints) {

            // Skip complaints without location
            if (complaint.getLatitude() == null ||
                    complaint.getLongitude() == null) {

                continue;
            }


            // -------------------------------------------------
            // Calculate distance
            // -------------------------------------------------

            double distance = calculateDistance(
                    latitude,
                    longitude,
                    complaint.getLatitude(),
                    complaint.getLongitude()
            );


            // -------------------------------------------------
            // Check radius
            // -------------------------------------------------

            if (distance <= radius) {


                // -------------------------------------------------
                // Get like count
                // -------------------------------------------------

                long likeCount =
                        likeRepository.countByComplaint(
                                complaint
                        );


                // -------------------------------------------------
                // Check if current user liked it
                // -------------------------------------------------

                boolean liked = false;

                if (currentUser != null) {

                    liked =
                            likeRepository
                                    .existsByUserAndComplaint(
                                            currentUser,
                                            complaint
                                    );
                }


                // -------------------------------------------------
                // Create DTO
                // -------------------------------------------------

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


        // -------------------------------------------------
        // Sort nearest complaints first
        // -------------------------------------------------

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
    // HAVERSINE DISTANCE CALCULATION
    // =====================================================

    private double calculateDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        final double EARTH_RADIUS_KM = 6371.0;


        double latDistance =
                Math.toRadians(lat2 - lat1);

        double lonDistance =
                Math.toRadians(lon2 - lon1);


        double a =
                Math.sin(latDistance / 2)
                        * Math.sin(latDistance / 2)

                        +

                        Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))

                                * Math.sin(lonDistance / 2)
                                * Math.sin(lonDistance / 2);


        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );


        return EARTH_RADIUS_KM * c;
    }
}