package com.example.civic_sense.config;

import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds hardcoded OFFICER and CONTRACTOR accounts on every start-up.
 * Accounts are created only if the email does not already exist,
 * so it is safe to restart the server repeatedly.
 *
 * Credentials (also documented in README.md):
 *
 *   Officer  :  officer@civicpulse.in  /  Officer@123
 *   Contractor:  contractor@civicpulse.in  /  Contractor@123
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedUser("City Officer",      "officer@civicpulse.in",    "Officer@123",    Role.OFFICER);
        seedUser("City Contractor",   "contractor@civicpulse.in", "Contractor@123", Role.CONTRACTOR);
    }

    private void seedUser(String name, String email, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            return; // already seeded — skip
        }
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        userRepository.save(user);
        System.out.printf("[DataSeeder] Created %s account: %s%n", role, email);
    }
}
