package com.example.civic_sense.controller;

import com.example.civic_sense.entity.Role;
import com.example.civic_sense.entity.User;
import com.example.civic_sense.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://10.208.91.107:5173",
        "https://civic-sense-1-zc52.onrender.com"
})
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/contractors")
    public List<User> getContractors() {

        return userRepository.findByRole(
                Role.CONTRACTOR
        );
    }
}