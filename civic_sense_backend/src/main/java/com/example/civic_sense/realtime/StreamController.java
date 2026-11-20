package com.example.civic_sense.realtime;

import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.UserRepository;
import com.example.civic_sense.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.servlet.http.HttpServletResponse;

/**
 * GET /api/stream?token=JWT
 *
 * Browsers' EventSource cannot send an Authorization header,
 * so the JWT is passed as a query parameter for this endpoint only.
 */
@RestController
@RequestMapping("/api/stream")
public class StreamController {

    private final RealtimeService realtimeService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public StreamController(
            RealtimeService realtimeService,
            JwtService jwtService,
            UserRepository userRepository) {

        this.realtimeService = realtimeService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @GetMapping(produces = "text/event-stream")
    public SseEmitter stream(
            @RequestParam("token") String token,
            HttpServletResponse response) {

        if (token == null || token.isBlank() || !jwtService.isTokenValid(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }

        User user = userRepository
                .findByEmail(jwtService.extractEmail(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // Stop reverse proxies from buffering the stream
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        return realtimeService.subscribe(user);
    }
}
