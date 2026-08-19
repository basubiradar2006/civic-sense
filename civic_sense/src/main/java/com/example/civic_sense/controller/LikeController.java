package com.example.civic_sense.controller;

import com.example.civic_sense.entity.Complaint;
import com.example.civic_sense.entity.Like;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.ComplaintRepository;
import com.example.civic_sense.repository.LikeRepository;
import com.example.civic_sense.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin
public class LikeController {

    private final LikeRepository likeRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public LikeController(
            LikeRepository likeRepository,
            ComplaintRepository complaintRepository,
            UserRepository userRepository
    ) {
        this.likeRepository = likeRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }


    // =========================================================
    // LIKE COMPLAINT
    // POST /api/complaints/{complaintId}/like
    // =========================================================

    @PostMapping("/{complaintId}/like")
    public ResponseEntity<?> likeComplaint(
            @PathVariable Long complaintId,
            Principal principal
    ) {

        try {

            // -----------------------------------------
            // Check logged-in user
            // -----------------------------------------

            if (principal == null) {
                return ResponseEntity.status(401)
                        .body("User not authenticated");
            }

            String username = principal.getName();


            // -----------------------------------------
            // Find user
            // -----------------------------------------

            User user = userRepository
                    .findByEmail(username)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(404)
                        .body("User not found");
            }


            // -----------------------------------------
            // Find complaint
            // -----------------------------------------

            Complaint complaint = complaintRepository
                    .findById(complaintId)
                    .orElse(null);

            if (complaint == null) {
                return ResponseEntity.status(404)
                        .body("Complaint not found");
            }


            // -----------------------------------------
            // Check if already liked
            // -----------------------------------------

            boolean alreadyLiked =
                    likeRepository.existsByUserAndComplaint(
                            user,
                            complaint
                    );

            if (alreadyLiked) {

                long likeCount =
                        likeRepository.countByComplaint(complaint);

                Map<String, Object> response =
                        new HashMap<>();

                response.put("message", "Already liked");
                response.put("liked", true);
                response.put("likeCount", likeCount);

                return ResponseEntity.ok(response);
            }


            // -----------------------------------------
            // Create Like
            // -----------------------------------------

            Like like = new Like();

            like.setUser(user);
            like.setComplaint(complaint);

            likeRepository.save(like);


            // -----------------------------------------
            // Get updated count
            // -----------------------------------------

            long likeCount =
                    likeRepository.countByComplaint(complaint);


            // -----------------------------------------
            // Response
            // -----------------------------------------

            Map<String, Object> response =
                    new HashMap<>();

            response.put("message", "Complaint liked");
            response.put("liked", true);
            response.put("likeCount", likeCount);

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Failed to like complaint");
        }
    }


    // =========================================================
    // UNLIKE COMPLAINT
    // DELETE /api/complaints/{complaintId}/like
    // =========================================================

    @DeleteMapping("/{complaintId}/like")
    public ResponseEntity<?> unlikeComplaint(
            @PathVariable Long complaintId,
            Principal principal
    ) {

        try {

            // -----------------------------------------
            // Check authentication
            // -----------------------------------------

            if (principal == null) {
                return ResponseEntity.status(401)
                        .body("User not authenticated");
            }

            String username = principal.getName();


            // -----------------------------------------
            // Find user
            // -----------------------------------------

            User user = userRepository
                    .findByEmail(username)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(404)
                        .body("User not found");
            }


            // -----------------------------------------
            // Find complaint
            // -----------------------------------------

            Complaint complaint =
                    complaintRepository
                            .findById(complaintId)
                            .orElse(null);

            if (complaint == null) {
                return ResponseEntity.status(404)
                        .body("Complaint not found");
            }


            // -----------------------------------------
            // Check whether like exists
            // -----------------------------------------

            boolean alreadyLiked =
                    likeRepository.existsByUserAndComplaint(
                            user,
                            complaint
                    );

            if (!alreadyLiked) {

                long likeCount =
                        likeRepository.countByComplaint(complaint);

                Map<String, Object> response =
                        new HashMap<>();

                response.put("message", "Complaint was not liked");
                response.put("liked", false);
                response.put("likeCount", likeCount);

                return ResponseEntity.ok(response);
            }


            // -----------------------------------------
            // Delete like
            // -----------------------------------------

            likeRepository.deleteByUserAndComplaint(
                    user,
                    complaint
            );


            // -----------------------------------------
            // Get updated count
            // -----------------------------------------

            long likeCount =
                    likeRepository.countByComplaint(complaint);


            // -----------------------------------------
            // Response
            // -----------------------------------------

            Map<String, Object> response =
                    new HashMap<>();

            response.put("message", "Complaint unliked");
            response.put("liked", false);
            response.put("likeCount", likeCount);

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Failed to unlike complaint");
        }
    }


    // =========================================================
    // GET LIKE INFORMATION
    // GET /api/complaints/{complaintId}/likes
    // =========================================================

    @GetMapping("/{complaintId}/likes")
    public ResponseEntity<?> getLikeInfo(
            @PathVariable Long complaintId,
            Principal principal
    ) {

        try {

            // -----------------------------------------
            // Find complaint
            // -----------------------------------------

            Complaint complaint =
                    complaintRepository
                            .findById(complaintId)
                            .orElse(null);

            if (complaint == null) {
                return ResponseEntity.status(404)
                        .body("Complaint not found");
            }


            // -----------------------------------------
            // Get total likes
            // -----------------------------------------

            long likeCount =
                    likeRepository.countByComplaint(complaint);


            // -----------------------------------------
            // Check current user's like
            // -----------------------------------------

            boolean liked = false;

            if (principal != null) {

                String username = principal.getName();

                User user = userRepository
                        .findByEmail(username)
                        .orElse(null);

                if (user != null) {

                    liked =
                            likeRepository.existsByUserAndComplaint(
                                    user,
                                    complaint
                            );
                }
            }


            // -----------------------------------------
            // Response
            // -----------------------------------------

            Map<String, Object> response =
                    new HashMap<>();

            response.put("likeCount", likeCount);
            response.put("liked", liked);

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Failed to get like information");
        }
    }
}