package com.example.civic_sense.service;

import com.example.civic_sense.dto.LoginRequest;
import com.example.civic_sense.dto.RegisterRequest;
import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.UserRepository;
import com.example.civic_sense.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public Map<String, Object> register(
            RegisterRequest request
    ) {
        if (request.getRole() == Role.OFFICER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Officer accounts must be provisioned by an administrator");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException(
                    "Email already registered"
            );
        }

        String phone = normalizePhone(request.getPhone());

        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new RuntimeException(
                    "Phone number already registered"
            );
        }

        User user = new User();

        user.setPhone(phone);
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // Hash password
        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        user.setRole(request.getRole() == null ? Role.CITIZEN : request.getRole());

        User savedUser =
                userRepository.save(user);

        Map<String, Object> response =
                new HashMap<>();

        response.put("message", "Registration successful");
        response.put("userId", savedUser.getId());
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole());

        return response;
    }

    public Map<String, Object> login(
            LoginRequest request
    ) {

        // The login field accepts either an email address
        // or a phone number.
        String identifier = request.getEmail() == null
                ? ""
                : request.getEmail().trim();

        User user = (identifier.contains("@")
                ? userRepository.findByEmail(identifier)
                : userRepository.findByPhone(normalizePhone(identifier))
                        .or(() -> userRepository.findByEmail(identifier)))
                .orElseThrow(() ->
                        new RuntimeException(
                                "No account found for this email / phone"
                        )
                );

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        )) {

            throw new RuntimeException(
                    "Invalid password"
            );
        }

        String token =
                jwtService.generateToken(
                        user.getEmail(),
                        user.getRole().name()
                );

        Map<String, Object> response =
                new HashMap<>();

        response.put("message", "Login successful");
        response.put("token", token);
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("phone", user.getPhone());

        return response;
    }

    // Keep digits and a leading "+" so "+880 1711-000000"
    // and "+8801711000000" are treated as the same number.
    static String normalizePhone(String phone) {

        if (phone == null || phone.isBlank()) {
            return null;
        }

        String trimmed = phone.trim();

        String digits = trimmed.replaceAll("[^0-9]", "");

        if (digits.isEmpty()) {
            return null;
        }

        return trimmed.startsWith("+") ? "+" + digits : digits;
    }
}
