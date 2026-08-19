package com.example.civic_sense.controller;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://10.208.91.107:5173",
        "https://civic-sense-1-zc52.onrender.com"
})
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public ComplaintController(
            ComplaintRepository complaintRepository,
            UserRepository userRepository) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }


    // =====================================================
    // CREATE COMPLAINT
    // =====================================================

    @PostMapping
    public Complaint createComplaint(
            @RequestBody Complaint complaint,
            Principal principal) {

        // Get logged-in user's email from JWT
        String email = principal.getName();

        // Find logged-in user
        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Attach logged-in user to complaint
        complaint.setUser(user);

        // Every new complaint MUST start as PENDING
        complaint.setStatus("PENDING");

        // Default priority
        if (complaint.getPriority() == null ||
                complaint.getPriority().isBlank()) {

            complaint.setPriority("MEDIUM");
        }

        // Save complaint
        return complaintRepository.save(complaint);
    }


    // =====================================================
    // GET ALL PUBLIC COMPLAINTS
    // =====================================================
    // Citizens can use this to see complaints in their
    // area. Later we can filter by GPS distance.

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

        // Get logged-in user's email
        String email = principal.getName();

        // Find user
        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Return only this user's complaints
        return complaintRepository.findByUser(user);
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
                        new RuntimeException("Complaint not found"));
    }


    // =====================================================
    // ACCEPT COMPLAINT
    // =====================================================
    // PENDING → ACCEPTED

    @PutMapping("/{id}/accept")
    public Complaint acceptComplaint(
            @PathVariable Long id) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Complaint not found"));

        // Only PENDING complaints can be accepted
        if (!"PENDING".equals(complaint.getStatus())) {

            throw new RuntimeException(
                    "Only PENDING complaints can be accepted"
            );
        }

        complaint.setStatus("ACCEPTED");

        return complaintRepository.save(complaint);
    }


    // =====================================================
    // SOLVE COMPLAINT
    // =====================================================
    // ACCEPTED → SOLVED

    @PutMapping("/{id}/solve")
    public Complaint solveComplaint(
            @PathVariable Long id) {

        Complaint complaint = complaintRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Complaint not found"));

        // Only ACCEPTED complaints can be solved
        if (!"ACCEPTED".equals(complaint.getStatus())) {

            throw new RuntimeException(
                    "Only ACCEPTED complaints can be solved"
            );
        }

        complaint.setStatus("SOLVED");

        return complaintRepository.save(complaint);
    }
}